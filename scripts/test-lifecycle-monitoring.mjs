import assert from 'node:assert/strict'
import {
  buildReverificationQueue,
  buildReviewQueue,
  collectTargets,
  compareMonitoringState,
  invalidTargetObservations,
  outcomeForStatus,
} from './lifecycle-monitoring-core.mjs'

const policy = {
  reverification: { review_due_days: 90, review_overdue_days: 180 },
  network: {
    timeout_ms: 8000,
    max_redirects: 5,
    max_targets_per_run: 10,
    concurrency: 2,
    accepted_schemes: ['https:', 'http:'],
    user_agent: 'test',
  },
  target_fields: { entity: ['official_url'], product: ['official_url'] },
}

const entities = [
  { id: 'e1', slug: 'alpha', canonical_name: 'Alpha', official_url: 'https://example.com/', last_verified_at: '2026-08-01' },
  { id: 'e2', slug: 'no-url', canonical_name: 'No URL', last_verified_at: '2026-01-01' },
  { id: 'e3', slug: 'bad-url', canonical_name: 'Bad URL', official_url: 'ftp://example.com/file', last_verified_at: null },
]
const products = [
  { id: 'p1', entity_id: 'e1', slug: 'alpha-app', product_name: 'Alpha App', official_url: 'https://example.com/app', last_verified_at: '2026-05-01' },
  { id: 'p2', entity_id: 'e1', slug: 'alpha-old', product_name: 'Alpha Old', last_verified_at: 'not-a-date' },
]

{
  const extracted = collectTargets(entities, products, policy)
  assert.equal(extracted.total_valid_targets, 2)
  assert.equal(extracted.targets.length, 2)
  assert.equal(extracted.invalid_targets.length, 1)
  assert.equal(extracted.truncated_targets.length, 0)
  assert.deepEqual(extracted.targets.map((target) => target.id).sort(), ['e1', 'p1'])
  assert.ok(!extracted.targets.some((target) => target.id === 'e2'), 'monitoring must not synthesize a URL from name or slug')
  assert.equal(extracted.invalid_targets[0].reason.startsWith('unsupported URL scheme'), true)
}

{
  const cappedPolicy = structuredClone(policy)
  cappedPolicy.network.max_targets_per_run = 1
  const extracted = collectTargets(entities, products, cappedPolicy)
  assert.equal(extracted.targets.length, 1)
  assert.equal(extracted.truncated_targets.length, 1)
}

{
  const rows = buildReverificationQueue(entities, products, '2026-08-17T00:00:00.000Z', policy)
  const states = Object.fromEntries(rows.map((row) => [row.id, row.state]))
  assert.equal(states.e1, 'current')
  assert.equal(states.e2, 'review_overdue')
  assert.equal(states.e3, 'verification_date_missing')
  assert.equal(states.p1, 'review_due')
  assert.equal(states.p2, 'verification_date_invalid')
}

{
  assert.equal(outcomeForStatus(200), 'ok')
  assert.equal(outcomeForStatus(200, 1), 'redirected')
  assert.equal(outcomeForStatus(404), 'not_found')
  assert.equal(outcomeForStatus(410), 'gone')
  assert.equal(outcomeForStatus(429), 'rate_limited')
  assert.equal(outcomeForStatus(403), 'client_error')
  assert.equal(outcomeForStatus(503), 'server_error')
}

const observation = {
  target_id: 'url_a',
  record_key: 'entity:e1:official_url',
  record_kind: 'entity',
  id: 'e1',
  entity_id: 'e1',
  slug: 'alpha',
  field: 'official_url',
  requested_url: 'https://example.com/',
  final_url: 'https://example.com/',
  http_status: 200,
  redirect_count: 0,
  outcome: 'ok',
  observed_at: '2026-08-17T00:00:00.000Z',
  error_category: null,
  error_message: null,
}

{
  const baseline = compareMonitoringState([observation], null)
  assert.equal(baseline.baseline_initialized, true)
  assert.deepEqual(baseline.changes, [])
}

{
  const previous = { observations: [{ ...observation, outcome: 'redirected', final_url: 'https://old.example/' }] }
  const compared = compareMonitoringState([observation], previous)
  assert.equal(compared.baseline_initialized, false)
  assert.equal(compared.changes.length, 1)
  assert.equal(compared.changes[0].change_type, 'observation_changed')
}

{
  const invalids = invalidTargetObservations([{
    target_id: 'invalid_a', record_key: 'entity:e3:official_url', record_kind: 'entity', id: 'e3', entity_id: 'e3', slug: 'bad-url', field: 'official_url', requested_url: 'ftp://example.com/file', reason: 'unsupported URL scheme: ftp:'
  }], '2026-08-17T00:00:00.000Z')
  assert.equal(invalids[0].outcome, 'invalid_target')
  assert.equal('headers' in invalids[0], false)
  assert.equal('body' in invalids[0], false)
}

{
  const reverification = buildReverificationQueue(entities, products, '2026-08-17T00:00:00.000Z', policy)
  const failedObservation = { ...observation, outcome: 'not_found', http_status: 404 }
  const queue = buildReviewQueue(reverification, [failedObservation], { baseline_initialized: true, changes: [], removed_targets: [] })
  assert.ok(queue.some((item) => item.reason === 'official_url_not_found'))
  assert.ok(queue.some((item) => item.reason === 'reverification_overdue'))
  assert.ok(queue.some((item) => item.reason === 'reverification_due'))
  assert.ok(queue.every((item) => item.recommended_action === 'research_before_canonical_change'))
  const serialized = JSON.stringify(queue)
  for (const forbidden of ['mark_dead', 'mark_unsupported', 'mark_patched', 'downgrade_security']) assert.equal(serialized.includes(forbidden), false)
}

console.log('Lifecycle monitoring offline tests passed')
