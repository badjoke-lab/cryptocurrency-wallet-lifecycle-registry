import fs from 'node:fs';
const candidate=JSON.parse(fs.readFileSync('data-staging/candidates/coverage-recovery-wave-03-thin-history-10.json','utf8'));
const entities=JSON.parse(fs.readFileSync('data/entities.json','utf8'));
const products=JSON.parse(fs.readFileSync('data/products.json','utf8'));
const events=JSON.parse(fs.readFileSync('data/events.json','utf8'));
const evidence=JSON.parse(fs.readFileSync('data/evidence.json','utf8'));
const targets=[
 ['wlr_ent_000046','Bitget Wallet','wlr_prod_000095','Bitget Wallet Mobile'],
 ['wlr_ent_000049','Phoenix Wallet','wlr_prod_000098','Phoenix Wallet'],
 ['wlr_ent_000051','Brave Wallet','wlr_prod_000100','Brave Wallet Browser'],
 ['wlr_ent_000052','Crypto.com Onchain','wlr_prod_000101','Crypto.com Onchain Extension'],
 ['wlr_ent_000053','Binance Wallet','wlr_prod_000102','Binance Wallet Mobile']
];
if(candidate.records.events.length!==5||candidate.records.evidence.length!==5)throw new Error('candidate must contain exactly 5 events and 5 evidence records');
for(const [eid,en,pid,pn] of targets){const e=entities.find(x=>x.id===eid);const p=products.find(x=>x.id===pid);if(!e||e.canonical_name!==en)throw new Error(`entity identity mismatch ${eid}`);if(!p||p.entity_id!==eid||p.product_name!==pn)throw new Error(`product identity mismatch ${pid}`);const evs=events.filter(x=>x.entity_id===eid);if(evs.length!==1)throw new Error(`one-event invariant failed ${eid}: ${evs.length}`)}
const eventKeys=new Set(events.map(x=>`${x.entity_id}|${x.product_id??''}|${x.event_date}|${x.title}`));for(const row of candidate.records.events){const k=`${row.entity_id}|${row.product_id??''}|${row.event_date}|${row.title}`;if(eventKeys.has(k))throw new Error(`duplicate event key ${k}`);eventKeys.add(k)}
const urls=new Set(evidence.map(x=>x.url));for(const row of candidate.records.evidence){if(urls.has(row.url))throw new Error(`duplicate evidence URL ${row.url}`);urls.add(row.url)}
const maxSuffix=(rows,prefix)=>rows.reduce((m,r)=>{const n=Number(String(r.id).replace(prefix,''));return Number.isFinite(n)?Math.max(m,n):m},0);let ne=maxSuffix(events,'wlr_ev_')+1,ns=maxSuffix(evidence,'wlr_src_')+1;const map=new Map();const pe=candidate.records.events.map(r=>{const id=`wlr_ev_${String(ne++).padStart(6,'0')}`;map.set(r.id,id);return {...r,id}});const ps=candidate.records.evidence.map(r=>({...r,id:`wlr_src_${String(ns++).padStart(6,'0')}`,event_id:map.get(r.event_id)}));
fs.writeFileSync('data/events.json',`${JSON.stringify([...events,...pe],null,2)}\n`);fs.writeFileSync('data/evidence.json',`${JSON.stringify([...evidence,...ps],null,2)}\n`);console.log(JSON.stringify({promoted_events:pe.map(x=>x.id),promoted_evidence:ps.map(x=>x.id)},null,2));
