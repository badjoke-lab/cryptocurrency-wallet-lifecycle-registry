import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const PUBLIC_DATA = resolve(ROOT, 'public/data');
const OUTPUT_ROOT = resolve(PUBLIC_DATA, 'series');
const RECORD_ROOT = resolve(OUTPUT_ROOT, 'records');
const SERIES_SCHEMA_VERSION = '1.0.0';
const ADAPTER_VERSION = '1.0.0';
const REGISTRY_ID = 'cryptocurrency-wallet-lifecycle-registry';
const ORIGIN = 'https://wlr.badjoke-lab.com';

const readJson = async (path) => JSON.parse(await readFile(resolve(ROOT, path), 'utf8'));
const stable = (value) => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
};
const writeJson = async (path, value) => writeFile(path, `${JSON.stringify(stable(value), null, 2)}\n`);

const manifest = await readJson('public/data/manifest.json');
const walletIndex = await readJson('public/data/wallet-index.json');
const productIndex = await readJson('public/data/product-index.json');

if (manifest.data_safety !== 'canonical_only') throw new Error('WLR native manifest must remain canonical_only');
if (walletIndex.length !== manifest.record_counts.wallet_records) throw new Error('wallet index count mismatch');
if (productIndex.length !== manifest.record_counts.product_records) throw new Error('product index count mismatch');

await rm(OUTPUT_ROOT, { recursive: true, force: true });
await mkdir(RECORD_ROOT, { recursive: true });

const rows = [];

for (const row of [...walletIndex].sort((a, b) => a.slug.localeCompare(b.slug))) {
  const dossier = await readJson(`public${row.path}`);
  if (dossier.schema !== 'wlr.wallet-record.v1' || dossier.entity?.id !== row.id || dossier.entity?.slug !== row.slug) {
    throw new Error(`${row.slug}: wallet dossier identity/schema mismatch`);
  }
  const entity = dossier.entity;
  const nativeRecordType = dossier.schema;
  const globalKey = `${REGISTRY_ID}:${nativeRecordType}:${entity.id}`;
  const seriesPath = `/data/series/records/wallet--${entity.slug}.json`;
  const humanUrl = `${ORIGIN}/wallet/${entity.slug}/`;
  const nativeMachineUrl = `${ORIGIN}${row.path}`;

  const envelope = {
    series_schema_version: SERIES_SCHEMA_VERSION,
    object_type: 'record_envelope',
    registry_id: REGISTRY_ID,
    global_record_key: globalKey,
    record_key: { native_record_type: nativeRecordType, native_record_id: entity.id, slug: entity.slug },
    urls: { human: humanUrl, machine: `${ORIGIN}${seriesPath}`, native_machine: nativeMachineUrl },
    identity: { name: entity.canonical_name, aliases: entity.aliases ?? [] },
    current_state: {
      status: entity.status ?? null,
      native: {
        status: entity.status ?? null,
        wallet_type: entity.wallet_type ?? null,
        custody_model: entity.custody_model ?? null,
        open_source_status: entity.open_source_status ?? null,
        current_vendor: entity.current_vendor ?? null,
        website_status: entity.website_status ?? null,
        confidence: entity.confidence ?? null,
        product_ids: (dossier.products ?? []).map((product) => product.id),
      },
    },
    events: { mode: 'inline', records: dossier.events ?? [] },
    evidence: { mode: 'inline', records: dossier.evidence ?? [] },
    relationships: [],
    verification: { last_verified_at: entity.last_verified_at ?? manifest.last_verified_at ?? null },
    provenance: {
      canonical_only: true,
      adapter: { id: 'series-adapter-cryptocurrency-wallet-lifecycle-registry', version: ADAPTER_VERSION },
      native_manifest: `${ORIGIN}/data/manifest.json`,
      native_record: nativeMachineUrl,
      relationship_boundary: 'wallet-to-product links are preserved as native product_ids but are not emitted as typed Series relationships during Stage 3',
    },
  };
  await writeJson(resolve(RECORD_ROOT, `wallet--${entity.slug}.json`), envelope);
  rows.push({
    global_record_key: globalKey,
    native_record_type: nativeRecordType,
    native_record_id: entity.id,
    slug: entity.slug,
    series_slug: `wallet--${entity.slug}`,
    name: entity.canonical_name,
    status: entity.status ?? null,
    human_url: humanUrl,
    machine_url: `${ORIGIN}${seriesPath}`,
    native_machine_url: nativeMachineUrl,
  });
}

for (const row of [...productIndex].sort((a, b) => a.slug.localeCompare(b.slug))) {
  const dossier = await readJson(`public${row.path}`);
  if (dossier.schema !== 'wlr.product-record.v1' || dossier.product?.id !== row.id || dossier.product?.slug !== row.slug) {
    throw new Error(`${row.slug}: product dossier identity/schema mismatch`);
  }
  const product = dossier.product;
  const parent = dossier.entity;
  const nativeRecordType = dossier.schema;
  const globalKey = `${REGISTRY_ID}:${nativeRecordType}:${product.id}`;
  const seriesPath = `/data/series/records/product--${product.slug}.json`;
  const humanUrl = `${ORIGIN}/wallet/${parent.slug}/`;
  const nativeMachineUrl = `${ORIGIN}${row.path}`;

  const envelope = {
    series_schema_version: SERIES_SCHEMA_VERSION,
    object_type: 'record_envelope',
    registry_id: REGISTRY_ID,
    global_record_key: globalKey,
    record_key: { native_record_type: nativeRecordType, native_record_id: product.id, slug: product.slug },
    urls: { human: humanUrl, machine: `${ORIGIN}${seriesPath}`, native_machine: nativeMachineUrl },
    identity: { name: product.canonical_name, aliases: product.aliases ?? [] },
    current_state: {
      status: product.status ?? null,
      native: {
        status: product.status ?? null,
        parent_entity: parent,
        launch_year: product.launch_year ?? null,
        product_type: product.product_type ?? null,
        support_status: product.support_status ?? null,
        sales_status: product.sales_status ?? null,
        predecessor_product_id: product.predecessor_product_id ?? null,
        successor_product_id: product.successor_product_id ?? null,
        confidence: product.confidence ?? null,
      },
    },
    events: { mode: 'inline', records: dossier.events ?? [] },
    evidence: { mode: 'inline', records: dossier.evidence ?? [] },
    relationships: [],
    verification: { last_verified_at: product.last_verified_at ?? manifest.last_verified_at ?? null },
    provenance: {
      canonical_only: true,
      adapter: { id: 'series-adapter-cryptocurrency-wallet-lifecycle-registry', version: ADAPTER_VERSION },
      native_manifest: `${ORIGIN}/data/manifest.json`,
      native_record: nativeMachineUrl,
      relationship_boundary: 'parent/predecessor/successor native IDs are preserved in current_state.native but are not typed Series relationships during Stage 3',
    },
  };
  await writeJson(resolve(RECORD_ROOT, `product--${product.slug}.json`), envelope);
  rows.push({
    global_record_key: globalKey,
    native_record_type: nativeRecordType,
    native_record_id: product.id,
    slug: product.slug,
    series_slug: `product--${product.slug}`,
    name: product.canonical_name,
    status: product.status ?? null,
    human_url: humanUrl,
    machine_url: `${ORIGIN}${seriesPath}`,
    native_machine_url: nativeMachineUrl,
  });
}

const descriptor = {
  series_schema_version: SERIES_SCHEMA_VERSION,
  object_type: 'registry_descriptor',
  registry: {
    id: REGISTRY_ID,
    native_project_id: REGISTRY_ID,
    name: 'Wallet Lifecycle Registry',
    type: 'cryptocurrency_wallet_lifecycle_registry',
    origin: ORIGIN,
    repository: 'https://github.com/badjoke-lab/cryptocurrency-wallet-lifecycle-registry',
  },
  canonical_only: true,
  native_contract: {
    schema_version: manifest.schema_version,
    version_url: `${ORIGIN}/version.json`,
    manifest_url: `${ORIGIN}/data/manifest.json`,
  },
  record_counts: {
    primary_records: manifest.record_counts.entities,
    native: manifest.record_counts,
  },
  record_types: [
    { series_record_type: 'wallet', native_record_type: 'wlr.wallet-record.v1', machine_template: '/data/series/records/wallet--{slug}.json' },
    { series_record_type: 'wallet_product', native_record_type: 'wlr.product-record.v1', machine_template: '/data/series/records/product--{slug}.json' },
  ],
  routes: {
    descriptor: '/data/series/registry.json',
    index: '/data/series/index.json',
    record_templates: ['/data/series/records/wallet--{slug}.json', '/data/series/records/product--{slug}.json'],
    search: '/explorer/',
    compare: '/compare/',
    stats: '/stats/',
  },
  capabilities: {
    record_json: true,
    events: 'inline',
    evidence: 'inline',
    relationships: 'adapter',
    search: true,
    compare: true,
    stats: true,
  },
  verification: { last_verified_at: manifest.last_verified_at ?? null },
  data_safety: {
    canonical_only: true,
    includes_unreviewed_candidates: false,
    includes_internal_monitoring: false,
    includes_private_notes: false,
    ai_generated_canonical_facts: false,
  },
};

const index = {
  series_schema_version: SERIES_SCHEMA_VERSION,
  object_type: 'record_index',
  registry_id: REGISTRY_ID,
  canonical_only: true,
  last_verified_at: manifest.last_verified_at ?? null,
  record_count: rows.length,
  record_counts: {
    wallets: walletIndex.length,
    products: productIndex.length,
  },
  records: rows.sort((a, b) => a.global_record_key.localeCompare(b.global_record_key)),
};

await writeJson(resolve(OUTPUT_ROOT, 'registry.json'), descriptor);
await writeJson(resolve(OUTPUT_ROOT, 'index.json'), index);
console.log(`Generated WLR Series adapter: ${walletIndex.length} wallet + ${productIndex.length} product envelopes`);
