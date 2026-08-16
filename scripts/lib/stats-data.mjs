const pct = (count, denominator) => denominator ? Math.round((count / denominator) * 1000) / 10 : 0

const coverage = (count, denominator) => ({ count, denominator, percentage: pct(count, denominator) })

const textValue = (value) => {
  if (value === null || value === undefined || value === '') return 'not_recorded'
  return String(value)
}

const distribution = (rows, getter, denominator = rows.length) => {
  const counts = new Map()
  for (const row of rows) {
    const value = textValue(getter(row))
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count, denominator, percentage: pct(count, denominator) }))
    .sort((a, b) => a.value.localeCompare(b.value))
}

const eventYear = (value) => {
  const match = /^(\d{4})(?:-|$)/.exec(value ?? '')
  return match ? match[1] : 'not_recorded'
}

const isFullDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value ?? '')

const daysBetween = (start, end) => {
  const startMs = Date.parse(`${start}T00:00:00Z`)
  const endMs = Date.parse(`${end}T00:00:00Z`)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return null
  return Math.round((endMs - startMs) / 86400000)
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  if (!sorted.length) return null
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2) return sorted[middle]
  return Math.round(((sorted[middle - 1] + sorted[middle]) / 2) * 10) / 10
}

const hasAffectedVersionInfo = (event) =>
  Boolean(event.affected_versions?.length) || Boolean(event.affected_version_rules?.length)

const hasAffectedProductReference = (event) =>
  Boolean(event.product_id) || Boolean(event.affected_product_ids?.length)

const evidenceLinkedToEvent = (row) => Boolean(row.event_id) || Boolean(row.event_ids?.length)
const evidenceLinkedToProduct = (row) => Boolean(row.product_id) || Boolean(row.product_ids?.length)

export function buildStats({ entities, products, events, evidence, policy }) {
  const incidentTypes = new Set(policy.incident_event_types)
  const remediationTypes = new Set(policy.remediation_event_types)
  const eolTypes = new Set(policy.eol_event_types)
  const eolEntityStatuses = new Set(policy.eol_entity_statuses)
  const eolProductStatuses = new Set(policy.eol_product_statuses)

  const incidents = events.filter((event) => incidentTypes.has(event.event_type))
  const remediations = events.filter((event) => remediationTypes.has(event.event_type))
  const eolEvents = events.filter((event) => eolTypes.has(event.event_type))

  const productsByEntity = new Map()
  const eventsByEntity = new Map()
  const evidenceByEntity = new Map()
  for (const product of products) {
    const rows = productsByEntity.get(product.entity_id) ?? []
    rows.push(product)
    productsByEntity.set(product.entity_id, rows)
  }
  for (const event of events) {
    const rows = eventsByEntity.get(event.entity_id) ?? []
    rows.push(event)
    eventsByEntity.set(event.entity_id, rows)
  }
  for (const source of evidence) {
    const rows = evidenceByEntity.get(source.entity_id) ?? []
    rows.push(source)
    evidenceByEntity.set(source.entity_id, rows)
  }

  const entityWithProducts = entities.filter((entity) => (productsByEntity.get(entity.id) ?? []).length >= 1).length
  const entityWithEvent = entities.filter((entity) => (eventsByEntity.get(entity.id) ?? []).length >= 1).length
  const entityWithTwoEvents = entities.filter((entity) => (eventsByEntity.get(entity.id) ?? []).length >= 2).length
  const entityWithEvidence = entities.filter((entity) => (evidenceByEntity.get(entity.id) ?? []).length >= 1).length
  const entityWithTwoEvidence = entities.filter((entity) => (evidenceByEntity.get(entity.id) ?? []).length >= 2).length
  const entityLaunchKnown = entities.filter((entity) => Boolean(entity.launch_date)).length
  const entityCustodyRecorded = entities.filter((entity) => Boolean(entity.custody_model)).length

  const productLaunchKnown = products.filter((product) => Boolean(product.launch_date)).length
  const productSupportKnown = products.filter((product) => Boolean(product.support_status) && product.support_status !== 'unknown').length
  const productSalesKnown = products.filter((product) => Boolean(product.sales_status) && product.sales_status !== 'unknown').length
  const productSupportCommitment = products.filter((product) => product.support_commitment && Object.keys(product.support_commitment).length > 0).length
  const productLineage = products.filter((product) => Boolean(product.predecessor_product_id) || Boolean(product.successor_product_id)).length

  const eventDateBasisKnown = events.filter((event) => Boolean(event.event_date_basis)).length
  const incidentImpactKnown = incidents.filter((event) => Boolean(event.impact_level)).length
  const incidentScopeKnown = incidents.filter((event) => Boolean(event.security_scope)).length
  const incidentFundsKnown = incidents.filter((event) => Boolean(event.funds_affected)).length
  const incidentCveKnown = incidents.filter((event) => Boolean(event.cve_ids?.length)).length
  const incidentVersionKnown = incidents.filter(hasAffectedVersionInfo).length
  const remediationFixedKnown = remediations.filter((event) => Boolean(event.fixed_versions?.length)).length
  const remediationProductRefKnown = remediations.filter(hasAffectedProductReference).length
  const remediationActionsKnown = remediations.filter((event) => Boolean(event.user_actions_required?.length)).length
  const incidentFixedInfo = incidents.filter((event) => Boolean(event.fixed_versions?.length)).length

  const productDiscontinued = products.filter((product) => Boolean(product.discontinued_date)).length
  const productSalesEnd = products.filter((product) => Boolean(product.sales_end_date)).length
  const productEolStatus = products.filter((product) => eolProductStatuses.has(product.status)).length
  const entityDiscontinued = entities.filter((entity) => Boolean(entity.discontinued_date)).length
  const entityEolStatus = entities.filter((entity) => eolEntityStatuses.has(entity.status)).length

  const exactLifespans = products
    .filter((product) => product.launch_date_precision === 'day' && isFullDate(product.launch_date) && isFullDate(product.discontinued_date))
    .map((product) => ({
      product_id: product.id,
      slug: product.slug,
      product_name: product.product_name,
      launch_date: product.launch_date,
      discontinued_date: product.discontinued_date,
      days: daysBetween(product.launch_date, product.discontinued_date),
    }))
    .filter((row) => row.days !== null)

  const exactLifespanDays = exactLifespans.map((row) => row.days)
  const lifespanDistribution = exactLifespans.length >= 2 ? {
    eligible_count: exactLifespans.length,
    minimum_days: Math.min(...exactLifespanDays),
    median_days: median(exactLifespanDays),
    maximum_days: Math.max(...exactLifespanDays),
  } : null

  const primaryEvidence = evidence.filter((row) => row.is_primary === true).length
  const linkedEventEvidence = evidence.filter(evidenceLinkedToEvent).length
  const linkedProductEvidence = evidence.filter(evidenceLinkedToProduct).length
  const entityOnlyEvidence = evidence.filter((row) => !evidenceLinkedToEvent(row) && !evidenceLinkedToProduct(row)).length

  return {
    schema: 'wlr.stats.v1',
    scope: 'canonical_only',
    interpretation: 'Statistics describe reviewed WLR registry records. They are not wallet safety scores, market-share estimates, rankings, recommendations, or inferred vendor-performance metrics.',
    generated_from: [
      'data/entities.json',
      'data/products.json',
      'data/events.json',
      'data/evidence.json',
      'config/structured-discovery.json',
    ],
    registry: {
      entities: entities.length,
      products: products.length,
      events: events.length,
      evidence: evidence.length,
      incident_events: incidents.length,
      remediation_events: remediations.length,
      eol_events: eolEvents.length,
    },
    entities: {
      wallet_type: distribution(entities, (row) => row.wallet_type),
      status: distribution(entities, (row) => row.status),
      confidence: distribution(entities, (row) => row.confidence),
      custody_model: distribution(entities, (row) => row.custody_model),
      launch_date: coverage(entityLaunchKnown, entities.length),
      launch_precision: distribution(entities.filter((row) => row.launch_date), (row) => row.launch_date_precision ?? (isFullDate(row.launch_date) ? 'day' : 'not_recorded'), entityLaunchKnown),
    },
    products: {
      product_type: distribution(products, (row) => row.product_type),
      status: distribution(products, (row) => row.status),
      support_status: distribution(products, (row) => row.support_status),
      sales_status: distribution(products, (row) => row.sales_status),
      confidence: distribution(products, (row) => row.confidence),
      launch_date: coverage(productLaunchKnown, products.length),
      launch_precision: distribution(products.filter((row) => row.launch_date), (row) => row.launch_date_precision ?? (isFullDate(row.launch_date) ? 'day' : 'not_recorded'), productLaunchKnown),
      support_commitment: coverage(productSupportCommitment, products.length),
      lineage_participation: coverage(productLineage, products.length),
    },
    incidents: {
      by_year: distribution(incidents, (row) => eventYear(row.event_date)),
      event_type: distribution(incidents, (row) => row.event_type),
      impact_level: distribution(incidents, (row) => row.impact_level),
      security_scope: distribution(incidents, (row) => row.security_scope),
      funds_affected: distribution(incidents, (row) => row.funds_affected),
      confidence: distribution(incidents, (row) => row.confidence),
      cve: coverage(incidentCveKnown, incidents.length),
      affected_version_info: coverage(incidentVersionKnown, incidents.length),
      fixed_version_info_inside_incident: coverage(incidentFixedInfo, incidents.length),
    },
    remediation: {
      by_year: distribution(remediations, (row) => eventYear(row.event_date)),
      event_type: distribution(remediations, (row) => row.event_type),
      confidence: distribution(remediations, (row) => row.confidence),
      fixed_versions: coverage(remediationFixedKnown, remediations.length),
      affected_product_reference: coverage(remediationProductRefKnown, remediations.length),
      user_actions_required: coverage(remediationActionsKnown, remediations.length),
      patch_response_duration: {
        status: 'unavailable',
        reason: 'canonical incident-to-remediation linkage is not recorded',
      },
    },
    eol_lifecycle: {
      by_year: distribution(eolEvents, (row) => eventYear(row.event_date)),
      event_type: distribution(eolEvents, (row) => row.event_type),
      entity_discontinued_date: coverage(entityDiscontinued, entities.length),
      entity_eol_status: coverage(entityEolStatus, entities.length),
      product_discontinued_date: coverage(productDiscontinued, products.length),
      product_sales_end_date: coverage(productSalesEnd, products.length),
      product_eol_status: coverage(productEolStatus, products.length),
      exact_product_lifespan: {
        eligible_count: exactLifespans.length,
        eligibility: 'launch_date and discontinued_date both day-level; launch_date_precision=day',
        records: exactLifespans,
        distribution: lifespanDistribution,
        distribution_status: exactLifespans.length >= 2 ? 'available' : 'unavailable_insufficient_exact_records',
      },
    },
    data_quality: {
      entities: {
        with_product: coverage(entityWithProducts, entities.length),
        with_history_event: coverage(entityWithEvent, entities.length),
        with_two_history_events: coverage(entityWithTwoEvents, entities.length),
        with_evidence: coverage(entityWithEvidence, entities.length),
        with_two_evidence: coverage(entityWithTwoEvidence, entities.length),
        launch_date: coverage(entityLaunchKnown, entities.length),
        custody_model: coverage(entityCustodyRecorded, entities.length),
        confidence: distribution(entities, (row) => row.confidence),
      },
      products: {
        launch_date: coverage(productLaunchKnown, products.length),
        support_status_known: coverage(productSupportKnown, products.length),
        sales_status_known: coverage(productSalesKnown, products.length),
        support_commitment: coverage(productSupportCommitment, products.length),
        lineage_participation: coverage(productLineage, products.length),
        confidence: distribution(products, (row) => row.confidence),
      },
      events: {
        event_date_basis: coverage(eventDateBasisKnown, events.length),
        confidence: distribution(events, (row) => row.confidence),
        incident_impact_level: coverage(incidentImpactKnown, incidents.length),
        incident_security_scope: coverage(incidentScopeKnown, incidents.length),
        incident_funds_affected: coverage(incidentFundsKnown, incidents.length),
        incident_cve: coverage(incidentCveKnown, incidents.length),
        incident_affected_version_info: coverage(incidentVersionKnown, incidents.length),
        remediation_fixed_versions: coverage(remediationFixedKnown, remediations.length),
      },
      evidence: {
        primary: coverage(primaryEvidence, evidence.length),
        reliability: distribution(evidence, (row) => row.reliability),
        source_type: distribution(evidence, (row) => row.source_type),
        linked_to_event: coverage(linkedEventEvidence, evidence.length),
        linked_to_product: coverage(linkedProductEvidence, evidence.length),
        entity_only: coverage(entityOnlyEvidence, evidence.length),
      },
    },
  }
}
