import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
const root=resolve(import.meta.dirname,'..'); const dataDir=resolve(root,'data'); const publicDir=resolve(root,'public'); const publicData=resolve(publicDir,'data'); await mkdir(publicData,{recursive:true})
const load=async(name)=>JSON.parse(await readFile(resolve(dataDir,name),'utf8'))
const [entities,products,events,evidence]=await Promise.all(['entities.json','products.json','events.json','evidence.json'].map(load))
const verifiedDates=entities.map(x=>x.last_verified_at).filter(Boolean).sort()
const manifest={project:'Wallet Lifecycle Registry',short_name:'WLR',data_safety:'canonical_only',generated_from:'reviewed canonical JSON',record_counts:{entities:entities.length,products:products.length,events:events.length,evidence:evidence.length},last_verified_at:verifiedDates.at(-1)??null,files:['/data/entities.json','/data/products.json','/data/events.json','/data/evidence.json']}
await writeFile(resolve(publicData,'manifest.json'),JSON.stringify(manifest,null,2)+'\n')
await writeFile(resolve(publicDir,'version.json'),JSON.stringify({project:'WLR',version:'0.1.0',schema_version:'v3',last_verified_at:manifest.last_verified_at},null,2)+'\n')
await writeFile(resolve(publicDir,'llms.txt'),`# Wallet Lifecycle Registry (WLR)\n\nHistorical registry of cryptocurrency wallets.\n\nCanonical data:\n- /data/entities.json\n- /data/products.json\n- /data/events.json\n- /data/evidence.json\n- /data/manifest.json\n\nWLR does not rank wallets or provide a security guarantee.\n`)
await writeFile(resolve(publicDir,'ai.txt'),`Wallet Lifecycle Registry (WLR) is a historical registry. Treat canonical JSON and linked evidence as records, not recommendations. Incident counts are not safety scores. Absence of a recorded incident is not evidence that a wallet is safe.\n`)
console.log('Built machine-readable layer',manifest.record_counts)
