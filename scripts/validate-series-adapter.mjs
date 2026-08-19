import { existsSync, readFileSync, readdirSync } from 'node:fs';

const readJson = (path) => {
  if (!existsSync(path)) throw new Error(`${path}: missing`);
  return JSON.parse(readFileSync(path, 'utf8'));
};
const stable = (value) => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
};
const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));

const manifest = readJson('public/data/manifest.json');
const walletIndex = readJson('public/data/wallet-index.json');
const productIndex = readJson('public/data/product-index.json');
const descriptor = readJson('public/data/series/registry.json');
const index = readJson('public/data/series/index.json');
const errors = [];
const fail = (message) => errors.push(message);

if (descriptor.series_schema_version !== '1.0.0') fail('Series schema mismatch');
if (descriptor.registry?.id !== 'cryptocurrency-wallet-lifecycle-registry') fail('registry ID mismatch');
if (descriptor.registry?.origin !== 'https://wlr.badjoke-lab.com') fail('registry origin mismatch');
if (descriptor.canonical_only !== true) fail('descriptor canonical boundary mismatch');
if (descriptor.record_counts?.primary_records !== manifest.record_counts.entities) fail('primary wallet count mismatch');
if (descriptor.record_counts?.native?.products !== manifest.record_counts.products) fail('native product count mismatch');
if (descriptor.capabilities?.relationships !== 'adapter') fail('relationship capability mismatch');
if ('build_commit' in (descriptor.verification ?? {})) fail('adapter must not invent a WLR build commit');
if (descriptor.verification?.last_verified_at !== manifest.last_verified_at) fail('last_verified_at mismatch');

const expectedCount = walletIndex.length + productIndex.length;
if (index.record_count !== expectedCount) fail(`Series record count mismatch: ${index.record_count} != ${expectedCount}`);
if (index.record_counts?.wallets !== walletIndex.length) fail('wallet record count mismatch');
if (index.record_counts?.products !== productIndex.length) fail('product record count mismatch');

const keys = new Set();
for (const row of index.records ?? []) {
  if (keys.has(row.global_record_key)) fail(`duplicate global key: ${row.global_record_key}`);
  keys.add(row.global_record_key);

  if (row.native_record_type === 'wlr.wallet-record.v1') {
    const nativeRow = walletIndex.find((item) => item.id === row.native_record_id && item.slug === row.slug);
    if (!nativeRow) { fail(`${row.series_slug}: native wallet row missing`); continue; }
    const dossier = readJson(`public${nativeRow.path}`);
    const envelope = readJson(`public/data/series/records/${row.series_slug}.json`);
    const expectedKey = `cryptocurrency-wallet-lifecycle-registry:wlr.wallet-record.v1:${nativeRow.id}`;
    if (row.global_record_key !== expectedKey || envelope.global_record_key !== expectedKey) fail(`${row.series_slug}: wallet global key mismatch`);
    if (envelope.record_key?.native_record_id !== dossier.entity?.id) fail(`${row.series_slug}: wallet native ID mismatch`);
    if (envelope.current_state?.status !== dossier.entity?.status) fail(`${row.series_slug}: wallet status mismatch`);
    if (!same(envelope.events?.records ?? [], dossier.events ?? [])) fail(`${row.series_slug}: wallet events mismatch`);
    if (!same(envelope.evidence?.records ?? [], dossier.evidence ?? [])) fail(`${row.series_slug}: wallet evidence mismatch`);
    if (!same(envelope.current_state?.native?.product_ids ?? [], (dossier.products ?? []).map((product) => product.id))) fail(`${row.series_slug}: wallet product IDs mismatch`);
    if ((envelope.relationships ?? []).length !== 0) fail(`${row.series_slug}: wallet typed relationships emitted during Stage 3`);
  } else if (row.native_record_type === 'wlr.product-record.v1') {
    const nativeRow = productIndex.find((item) => item.id === row.native_record_id && item.slug === row.slug);
    if (!nativeRow) { fail(`${row.series_slug}: native product row missing`); continue; }
    const dossier = readJson(`public${nativeRow.path}`);
    const envelope = readJson(`public/data/series/records/${row.series_slug}.json`);
    const expectedKey = `cryptocurrency-wallet-lifecycle-registry:wlr.product-record.v1:${nativeRow.id}`;
    if (row.global_record_key !== expectedKey || envelope.global_record_key !== expectedKey) fail(`${row.series_slug}: product global key mismatch`);
    if (envelope.record_key?.native_record_id !== dossier.product?.id) fail(`${row.series_slug}: product native ID mismatch`);
    if (envelope.current_state?.status !== dossier.product?.status) fail(`${row.series_slug}: product status mismatch`);
    if (envelope.current_state?.native?.parent_entity?.id !== dossier.entity?.id) fail(`${row.series_slug}: parent entity mismatch`);
    if (!same(envelope.events?.records ?? [], dossier.events ?? [])) fail(`${row.series_slug}: product events mismatch`);
    if (!same(envelope.evidence?.records ?? [], dossier.evidence ?? [])) fail(`${row.series_slug}: product evidence mismatch`);
    if ((envelope.relationships ?? []).length !== 0) fail(`${row.series_slug}: product typed relationships emitted during Stage 3`);
  } else {
    fail(`${row.series_slug}: unexpected native record type ${row.native_record_type}`);
  }
}

const expectedFiles = expectedCount + 2;
const actualFiles = readdirSync('public/data/series/records').filter((name) => name.endsWith('.json')).length + 2;
if (actualFiles !== expectedFiles) fail(`Series file-set mismatch: ${actualFiles} != ${expectedFiles}`);

if (errors.length) {
  console.error(`WLR Series adapter validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`WLR Series adapter validation passed: ${walletIndex.length} wallets + ${productIndex.length} products`);
