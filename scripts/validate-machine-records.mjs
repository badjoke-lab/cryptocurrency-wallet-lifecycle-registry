import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const dataDir = resolve(root, 'data')
const publicData = resolve(root, 'public', 'data')
const load = async (path) => JSON.parse(await readFile(path, 'utf8'))
const canonical = async (name) => load(resolve(dataDir, name))

const [entities, products, events, evidence, walletIndex, productIndex, manifest] = await Promise.all([
  canonical('entities.json'),
  canonical('products.json'),
  canonical('events.json'),
  canonical('evidence.json'),
  load(resolve(publicData, 'wallet-index.json')),
  load(resolve(publicData, 'product-index.json')),
  load(resolve(publicData, 'manifest.json')),
])

const errors = []
const requireUnique = (rows, field, label) => {
  const seen = new Set()
  for (const row of rows) {
    const value = row[field]
    if (!value) errors.push(`${label}: missing ${field}`)
    else if (seen.has(value)) errors.push(`${label}: duplicate ${field} ${value}`)
    else seen.add(value)
  }
}

requireUnique(entities, 'slug', 'entities')
requireUnique(products, 'slug', 'products')
requireUnique(walletIndex, 'slug', 'wallet-index')
requireUnique(productIndex, 'slug', 'product-index')

if (walletIndex.length !== entities.length) errors.push(`wallet-index count ${walletIndex.length} != entities ${entities.length}`)
if (productIndex.length !== products.length) errors.push(`product-index count ${productIndex.length} != products ${products.length}`)
if (manifest.record_counts?.wallet_records !== entities.length) errors.push('manifest wallet_records count mismatch')
if (manifest.record_counts?.product_records !== products.length) errors.push('manifest product_records count mismatch')

const walletFiles = (await readdir(resolve(publicData, 'wallets'))).filter((name) => name.endsWith('.json')).sort()
const productFiles = (await readdir(resolve(publicData, 'products'))).filter((name) => name.endsWith('.json')).sort()
if (walletFiles.length !== entities.length) errors.push(`wallet file count ${walletFiles.length} != entities ${entities.length}`)
if (productFiles.length !== products.length) errors.push(`product file count ${productFiles.length} != products ${products.length}`)

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

for (const entity of entities) {
  const path = resolve(publicData, 'wallets', `${entity.slug}.json`)
  const record = await load(path)
  if (record.schema !== 'wlr.wallet-record.v1') errors.push(`${entity.slug}: wrong wallet schema`)
  if (record.entity?.id !== entity.id) errors.push(`${entity.slug}: entity mismatch`)
  const expectedProducts = products.filter((row) => row.entity_id === entity.id).map((row) => row.id).sort()
  const actualProducts = (record.products ?? []).map((row) => row.id).sort()
  if (JSON.stringify(actualProducts) !== JSON.stringify(expectedProducts)) errors.push(`${entity.slug}: product set mismatch`)
  const expectedEvents = (eventsByEntity.get(entity.id) ?? []).map((row) => row.id).sort()
  const actualEvents = (record.events ?? []).map((row) => row.id).sort()
  if (JSON.stringify(actualEvents) !== JSON.stringify(expectedEvents)) errors.push(`${entity.slug}: event set mismatch`)
  const expectedEvidence = (evidenceByEntity.get(entity.id) ?? []).map((row) => row.id).sort()
  const actualEvidence = (record.evidence ?? []).map((row) => row.id).sort()
  if (JSON.stringify(actualEvidence) !== JSON.stringify(expectedEvidence)) errors.push(`${entity.slug}: evidence set mismatch`)
}

for (const product of products) {
  const path = resolve(publicData, 'products', `${product.slug}.json`)
  const record = await load(path)
  if (record.schema !== 'wlr.product-record.v1') errors.push(`${product.slug}: wrong product schema`)
  if (record.product?.id !== product.id) errors.push(`${product.slug}: product mismatch`)
  if (record.entity?.id !== product.entity_id) errors.push(`${product.slug}: parent entity mismatch`)
  for (const event of record.events ?? []) {
    const linked = event.product_id === product.id || (event.affected_product_ids ?? []).includes(product.id)
    if (!linked) errors.push(`${product.slug}: unrelated event ${event.id}`)
  }
  const eventIds = new Set((record.events ?? []).map((row) => row.id))
  for (const source of record.evidence ?? []) {
    const linked =
      source.product_id === product.id ||
      (source.product_ids ?? []).includes(product.id) ||
      (source.event_id && eventIds.has(source.event_id)) ||
      (source.event_ids ?? []).some((id) => eventIds.has(id))
    if (!linked) errors.push(`${product.slug}: unrelated evidence ${source.id}`)
  }
}

if (errors.length) {
  console.error('FAIL deterministic machine records')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`PASS deterministic machine records wallets=${entities.length} products=${products.length}`)
