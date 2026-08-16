import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const dataDir = resolve(root, 'data')
const publicDir = resolve(root, 'public')
const publicData = resolve(publicDir, 'data')
const walletDir = resolve(publicData, 'wallets')
const productDir = resolve(publicData, 'products')

const load = async (name) => JSON.parse(await readFile(resolve(dataDir, name), 'utf8'))
const stable = (rows) => [...rows].sort((a, b) => String(a.id).localeCompare(String(b.id)))
const json = (value) => JSON.stringify(value, null, 2) + '\n'
const uniqueById = (rows) => {
  const seen = new Set()
  return rows.filter((row) => {
    if (!row?.id || seen.has(row.id)) return false
    seen.add(row.id)
    return true
  })
}

const [entities, products, events, evidence] = await Promise.all(
  ['entities.json', 'products.json', 'events.json', 'evidence.json'].map(load),
)

await mkdir(publicData, { recursive: true })
await rm(walletDir, { recursive: true, force: true })
await rm(productDir, { recursive: true, force: true })
await mkdir(walletDir, { recursive: true })
await mkdir(productDir, { recursive: true })

const productsByEntity = new Map()
for (const product of products) {
  const rows = productsByEntity.get(product.entity_id) ?? []
  rows.push(product)
  productsByEntity.set(product.entity_id, rows)
}

const eventsByEntity = new Map()
for (const event of events) {
  const rows = eventsByEntity.get(event.entity_id) ?? []
  rows.push(event)
  eventsByEntity.set(event.entity_id, rows)
}

const evidenceByEntity = new Map()
for (const source of evidence) {
  const rows = evidenceByEntity.get(source.entity_id) ?? []
  rows.push(source)
  evidenceByEntity.set(source.entity_id, rows)
}

const walletIndex = []
for (const entity of stable(entities)) {
  const entityProducts = stable(productsByEntity.get(entity.id) ?? [])
  const entityEvents = stable(eventsByEntity.get(entity.id) ?? [])
  const entityEvidence = stable(evidenceByEntity.get(entity.id) ?? [])
  const record = {
    schema: 'wlr.wallet-record.v1',
    entity,
    products: entityProducts,
    events: entityEvents,
    evidence: entityEvidence,
  }
  const path = `/data/wallets/${entity.slug}.json`
  await writeFile(resolve(walletDir, `${entity.slug}.json`), json(record))
  walletIndex.push({ id: entity.id, slug: entity.slug, path })
}

const productIndex = []
for (const product of stable(products)) {
  const entity = entities.find((row) => row.id === product.entity_id)
  if (!entity) throw new Error(`product ${product.id} references missing entity ${product.entity_id}`)
  const linkedEvents = stable(
    events.filter(
      (event) =>
        event.product_id === product.id ||
        (Array.isArray(event.affected_product_ids) && event.affected_product_ids.includes(product.id)),
    ),
  )
  const linkedEventIds = new Set(linkedEvents.map((event) => event.id))
  const linkedEvidence = stable(
    uniqueById(
      evidence.filter(
        (source) =>
          source.product_id === product.id ||
          (Array.isArray(source.product_ids) && source.product_ids.includes(product.id)) ||
          (source.event_id && linkedEventIds.has(source.event_id)) ||
          (Array.isArray(source.event_ids) && source.event_ids.some((id) => linkedEventIds.has(id))),
      ),
    ),
  )
  const record = {
    schema: 'wlr.product-record.v1',
    entity: {
      id: entity.id,
      slug: entity.slug,
      canonical_name: entity.canonical_name,
      wallet_type: entity.wallet_type,
      status: entity.status,
    },
    product,
    events: linkedEvents,
    evidence: linkedEvidence,
  }
  const path = `/data/products/${product.slug}.json`
  await writeFile(resolve(productDir, `${product.slug}.json`), json(record))
  productIndex.push({ id: product.id, entity_id: product.entity_id, slug: product.slug, path })
}

await writeFile(resolve(publicData, 'wallet-index.json'), json(stable(walletIndex)))
await writeFile(resolve(publicData, 'product-index.json'), json(stable(productIndex)))

const verifiedDates = entities.map((x) => x.last_verified_at).filter(Boolean).sort()
const manifest = {
  project: 'Wallet Lifecycle Registry',
  short_name: 'WLR',
  data_safety: 'canonical_only',
  generated_from: 'reviewed canonical JSON',
  record_counts: {
    entities: entities.length,
    products: products.length,
    events: events.length,
    evidence: evidence.length,
    wallet_records: walletIndex.length,
    product_records: productIndex.length,
  },
  last_verified_at: verifiedDates.at(-1) ?? null,
  files: [
    '/data/entities.json',
    '/data/products.json',
    '/data/events.json',
    '/data/evidence.json',
    '/data/wallet-index.json',
    '/data/product-index.json',
    '/data/stats.json',
  ],
  deterministic_record_paths: {
    wallets: '/data/wallets/{entity-slug}.json',
    products: '/data/products/{product-slug}.json',
    stats: '/data/stats.json',
  },
}
await writeFile(resolve(publicData, 'manifest.json'), json(manifest))
await writeFile(
  resolve(publicDir, 'version.json'),
  json({ project: 'WLR', version: '0.1.0', schema_version: 'v3', last_verified_at: manifest.last_verified_at }),
)
await writeFile(
  resolve(publicDir, 'llms.txt'),
  `# Wallet Lifecycle Registry (WLR)\n\nHistorical registry of cryptocurrency wallets.\n\nCanonical data:\n- /data/entities.json\n- /data/products.json\n- /data/events.json\n- /data/evidence.json\n- /data/manifest.json\n\nDeterministic derived views:\n- /data/wallet-index.json\n- /data/product-index.json\n- /data/wallets/{entity-slug}.json\n- /data/products/{product-slug}.json\n- /data/stats.json\n\nWLR does not rank wallets or provide a security guarantee. Stats describe reviewed registry records and are not market-share, safety-score, or recommendation metrics.\n`,
)
await writeFile(
  resolve(publicDir, 'ai.txt'),
  `Wallet Lifecycle Registry (WLR) is a historical registry. Treat canonical JSON, deterministic per-wallet/product JSON, derived stats, and linked evidence as records, not recommendations. Incident counts are not safety scores. Absence of a recorded incident is not evidence that a wallet is safe. Stats describe reviewed WLR coverage, not wallet market share or vendor performance.\n`,
)
console.log('Built machine-readable layer', manifest.record_counts)
