import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const authority = JSON.parse(readFileSync('config/ledger-series-phase9-stage5-relationship-authority.json', 'utf8'));
const origin = (process.env.WLR_PRODUCTION_ORIGIN ?? 'https://wlr.badjoke-lab.com').replace(/\/$/, '');
const attempts = Math.max(1, Number(process.env.WLR_PRODUCTION_ATTEMPTS ?? 20));
const delayMs = Math.max(0, Number(process.env.WLR_PRODUCTION_DELAY_MS ?? 15000));
const timeoutMs = Math.max(1000, Number(process.env.WLR_PRODUCTION_TIMEOUT_MS ?? 30000));
const REGISTRY_ID = 'cryptocurrency-wallet-lifecycle-registry';
const pad = (value) => String(value).padStart(6, '0');
const productKey = (id) => `${REGISTRY_ID}:wlr.product-record.v1:${id}`;
const walletKey = (id) => `${REGISTRY_ID}:wlr.wallet-record.v1:${id}`;
const endpointKey = (endpoint) => `${endpoint?.registry_id}:${endpoint?.native_record_type}:${endpoint?.native_record_id}`;
const relationshipId = (type, source, target) => `series_rel_${createHash('sha256').update(`${type}\n${source}\n${target}`, 'utf8').digest('hex')}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function expectedTuples() {
  const tuples = [];
  for (const group of authority.reviewed_product_of_groups ?? []) {
    for (const [start, end] of group.product_ranges ?? []) {
      for (let product = start; product <= end; product += 1) {
        tuples.push(['product_of', productKey(`wlr_prod_${pad(product)}`), walletKey(`wlr_ent_${pad(group.wallet)}`)]);
      }
    }
  }
  const sequential = authority.reviewed_product_of_sequential_singletons ?? {};
  for (let product = sequential.product_start; product <= sequential.product_end; product += 1) {
    const wallet = sequential.wallet_start + product - sequential.product_start;
    tuples.push(['product_of', productKey(`wlr_prod_${pad(product)}`), walletKey(`wlr_ent_${pad(wallet)}`)]);
  }
  for (const [type, sourceId, targetId] of authority.reviewed_lineage_allowlist ?? []) {
    tuples.push([type, productKey(sourceId), productKey(targetId)]);
  }
  return tuples;
}

async function fetchJson(route) {
  const response = await fetch(`${origin}${route}`, {
    headers: { accept: 'application/json', 'cache-control': 'no-cache', 'user-agent': 'WLR-stage5-production-verifier/1.0' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`${route}: HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) throw new Error(`${route}: expected application/json, received ${contentType || 'missing'}`);
  return response.json();
}

async function verifyOnce() {
  if (authority.authority_id !== 'wlr-ledger-series-phase9-stage5-relationship-2026-08-21' || authority.accepted_count !== 161) throw new Error('unexpected WLR Stage 5 authority');
  const expected = expectedTuples();
  if (expected.length !== 161) throw new Error(`authority expansion must produce 161 tuples, found ${expected.length}`);
  const expectedSet = new Set(expected.map(([type, source, target]) => `${type}\n${source}\n${target}`));
  if (expectedSet.size !== 161) throw new Error('authority expansion contains duplicate tuples');

  const [descriptor, index, relationships] = await Promise.all([
    fetchJson('/data/series/registry.json'),
    fetchJson('/data/series/index.json'),
    fetchJson('/data/series/relationships.json'),
  ]);
  const errors = [];
  const fail = (message) => errors.push(message);
  if (descriptor?.registry?.id !== REGISTRY_ID) fail('descriptor registry id mismatch');
  if (descriptor?.record_counts?.relationships !== 161) fail(`descriptor relationship count must be 161, found ${descriptor?.record_counts?.relationships}`);
  if (descriptor?.routes?.relationships !== '/data/series/relationships.json') fail('descriptor relationship route mismatch');
  if (descriptor?.capabilities?.relationships !== 'adapter') fail('descriptor relationship capability mismatch');

  const rows = Array.isArray(index?.records) ? index.records : [];
  const rowsByKey = new Map(rows.map((row) => [row.global_record_key, row]));
  const indexKeys = new Set(rowsByKey.keys());
  if (indexKeys.size !== rows.length) fail('Series index contains duplicate global keys');
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
    if (relationship.series_schema_version !== '1.0.0' || relationship.object_type !== 'relationship_record') fail(`${label}: object contract mismatch`);
    if (relationship.relation_type === 'product_of') productOf += 1;
    else if (relationship.relation_type === 'predecessor_of') predecessor += 1;
    else if (relationship.relation_type === 'successor_of') successor += 1;
    else fail(`${label}: unauthorized relation type ${relationship.relation_type}`);
    if (relationship.direction !== 'directed') fail(`${label}: direction mismatch`);
    if (relationship.provenance?.basis !== 'native_reviewed_relationship') fail(`${label}: provenance basis mismatch`);
    if (!Array.isArray(relationship.provenance?.native_evidence_refs)) fail(`${label}: native_evidence_refs must be an array`);
    if (!indexKeys.has(source)) fail(`${label}: source endpoint missing from live Series index`);
    if (!indexKeys.has(target)) fail(`${label}: target endpoint missing from live Series index`);
    if (source === target) fail(`${label}: self-loop`);
    if (!expectedSet.has(tuple)) fail(`${label}: tuple outside reviewed authority`);
    if (actualSet.has(tuple)) fail(`${label}: duplicate tuple`);
    actualSet.add(tuple);
    const expectedId = relationshipId(relationship.relation_type, source, target);
    if (relationship.id !== expectedId) fail(`${label}: deterministic id mismatch`);
    if (ids.has(relationship.id)) fail(`${label}: duplicate relationship id`);
    ids.add(relationship.id);
    endpointKeys.add(source);
    endpointKeys.add(target);
  }
  if (productOf !== 149 || predecessor !== 6 || successor !== 6) fail(`type counts must be 149/6/6, found ${productOf}/${predecessor}/${successor}`);
  if (actualSet.size !== expectedSet.size || [...expectedSet].some((tuple) => !actualSet.has(tuple))) fail('live relationship set does not exactly equal reviewed authority');

  const endpointRows = [...endpointKeys].map((key) => [key, rowsByKey.get(key)]);
  for (const [key, row] of endpointRows) {
    if (!row) continue;
    const envelope = await fetchJson(new URL(row.machine_url).pathname);
    if (envelope.global_record_key !== key) fail(`${key}: live envelope global key mismatch`);
    if (!Array.isArray(envelope.relationships) || envelope.relationships.length !== 0) fail(`${key}: record-envelope relationships must remain empty`);
  }
  if (errors.length) throw new Error(errors.join('; '));
  return endpointKeys.size;
}

let lastError;
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    const endpoints = await verifyOnce();
    console.log(`WLR Stage 5 production verification passed on attempt ${attempt}: 161 relationships across ${endpoints} referenced endpoints.`);
    process.exit(0);
  } catch (error) {
    lastError = error;
  }
  if (attempt < attempts) await sleep(delayMs);
}
console.error(`WLR Stage 5 production verification failed: ${lastError?.message ?? 'unknown error'}`);
process.exit(1);
