import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { buildStats } from './lib/stats-data.mjs'

const root = resolve(import.meta.dirname, '..')
const dataDir = resolve(root, 'data')
const publicData = resolve(root, 'public', 'data')
const configDir = resolve(root, 'config')
const load = async (file) => JSON.parse(await readFile(file, 'utf8'))
const json = (value) => JSON.stringify(value, null, 2) + '\n'

const [entities, products, events, evidence, policy] = await Promise.all([
  load(resolve(dataDir, 'entities.json')),
  load(resolve(dataDir, 'products.json')),
  load(resolve(dataDir, 'events.json')),
  load(resolve(dataDir, 'evidence.json')),
  load(resolve(configDir, 'structured-discovery.json')),
])

const stats = buildStats({ entities, products, events, evidence, policy })
await mkdir(publicData, { recursive: true })
await writeFile(resolve(publicData, 'stats.json'), json(stats))
console.log('Built deterministic stats', stats.registry)
