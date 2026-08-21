import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const REGISTRY_ID = 'cryptocurrency-wallet-lifecycle-registry';
const SERIES_SCHEMA_VERSION = '1.0.0';
const AUTHORITY_PATH = resolve(ROOT, 'config/ledger-series-phase9-stage5-relationship-authority.json');
const INDEX_PATH = resolve(ROOT, 'public/data/series/index.json');
const DESCRIPTOR_PATH = resolve(ROOT, 'public/data/series/registry.json');
const OUTPUT_PATH = resolve(ROOT, 'public/data/series/relationships.json');

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const stable = (value) => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
};
const writeJson = async (path, value) => writeFile(path, `${JSON.stringify(stable(value), null, 2)}\n`);
const pad = (value) => String(value).padStart(6, '0');
const productKey = (id) => `${REGISTRY_ID}:wlr.product-record.v1:${id}`;
const walletKey = (id) => `${REGISTRY_ID}:wlr.wallet-record.v1:${id}`;

function parseGlobalKey(globalKey) {
  const parts = String(globalKey).split(':');
  if (parts.length !== 3 || parts.some((part) => !part)) throw new Error(`Invalid Series global key: ${globalKey}`);
  return { registry_id: parts[0], native_record_type: parts[1], native_record_id: parts[2] };
}

function relationshipId(relationType, sourceGlobalKey, targetGlobalKey) {
  return `series_rel_${createHash('sha256')
    .update(`${relationType}\n${sourceGlobalKey}\n${targetGlobalKey}`, 'utf8')
    .digest('hex')}`;
}

function expandAuthority(authority) {
  const tuples = [];
  for (const group of authority.reviewed_product_of_groups ?? []) {
    const walletId = `wlr_ent_${pad(group.wallet)}`;
    for (const [start, end] of group.product_ranges ?? []) {
      for (let product = start; product <= end; product += 1) {
        tuples.push(['product_of', productKey(`wlr_prod_${pad(product)}`), walletKey(walletId)]);
      }
    }
  }

  const sequential = authority.reviewed_product_of_sequential_singletons ?? {};
  for (let product = sequential.product_start; product <= sequential.product_end; product += 1) {
    const wallet = sequential.wallet_start + (product - sequential.product_start);
    tuples.push(['product_of', productKey(`wlr_prod_${pad(product)}`), walletKey(`wlr_ent_${pad(wallet)}`)]);
  }

  for (const [relationType, sourceId, targetId] of authority.reviewed_lineage_allowlist ?? []) {
    tuples.push([relationType, productKey(sourceId), productKey(targetId)]);
  }
  return tuples;
}

const authority = await readJson(AUTHORITY_PATH);
const index = await readJson(INDEX_PATH);
const descriptor = await readJson(DESCRIPTOR_PATH);

if (authority.authority_id !== 'wlr-ledger-series-phase9-stage5-relationship-2026-08-21') throw new Error('Unexpected WLR Stage 5 authority');
if (authority.registry_id !== REGISTRY_ID || authority.accepted_count !== 161) throw new Error('WLR Stage 5 authority registry/count mismatch');
if (authority.accepted_counts_by_type?.product_of !== 149 || authority.accepted_counts_by_type?.predecessor_of !== 6 || authority.accepted_counts_by_type?.successor_of !== 6) throw new Error('WLR Stage 5 authority type-count mismatch');

const tuples = expandAuthority(authority);
if (tuples.length !== 161) throw new Error(`WLR Stage 5 expansion must produce 161 tuples, found ${tuples.length}`);
const tupleSet = new Set(tuples.map(([type, source, target]) => `${type}\n${source}\n${target}`));
if (tupleSet.size !== 161) throw new Error('WLR Stage 5 expansion contains duplicate tuples');

const availableKeys = new Set((index.records ?? []).map((row) => row.global_record_key));
const ids = new Set();
const relationships = tuples.map(([relationType, sourceGlobalKey, targetGlobalKey], position) => {
  if (!['product_of', 'predecessor_of', 'successor_of'].includes(relationType)) throw new Error(`Unauthorized WLR relation type at row ${position + 1}: ${relationType}`);
  if (!availableKeys.has(sourceGlobalKey) || !availableKeys.has(targetGlobalKey)) throw new Error(`WLR Stage 5 row ${position + 1} references a missing Stage 3 endpoint`);
  if (sourceGlobalKey === targetGlobalKey) throw new Error(`WLR Stage 5 row ${position + 1} is a self-loop`);
  const id = relationshipId(relationType, sourceGlobalKey, targetGlobalKey);
  if (ids.has(id)) throw new Error(`WLR Stage 5 relationship ID collision: ${id}`);
  ids.add(id);
  return {
    series_schema_version: SERIES_SCHEMA_VERSION,
    object_type: 'relationship_record',
    id,
    relation_type: relationType,
    source: parseGlobalKey(sourceGlobalKey),
    target: parseGlobalKey(targetGlobalKey),
    direction: 'directed',
    provenance: { basis: 'native_reviewed_relationship', native_evidence_refs: [] },
  };
});

descriptor.record_counts = { ...(descriptor.record_counts ?? {}), relationships: relationships.length };
descriptor.routes = { ...(descriptor.routes ?? {}), relationships: '/data/series/relationships.json' };
descriptor.capabilities = { ...(descriptor.capabilities ?? {}), relationships: 'adapter' };

await writeJson(DESCRIPTOR_PATH, descriptor);
await writeJson(OUTPUT_PATH, relationships);
console.log('Generated WLR Stage 5 relationships: 149 product_of + 6 predecessor_of + 6 successor_of.');
