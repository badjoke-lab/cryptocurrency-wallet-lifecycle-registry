import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { buildStats } from './lib/stats-data.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'))
const readText = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8')

function fail(message) {
  console.error(`STATS_INVALID ${message}`)
  process.exit(1)
}
function assert(condition, message) {
  if (!condition) fail(message)
}
function stable(value) {
  return JSON.stringify(value)
}
function pct(count, denominator) {
  return denominator ? Math.round((count / denominator) * 1000) / 10 : 0
}

const entities = readJson('data/entities.json')
const products = readJson('data/products.json')
const events = readJson('data/events.json')
const evidence = readJson('data/evidence.json')
const policy = readJson('config/structured-discovery.json')
const manifest = readJson('public/data/manifest.json')
const stats = readJson('public/data/stats.json')
const expected = buildStats({ entities, products, events, evidence, policy })

assert(stats.schema === 'wlr.stats.v1', 'schema must be wlr.stats.v1')
assert(stats.scope === 'canonical_only', 'scope must be canonical_only')
assert(stable(stats) === stable(expected), 'public stats.json drifted from deterministic derivation')
assert(stats.registry.entities === entities.length, 'entity total mismatch')
assert(stats.registry.products === products.length, 'product total mismatch')
assert(stats.registry.events === events.length, 'event total mismatch')
assert(stats.registry.evidence === evidence.length, 'evidence total mismatch')

const incidentTypes = new Set(policy.incident_event_types)
const remediationTypes = new Set(policy.remediation_event_types)
const eolTypes = new Set(policy.eol_event_types)
assert(!eolTypes.has('service_shutdown'), 'service_shutdown must not be EOL')
assert(stats.registry.incident_events === events.filter((row) => incidentTypes.has(row.event_type)).length, 'incident total differs from central policy')
assert(stats.registry.remediation_events === events.filter((row) => remediationTypes.has(row.event_type)).length, 'remediation total differs from central policy')
assert(stats.registry.eol_events === events.filter((row) => eolTypes.has(row.event_type)).length, 'EOL total differs from central policy')

function validateCoverage(value, label) {
  assert(Number.isInteger(value.count) && value.count >= 0, `${label} count invalid`)
  assert(Number.isInteger(value.denominator) && value.denominator >= 0, `${label} denominator invalid`)
  assert(value.count <= value.denominator, `${label} count exceeds denominator`)
  assert(value.percentage === pct(value.count, value.denominator), `${label} percentage/denominator mismatch`)
}

function walk(value, trail = 'stats') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${trail}[${index}]`))
    return
  }
  if (!value || typeof value !== 'object') return
  if ('count' in value && 'denominator' in value && 'percentage' in value) validateCoverage(value, trail)
  for (const [key, child] of Object.entries(value)) walk(child, `${trail}.${key}`)
}
walk(stats)

for (const rows of [
  stats.entities.wallet_type,
  stats.entities.status,
  stats.entities.confidence,
  stats.entities.custody_model,
  stats.products.product_type,
  stats.products.status,
  stats.products.support_status,
  stats.products.sales_status,
  stats.incidents.by_year,
  stats.incidents.event_type,
  stats.incidents.impact_level,
  stats.remediation.by_year,
  stats.remediation.event_type,
  stats.eol_lifecycle.by_year,
  stats.eol_lifecycle.event_type,
]) {
  const denominators = new Set(rows.map((row) => row.denominator))
  assert(denominators.size <= 1, 'distribution denominator drift')
  if (rows.length) {
    const denominator = rows[0].denominator
    assert(rows.reduce((sum, row) => sum + row.count, 0) === denominator, 'distribution buckets do not sum to denominator')
  }
}

assert(stats.remediation.patch_response_duration.status === 'unavailable', 'patch response duration must remain unavailable without explicit linkage')
assert(stats.remediation.patch_response_duration.reason.includes('incident-to-remediation linkage'), 'patch response unavailable reason must identify missing canonical linkage')

const lifespan = stats.eol_lifecycle.exact_product_lifespan
for (const row of lifespan.records) {
  const product = products.find((item) => item.id === row.product_id)
  assert(Boolean(product), `lifespan record references missing product ${row.product_id}`)
  assert(product.launch_date_precision === 'day', `lifespan ${row.product_id} launch precision is not day`)
  assert(/^\d{4}-\d{2}-\d{2}$/.test(product.launch_date ?? ''), `lifespan ${row.product_id} launch date is not day-level`)
  assert(/^\d{4}-\d{2}-\d{2}$/.test(product.discontinued_date ?? ''), `lifespan ${row.product_id} discontinued date is not day-level`)
  assert(!('sales_end_date' in row), 'lifespan record must not substitute sales-end date')
}
assert(lifespan.eligible_count === lifespan.records.length, 'lifespan eligible count mismatch')
assert((lifespan.eligible_count >= 2) === (lifespan.distribution !== null), 'lifespan distribution availability violates minimum sample rule')

const serialized = JSON.stringify(stats).toLowerCase()
for (const prohibited of ['risk_score', 'safety_score', 'quality_score', 'market_share', 'vendor_response_score', 'days_to_patch']) {
  assert(!serialized.includes(prohibited), `stats contains prohibited field/language ${prohibited}`)
}

assert(manifest.files.includes('/data/stats.json'), 'manifest files must advertise stats.json')
assert(manifest.deterministic_record_paths?.stats === '/data/stats.json', 'manifest deterministic paths must advertise stats.json')

const pageSource = readText('src/app/stats/page.tsx')
const headerSource = readText('src/components/site-header.tsx')
const sitemapSource = readText('src/app/sitemap.ts')
const coverageSource = readText('scripts/report_coverage.py')
const seedSource = readText('scripts/check_representative_seed.py')
assert(pageSource.includes("public', 'data', 'stats.json"), 'Stats page must read generated stats.json')
assert(pageSource.includes('Patch-response duration: unavailable'), 'Stats page must expose patch-response limitation')
assert(pageSource.includes('Exact product lifespan distribution'), 'Stats page must expose lifespan eligibility')
assert(headerSource.includes('href="/stats/"'), 'Stats route missing from navigation')
assert(sitemapSource.includes("'/stats'"), 'Stats route missing from sitemap')
assert(coverageSource.includes('structured-discovery.json'), 'coverage audit must consume central policy')
assert(!coverageSource.includes('SECURITY_EVENT_TYPES ='), 'coverage audit still defines local security taxonomy')
assert(seedSource.includes('structured-discovery.json'), 'seed gate must consume central policy')
assert(!seedSource.includes('service_shutdown'), 'seed gate must not treat service_shutdown as local EOL taxonomy')
assert(!seedSource.includes('PATCH_TYPES ='), 'seed gate still defines local remediation taxonomy')

console.log(`STATS_OK entities=${stats.registry.entities} products=${stats.registry.products} events=${stats.registry.events} evidence=${stats.registry.evidence} incidents=${stats.registry.incident_events} remediation=${stats.registry.remediation_events} eol=${stats.registry.eol_events} exact_lifespans=${lifespan.eligible_count}`)
