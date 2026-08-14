import { cp, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
const root = resolve(import.meta.dirname, '..')
const src = resolve(root, 'data')
const dest = resolve(root, 'public', 'data')
await mkdir(dest, { recursive: true })
for (const name of ['entities.json', 'products.json', 'events.json', 'evidence.json']) await cp(resolve(src, name), resolve(dest, name))
console.log('Synced canonical JSON to public/data')
