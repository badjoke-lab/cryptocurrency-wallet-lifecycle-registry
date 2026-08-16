import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8')
const json = (relative) => JSON.parse(read(relative))

function fail(message) {
  console.error(`COMPARE_INVALID ${message}`)
  process.exit(1)
}
function assert(condition, message) {
  if (!condition) fail(message)
}

const policy = json('config/structured-discovery.json')
const entities = json('data/entities.json')
const products = json('data/products.json')
const events = json('data/events.json')
const compareSource = read('src/lib/compare.ts')
const clientSource = read('src/app/compare/compare-client.tsx')
const pageSource = read('src/app/compare/page.tsx')
const cssSource = read('src/app/compare/compare.css')
const headerSource = read('src/components/site-header.tsx')
const sitemapSource = read('src/app/sitemap.ts')
const typesSource = read('src/lib/types.ts')

assert(entities.length >= 2, 'Compare requires at least two reviewed entities')
assert(compareSource.includes("structured-discovery.json"), 'Compare must consume structured-discovery policy')
assert(compareSource.includes('isIncident'), 'Compare must reuse the canonical incident predicate')
assert(compareSource.includes('discoveryPolicy.remediation_event_types'), 'Compare remediation taxonomy must come from structured-discovery policy')
assert(compareSource.includes('discoveryPolicy.eol_event_types'), 'Compare EOL taxonomy must come from structured-discovery policy')
assert(compareSource.includes('COMPARE_MAX_WALLETS = 4'), 'Compare selection limit must be four')
assert(compareSource.includes('seen.has(slug)'), 'Compare normalization must de-duplicate slugs')
assert(compareSource.includes('known.has(slug)'), 'Compare normalization must reject unknown slugs')
assert(!policy.eol_event_types.includes('service_shutdown'), 'service_shutdown must not be an EOL event')
assert(!compareSource.includes("eolTypes.add('service_shutdown')"), 'Compare must not add service_shutdown to EOL taxonomy')

assert(compareSource.includes('product.support_status ?? null'), 'product support status must be read directly from canonical product data')
assert(compareSource.includes('product.sales_status ?? null'), 'product sales status must be read directly from canonical product data')
assert(!compareSource.includes('overallSupport'), 'Compare must not derive an ecosystem-wide support status')
assert(!compareSource.includes('daysToPatch'), 'Step 6 must not derive patch-response durations')
assert(!compareSource.includes('riskScore') && !compareSource.includes('safetyScore'), 'Compare must not derive a risk/safety score')

for (const required of [
  'Custody model',
  'Current lifecycle status',
  'Product-specific support facts',
  'Reviewed incident records',
  'Fix / remediation events',
  'Deprecation, replacement, and migration history',
  'No reviewed incident recorded.',
  'No reviewed fix/remediation recorded.',
]) {
  assert(clientSource.includes(required), `Compare UI missing required wording: ${required}`)
}
assert(clientSource.includes("params.getAll('wallet')"), 'Compare must parse repeated wallet query parameters')
assert(clientSource.includes("url.searchParams.append('wallet', slug)"), 'Compare must write shareable wallet query parameters')
assert(clientSource.includes('selected.length >= 2'), 'Compare result must require at least two selected wallets')
assert(clientSource.includes('selectedSlugs.length >= 4'), 'Compare UI must enforce the four-wallet limit')
assert(clientSource.includes('does not recommend a wallet, declare a winner'), 'Compare must expose non-ranking disclaimer')

assert(pageSource.includes('Compare does not score wallets'), 'Compare page must state non-scoring purpose')
assert(headerSource.includes('href="/compare/"'), 'Compare must be reachable from normal site navigation')
assert(sitemapSource.includes("'/compare'"), 'Compare must be included in sitemap')
assert(cssSource.includes('.compare-scroll') && cssSource.includes('overflow-x:auto'), 'Compare must confine horizontal scrolling to a dedicated viewport')
assert(cssSource.includes('@media(max-width:720px)'), 'Compare must define mobile behavior at the existing breakpoint')
assert(typesSource.includes('fixed_versions?:FixedVersion[]'), 'Compare event typing must expose fixed versions')
assert(typesSource.includes('support_status?:string|null'), 'Compare product typing must expose support status')

const entityIds = new Set(entities.map((row) => row.id))
const productIds = new Set(products.map((row) => row.id))
for (const product of products) {
  assert(entityIds.has(product.entity_id), `product ${product.id} references missing entity`)
}
for (const event of events) {
  assert(entityIds.has(event.entity_id), `event ${event.id} references missing entity`)
  if (event.product_id) assert(productIds.has(event.product_id), `event ${event.id} references missing product ${event.product_id}`)
  for (const id of event.affected_product_ids ?? []) assert(productIds.has(id), `event ${event.id} affected_product_ids contains missing product ${id}`)
  for (const rule of event.affected_version_rules ?? []) {
    for (const id of rule.product_ids ?? []) assert(productIds.has(id), `event ${event.id} affected version rule contains missing product ${id}`)
  }
  for (const fixed of event.fixed_versions ?? []) {
    for (const id of fixed.product_ids ?? []) assert(productIds.has(id), `event ${event.id} fixed version contains missing product ${id}`)
  }
}

const incidentTypes = new Set(policy.incident_event_types)
const remediationTypes = new Set(policy.remediation_event_types)
const eolTypes = new Set(policy.eol_event_types)
const incidentCount = events.filter((event) => incidentTypes.has(event.event_type)).length
const remediationCount = events.filter((event) => remediationTypes.has(event.event_type)).length
const eolCount = events.filter((event) => eolTypes.has(event.event_type)).length

console.log(`COMPARE_OK wallets=${entities.length} products=${products.length} incident_events=${incidentCount} remediation_events=${remediationCount} eol_events=${eolCount}`)
