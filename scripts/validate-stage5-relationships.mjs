import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

const readJson = (path) => {
  if (!existsSync(path)) throw new Error(`${path}: missing`);
  return JSON.parse(readFileSync(path, 'utf8'));
};
const REGISTRY_ID = 'cryptocurrency-wallet-lifecycle-registry';
const pad = (value) => String(value).padStart(6, '0');
const productKey = (id) => `${REGISTRY_ID}:wlr.product-record.v1:${id}`;
const walletKey = (id) => `${REGISTRY_ID}:wlr.wallet-record.v1:${id}`;
const endpointKey = (endpoint) => `${endpoint?.registry_id}:${endpoint?.native_record_type}:${endpoint?.native_record_id}`;
const relationshipId = (type, source, target) => `series_rel_${createHash('sha256').update(`${type}\n${source}\n${target}`, 'utf8').digest('hex')}`;

function expectedTuples(authority) {
  const tuples = [];
  for (const group of authority.reviewed_product_of_groups ?? []) {
    for (const [start, end] of group.product_ranges ?? []) {
      for (let product = start; product <= end; product += 1) tuples.push(['product_of', productKey(`wlr_prod_${pad(product)}`), walletKey(`wlr_ent_${pad(group.wallet)}`)]);
    }
  }
  const sequential = authority.reviewed_product_of_sequential_singletons ?? {};
  for (let product = sequential.product_start; product <= sequential.product_end; product += 1) {
    tuples.push(['product_of', productKey(`wlr_prod_${pad(product)}`), walletKey(`wlr_ent_${pad(sequential.wallet_start + product - sequential.product_start)}`)]);
  }
  for (const [type, sourceId, targetId] of authority.reviewed_lineage_allowlist ?? []) tuples.push([type, productKey(sourceId), productKey(targetId)]);
  return tuples;
}

const authority = readJson('config/ledger-series-phase9-stage5-relationship-authority.json');
const descriptor = readJson('public/data/series/registry.json');
const index = readJson('public/data/series/index.json');
const relationships = readJson('public/data/series/relationships.json');
const errors = [];
const fail = (message) => errors.push(message);

if (authority.authority_id !== 'wlr-ledger-series-phase9-stage5-relationship-2026-08-21') fail('unexpected Stage 5 authority ID');
if (authority.accepted_count !== 161) fail('authority accepted count must be 161');
if (descriptor.record_counts?.relationships !== 161) fail('descriptor relationship count must be 161');
if (descriptor.routes?.relationships !== '/data/series/relationships.json') fail('descriptor relationship route mismatch');
if (descriptor.capabilities?.relationships !== 'adapter') fail('descriptor relationship capability mismatch');

const expected = expectedTuples(authority);
if (expected.length !== 161) fail(`authority expansion count must be 161, found ${expected.length}`);
const expectedSet = new Set(expected.map(([type, source, target]) => `${type}\n${source}\n${target}`));
if (expectedSet.size !== 161) fail('authority expansion contains duplicate tuples');

const indexRows = Array.isArray(index.records) ? index.records : [];
const indexKeys = new Set(indexRows.map((row) => row.global_record_key));
const rowsByKey = new Map(indexRows.map((row) => [row.global_record_key, row]));
if (indexKeys.size !== indexRows.length) fail('Series index contains duplicate global keys');
if (!Array.isArray(relationships) || relationships.length !== 161) fail(`relationship transport must contain 161 records, found ${Array.isArray(relationships) ? relationships.length : 'non-array'}`);

const actualSet = new Set();
const ids = new Set();
const endpointKeys = new Set();
let productOf = 0;
let predecessor = 0;
let successor = 0;
for (const [position, relationship] of (relationships ?? []).entries()) {
  const label = `relationship ${position + 1}`;
  const source = endpointKey(relationship.source);
  const target = endpointKey(relationship.target);
  const tuple = `${relationship.relation_type}\n${source}\n${target}`;
  if (relationship.series_schema_version !== '1.0.0') fail(`${label}: schema mismatch`);
  if (relationship.object_type !== 'relationship_record') fail(`${label}: object type mismatch`);
  if (!['product_of', 'predecessor_of', 'successor_of'].includes(relationship.relation_type)) fail(`${label}: unauthorized relation type`);
  if (relationship.relation_type === 'product_of') productOf += 1;
  if (relationship.relation_type === 'predecessor_of') predecessor += 1;
  if (relationship.relation_type === 'successor_of') successor += 1;
  if (relationship.direction !== 'directed') fail(`${label}: direction mismatch`);
  if (relationship.provenance?.basis !== 'native_reviewed_relationship') fail(`${label}: provenance basis mismatch`);
  if (!Array.isArray(relationship.provenance?.native_evidence_refs)) fail(`${label}: native_evidence_refs must be an array`);
  if (!indexKeys.has(source)) fail(`${label}: source endpoint missing from Stage 3 index`);
  if (!indexKeys.has(target)) fail(`${label}: target endpoint missing from Stage 3 index`);
  if (source === target) fail(`${label}: self-loop`);
  if (!expectedSet.has(tuple)) fail(`${label}: tuple outside reviewed authority`);
  if (actualSet.has(tuple)) fail(`${label}: duplicate tuple`);
  actualSet.add(tuple);
  const expectedId = relationshipId(relationship.relation_type, source, target);
  if (relationship.id !== expectedId) fail(`${label}: deterministic ID mismatch`);
  if (ids.has(relationship.id)) fail(`${label}: duplicate relationship ID`);
  ids.add(relationship.id);
  endpointKeys.add(source);
  endpointKeys.add(target);
}

if (productOf !== 149 || predecessor !== 6 || successor !== 6) fail(`relationship type counts must be 149/6/6, found ${productOf}/${predecessor}/${successor}`);
if (actualSet.size !== expectedSet.size || [...expectedSet].some((tuple) => !actualSet.has(tuple))) fail('generated relationship set does not exactly equal reviewed authority expansion');

for (const key of endpointKeys) {
  const row = rowsByKey.get(key);
  if (!row) continue;
  const envelope = readJson(`public/data/series/records/${row.series_slug}.json`);
  if (envelope.global_record_key !== key) fail(`${key}: referenced envelope key mismatch`);
  if (!Array.isArray(envelope.relationships) || envelope.relationships.length !== 0) fail(`${key}: record-envelope relationships must remain empty`);
}

if (errors.length) {
  console.error(`WLR Stage 5 relationship validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`WLR Stage 5 relationship validation passed: 149 product_of + 6 predecessor_of + 6 successor_of across ${endpointKeys.size} referenced Stage 3 endpoints.`);
