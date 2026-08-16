import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'))
const readText = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8')

function fail(message) {
  console.error(`STRUCTURED_DISCOVERY_INVALID ${message}`)
  process.exit(1)
}

function assert(condition, message) {
  if (!condition) fail(message)
}

function sameSet(actual, expected) {
  return actual.length === expected.length && [...actual].sort().join('\n') === [...expected].sort().join('\n')
}

const policy = readJson('config/structured-discovery.json')
const cloudflarePolicy = readJson('config/cloudflare-pages-project.json')
const entities = readJson('data/entities.json')
const products = readJson('data/products.json')
const events = readJson('data/events.json')
const eventSchema = readJson('schemas/event.schema.json')

assert(policy.schema_version === '1.0.0', 'unsupported policy schema version')
assert(
  cloudflarePolicy.source_config?.path_includes?.includes('config/*'),
  'Cloudflare build watch must include config/* because structured discovery policy is a runtime build input',
)

const expectedIncidentTypes = [
  'vulnerability_disclosed',
  'security_research_published',
  'exploit',
  'unauthorized_access',
  'supply_chain_compromise',
  'malicious_update',
  'seed_key_exposure',
  'private_key_exposure',
  'firmware_issue',
  'software_issue',
  'customer_data_breach',
  'third_party_data_breach',
  'phishing_campaign',
]
const expectedRemediationTypes = [
  'security_fix',
  'firmware_fix',
  'software_fix',
  'key_migration_recommended',
  'recall',
]
const expectedEolTypes = ['deprecation_announced', 'sales_discontinued', 'discontinued']
const expectedEntityEolStatuses = ['deprecated', 'discontinued', 'dead']
const expectedProductEolStatuses = ['deprecated', 'discontinued']

assert(sameSet(policy.incident_event_types, expectedIncidentTypes), 'incident event taxonomy drifted from Step 5 specification')
assert(sameSet(policy.remediation_event_types, expectedRemediationTypes), 'remediation event taxonomy drifted from Step 5 specification')
assert(sameSet(policy.eol_event_types, expectedEolTypes), 'EOL event taxonomy drifted from Step 5 specification')
assert(sameSet(policy.eol_entity_statuses, expectedEntityEolStatuses), 'entity EOL statuses drifted from Step 5 specification')
assert(sameSet(policy.eol_product_statuses, expectedProductEolStatuses), 'product EOL statuses drifted from Step 5 specification')
assert(!policy.eol_event_types.includes('service_shutdown'), 'service_shutdown must not imply wallet EOL')

const expectedLabels = {
  custody_missing: 'Not recorded',
  incident_recorded: 'Reviewed incident history',
  incident_not_recorded: 'No reviewed incident recorded',
  remediation_recorded: 'Recorded fix/remediation',
  remediation_not_recorded: 'No reviewed fix/remediation recorded',
  eol_recorded: 'Recorded EOL/deprecation',
  eol_not_recorded: 'No reviewed EOL/deprecation recorded',
}
for (const [key, value] of Object.entries(expectedLabels)) {
  assert(policy.labels?.[key] === value, `label ${key} must remain coverage wording: ${value}`)
}
const negativeLabelText = [
  policy.labels.incident_not_recorded,
  policy.labels.remediation_not_recorded,
  policy.labels.eol_not_recorded,
].join(' ').toLowerCase()
for (const prohibited of ['safe', 'safest', 'best', 'unpatched', 'unfixed', 'unsafe']) {
  assert(!negativeLabelText.includes(prohibited), `negative discovery labels must not contain ${prohibited}`)
}

const schemaEventTypes = new Set(eventSchema.properties.event_type.enum)
for (const eventType of [
  ...policy.incident_event_types,
  ...policy.remediation_event_types,
  ...policy.eol_event_types,
]) {
  assert(schemaEventTypes.has(eventType), `configured event type is not in event schema: ${eventType}`)
}

const productsByEntity = new Map()
const eventsByEntity = new Map()
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

const incidentTypes = new Set(policy.incident_event_types)
const remediationTypes = new Set(policy.remediation_event_types)
const eolTypes = new Set(policy.eol_event_types)
const entityEolStatuses = new Set(policy.eol_entity_statuses)
const productEolStatuses = new Set(policy.eol_product_statuses)

let incidentRecorded = 0
let remediationRecorded = 0
let eolRecorded = 0
let custodyNotRecorded = 0
let launchKnown = 0

for (const entity of entities) {
  const entityProducts = productsByEntity.get(entity.id) ?? []
  const entityEvents = eventsByEntity.get(entity.id) ?? []

  const hasIncident = entityEvents.some((event) => incidentTypes.has(event.event_type))
  const hasRemediation = entityEvents.some((event) => remediationTypes.has(event.event_type))
  const hasEol =
    entityEolStatuses.has(entity.status) ||
    entityProducts.some((product) =>
      productEolStatuses.has(product.status) || Boolean(product.discontinued_date) || Boolean(product.sales_end_date),
    ) ||
    entityEvents.some((event) => eolTypes.has(event.event_type))

  if (hasIncident) incidentRecorded += 1
  if (hasRemediation) remediationRecorded += 1
  if (hasEol) eolRecorded += 1
  if (!entity.custody_model?.trim()) custodyNotRecorded += 1

  if (entity.launch_date) {
    const match = /^(\d{4})(?:-|$)/.exec(entity.launch_date)
    assert(Boolean(match), `${entity.id} launch_date cannot provide a supported launch year`)
    const year = Number(match[1])
    assert(Number.isInteger(year), `${entity.id} launch year is not an integer`)
    launchKnown += 1
  }
}

const dataSource = readText('src/lib/data.ts')
const discoverySource = readText('src/lib/discovery.ts')
const tableSource = readText('src/components/entity-table.tsx')
const clientSource = readText('src/components/entity-table-client.tsx')
assert(dataSource.includes("structured-discovery.json"), 'incident predicate must consume structured discovery policy')
assert(dataSource.includes('discoveryPolicy.incident_event_types'), 'incident predicate is not policy-backed')
assert(discoverySource.includes("structured-discovery.json"), 'discovery derivation must consume structured discovery policy')
assert(tableSource.includes('deriveWalletDiscoveryFacts'), 'wallet table must use deterministic discovery derivation')
assert(clientSource.includes('No reviewed') || clientSource.includes('discoveryLabels'), 'client must preserve coverage-safe negative labels')
assert(clientSource.includes('Launch year from') && clientSource.includes('Launch year to'), 'launch-year range controls are missing')
assert(clientSource.includes('Recorded” describes reviewed WLR coverage'), 'registry coverage safeguard note is missing')

console.log(
  `STRUCTURED_DISCOVERY_OK entities=${entities.length} incident_recorded=${incidentRecorded} remediation_recorded=${remediationRecorded} eol_recorded=${eolRecorded} custody_not_recorded=${custodyNotRecorded} launch_known=${launchKnown}`,
)
