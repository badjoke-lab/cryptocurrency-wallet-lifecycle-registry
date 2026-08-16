import crypto from 'node:crypto'

export const OUTCOME_CATEGORIES = new Set([
  'ok',
  'redirected',
  'not_found',
  'gone',
  'rate_limited',
  'client_error',
  'server_error',
  'network_error',
  'timeout',
  'invalid_target',
])

const sha = (value) => crypto.createHash('sha256').update(value).digest('hex')

export function classifyVerification(record, recordKind, now, policy) {
  const value = record.last_verified_at
  const base = {
    record_kind: recordKind,
    id: record.id,
    entity_id: recordKind === 'product' ? record.entity_id : record.id,
    slug: record.slug,
    name: recordKind === 'product' ? record.product_name : record.canonical_name,
    last_verified_at: value ?? null,
  }

  if (!value) {
    return { ...base, state: 'verification_date_missing', age_days: null, reason: 'canonical last_verified_at is missing' }
  }

  const verifiedAt = new Date(`${value}T00:00:00Z`)
  const nowDate = new Date(now)
  if (Number.isNaN(verifiedAt.getTime()) || Number.isNaN(nowDate.getTime())) {
    return { ...base, state: 'verification_date_invalid', age_days: null, reason: 'canonical last_verified_at is invalid' }
  }

  const ageDays = Math.max(0, Math.floor((nowDate.getTime() - verifiedAt.getTime()) / 86_400_000))
  const { review_due_days: dueDays, review_overdue_days: overdueDays } = policy.reverification
  if (ageDays >= overdueDays) {
    return { ...base, state: 'review_overdue', age_days: ageDays, reason: `last verification is at least ${overdueDays} days old` }
  }
  if (ageDays >= dueDays) {
    return { ...base, state: 'review_due', age_days: ageDays, reason: `last verification is at least ${dueDays} days old` }
  }
  return { ...base, state: 'current', age_days: ageDays, reason: `last verification is under ${dueDays} days old` }
}

export function buildReverificationQueue(entities, products, now, policy) {
  const rows = [
    ...entities.map((record) => classifyVerification(record, 'entity', now, policy)),
    ...products.map((record) => classifyVerification(record, 'product', now, policy)),
  ]
  rows.sort((a, b) => `${a.record_kind}:${a.id}`.localeCompare(`${b.record_kind}:${b.id}`))
  return rows
}

export function collectTargets(entities, products, policy) {
  const acceptedSchemes = new Set(policy.network.accepted_schemes)
  const candidates = []
  const invalid_targets = []

  const addRecord = (record, recordKind) => {
    const fields = policy.target_fields[recordKind] ?? []
    for (const field of fields) {
      const raw = record[field]
      if (typeof raw !== 'string' || raw.trim() === '') continue
      const recordKey = `${recordKind}:${record.id}:${field}`
      try {
        const parsed = new URL(raw)
        if (!acceptedSchemes.has(parsed.protocol)) {
          invalid_targets.push({
            target_id: `invalid_${sha(`${recordKey}|${raw}`).slice(0, 20)}`,
            record_key: recordKey,
            record_kind: recordKind,
            id: record.id,
            entity_id: recordKind === 'product' ? record.entity_id : record.id,
            slug: record.slug,
            field,
            requested_url: raw,
            reason: `unsupported URL scheme: ${parsed.protocol}`,
          })
          continue
        }
        const normalized = parsed.href
        candidates.push({
          target_id: `url_${sha(`${recordKey}|${normalized}`).slice(0, 20)}`,
          record_key: recordKey,
          record_kind: recordKind,
          id: record.id,
          entity_id: recordKind === 'product' ? record.entity_id : record.id,
          slug: record.slug,
          name: recordKind === 'product' ? record.product_name : record.canonical_name,
          field,
          requested_url: normalized,
          host: parsed.host,
        })
      } catch {
        invalid_targets.push({
          target_id: `invalid_${sha(`${recordKey}|${raw}`).slice(0, 20)}`,
          record_key: recordKey,
          record_kind: recordKind,
          id: record.id,
          entity_id: recordKind === 'product' ? record.entity_id : record.id,
          slug: record.slug,
          field,
          requested_url: raw,
          reason: 'malformed URL',
        })
      }
    }
  }

  entities.forEach((record) => addRecord(record, 'entity'))
  products.forEach((record) => addRecord(record, 'product'))

  candidates.sort((a, b) => a.record_key.localeCompare(b.record_key) || a.requested_url.localeCompare(b.requested_url))
  invalid_targets.sort((a, b) => a.record_key.localeCompare(b.record_key))

  const deduped = []
  const seen = new Set()
  for (const target of candidates) {
    if (seen.has(target.target_id)) continue
    seen.add(target.target_id)
    deduped.push(target)
  }

  const maxTargets = policy.network.max_targets_per_run
  return {
    targets: deduped.slice(0, maxTargets),
    invalid_targets,
    truncated_targets: deduped.slice(maxTargets),
    total_valid_targets: deduped.length,
  }
}

export function outcomeForStatus(status, redirectCount = 0) {
  if (status >= 200 && status < 300) return redirectCount > 0 ? 'redirected' : 'ok'
  if (status === 404) return 'not_found'
  if (status === 410) return 'gone'
  if (status === 429) return 'rate_limited'
  if (status >= 400 && status < 500) return 'client_error'
  if (status >= 500 && status < 600) return 'server_error'
  return redirectCount > 0 ? 'redirected' : 'client_error'
}

export async function observeTarget(target, policy, observedAt = new Date().toISOString()) {
  let currentUrl = target.requested_url
  let redirectCount = 0
  const maxRedirects = policy.network.max_redirects

  try {
    for (;;) {
      const response = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(policy.network.timeout_ms),
        headers: { 'user-agent': policy.network.user_agent, accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1' },
      })

      const status = response.status
      const location = response.headers.get('location')
      if (response.body) await response.body.cancel().catch(() => {})

      if (status >= 300 && status < 400 && location && redirectCount < maxRedirects) {
        currentUrl = new URL(location, currentUrl).href
        redirectCount += 1
        continue
      }

      const outcome = outcomeForStatus(status, redirectCount)
      return {
        target_id: target.target_id,
        record_key: target.record_key,
        record_kind: target.record_kind,
        id: target.id,
        entity_id: target.entity_id,
        slug: target.slug,
        field: target.field,
        requested_url: target.requested_url,
        final_url: currentUrl,
        http_status: status,
        redirect_count: redirectCount,
        outcome,
        observed_at: observedAt,
        error_category: null,
        error_message: null,
      }
    }
  } catch (error) {
    const timeout = error?.name === 'TimeoutError' || error?.name === 'AbortError'
    return {
      target_id: target.target_id,
      record_key: target.record_key,
      record_kind: target.record_kind,
      id: target.id,
      entity_id: target.entity_id,
      slug: target.slug,
      field: target.field,
      requested_url: target.requested_url,
      final_url: currentUrl,
      http_status: null,
      redirect_count: redirectCount,
      outcome: timeout ? 'timeout' : 'network_error',
      observed_at: observedAt,
      error_category: timeout ? 'timeout' : 'network_error',
      error_message: String(error?.message ?? error).slice(0, 240),
    }
  }
}

export async function observeTargets(targets, policy, observedAt = new Date().toISOString()) {
  const observations = new Array(targets.length)
  let index = 0
  const worker = async () => {
    for (;;) {
      const current = index
      index += 1
      if (current >= targets.length) return
      observations[current] = await observeTarget(targets[current], policy, observedAt)
    }
  }
  const count = Math.max(1, Math.min(policy.network.concurrency, targets.length || 1))
  await Promise.all(Array.from({ length: count }, () => worker()))
  return observations
}

export function invalidTargetObservations(invalidTargets, observedAt) {
  return invalidTargets.map((target) => ({
    target_id: target.target_id,
    record_key: target.record_key,
    record_kind: target.record_kind,
    id: target.id,
    entity_id: target.entity_id,
    slug: target.slug,
    field: target.field,
    requested_url: target.requested_url,
    final_url: null,
    http_status: null,
    redirect_count: 0,
    outcome: 'invalid_target',
    observed_at: observedAt,
    error_category: 'invalid_target',
    error_message: target.reason,
  }))
}

export function compareMonitoringState(observations, previousState) {
  if (!previousState || !Array.isArray(previousState.observations)) {
    return { baseline_initialized: true, changes: [], removed_targets: [] }
  }

  const previous = new Map(previousState.observations.map((item) => [item.target_id, item]))
  const currentIds = new Set(observations.map((item) => item.target_id))
  const changes = []

  for (const item of observations) {
    const before = previous.get(item.target_id)
    if (!before) {
      changes.push({ target_id: item.target_id, record_key: item.record_key, change_type: 'target_added', before: null, after: compactState(item) })
      continue
    }
    if (before.outcome !== item.outcome || before.http_status !== item.http_status || before.final_url !== item.final_url) {
      changes.push({ target_id: item.target_id, record_key: item.record_key, change_type: 'observation_changed', before: compactState(before), after: compactState(item) })
    }
  }

  const removed_targets = previousState.observations
    .filter((item) => !currentIds.has(item.target_id))
    .map((item) => ({ target_id: item.target_id, record_key: item.record_key, change_type: 'target_removed', before: compactState(item), after: null }))

  return { baseline_initialized: false, changes, removed_targets }
}

function compactState(item) {
  return {
    outcome: item.outcome ?? null,
    http_status: item.http_status ?? null,
    final_url: item.final_url ?? null,
  }
}

export function buildReviewQueue(reverification, observations, comparison) {
  const items = []
  const push = (seed) => items.push({
    review_id: `review_${sha(JSON.stringify(seed)).slice(0, 20)}`,
    recommended_action: 'research_before_canonical_change',
    ...seed,
  })

  for (const item of reverification) {
    if (item.state === 'review_due') push({ reason: 'reverification_due', record_kind: item.record_kind, id: item.id, entity_id: item.entity_id, slug: item.slug, requested_url: null, observation: null })
    if (item.state === 'review_overdue') push({ reason: 'reverification_overdue', record_kind: item.record_kind, id: item.id, entity_id: item.entity_id, slug: item.slug, requested_url: null, observation: null })
    if (item.state === 'verification_date_missing') push({ reason: 'verification_date_missing', record_kind: item.record_kind, id: item.id, entity_id: item.entity_id, slug: item.slug, requested_url: null, observation: null })
    if (item.state === 'verification_date_invalid') push({ reason: 'verification_date_invalid', record_kind: item.record_kind, id: item.id, entity_id: item.entity_id, slug: item.slug, requested_url: null, observation: null })
  }

  const reasonByOutcome = {
    not_found: 'official_url_not_found',
    gone: 'official_url_gone',
    rate_limited: 'official_url_rate_limited',
    server_error: 'official_url_server_error',
    network_error: 'official_url_network_error',
    timeout: 'official_url_network_error',
    invalid_target: 'official_url_network_error',
  }
  for (const item of observations) {
    const reason = reasonByOutcome[item.outcome]
    if (!reason) continue
    push({
      reason,
      record_kind: item.record_kind,
      id: item.id,
      entity_id: item.entity_id,
      slug: item.slug,
      requested_url: item.requested_url,
      observation: compactState(item),
    })
  }

  if (!comparison.baseline_initialized) {
    for (const change of comparison.changes) {
      if (change.change_type !== 'observation_changed') continue
      if (change.before?.final_url !== change.after?.final_url) {
        const observation = observations.find((item) => item.target_id === change.target_id)
        if (observation) push({
          reason: 'official_url_final_url_changed',
          record_kind: observation.record_kind,
          id: observation.id,
          entity_id: observation.entity_id,
          slug: observation.slug,
          requested_url: observation.requested_url,
          observation: change.after,
        })
      } else if (change.before?.outcome === 'redirected' || change.after?.outcome === 'redirected') {
        const observation = observations.find((item) => item.target_id === change.target_id)
        if (observation) push({
          reason: 'official_url_redirect_changed',
          record_kind: observation.record_kind,
          id: observation.id,
          entity_id: observation.entity_id,
          slug: observation.slug,
          requested_url: observation.requested_url,
          observation: change.after,
        })
      }
    }
  }

  items.sort((a, b) => `${a.reason}:${a.record_kind}:${a.id}:${a.requested_url ?? ''}`.localeCompare(`${b.reason}:${b.record_kind}:${b.id}:${b.requested_url ?? ''}`))
  return items
}

export function summarizeReverification(rows) {
  return rows.reduce((acc, row) => {
    acc[row.state] = (acc[row.state] ?? 0) + 1
    return acc
  }, {})
}

export function summarizeObservations(rows) {
  return rows.reduce((acc, row) => {
    acc[row.outcome] = (acc[row.outcome] ?? 0) + 1
    return acc
  }, {})
}
