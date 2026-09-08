import fs from 'node:fs';
const entities=JSON.parse(fs.readFileSync('data/entities.json','utf8'));
const products=JSON.parse(fs.readFileSync('data/products.json','utf8'));
const events=JSON.parse(fs.readFileSync('data/events.json','utf8'));
const evidence=JSON.parse(fs.readFileSync('data/evidence.json','utf8'));
const pbe=new Map();for(const p of products){if(!pbe.has(p.entity_id))pbe.set(p.entity_id,[]);pbe.get(p.entity_id).push(p)}
const ebe=new Map();for(const e of events){if(!ebe.has(e.entity_id))ebe.set(e.entity_id,[]);ebe.get(e.entity_id).push(e)}
const ec=new Map();for(const s of evidence)ec.set(s.entity_id,(ec.get(s.entity_id)||0)+1);
const rows=[];for(const entity of entities){const evs=ebe.get(entity.id)||[];if(evs.length!==1)continue;for(const p of pbe.get(entity.id)||[]){const ml=p.launch_date?0:1;const us=(p.support_status==null||p.support_status==='unknown')?1:0;const n=ec.get(entity.id)||0;rows.push({entity_id:entity.id,entity_name:entity.canonical_name,product_id:p.id,product_name:p.product_name,priority_score:ml*4+us*3+Math.max(0,4-n),evidence_count:n,missing_launch:ml,unknown_support:us,sole_event:{id:evs[0].id,event_date:evs[0].event_date,title:evs[0].title}})}}
rows.sort((a,b)=>b.priority_score-a.priority_score||a.evidence_count-b.evidence_count||a.entity_id.localeCompare(b.entity_id)||a.product_id.localeCompare(b.product_id));const selected=[];const seen=new Set();for(const r of rows){if(seen.has(r.entity_id))continue;seen.add(r.entity_id);selected.push(r);if(selected.length===10)break}
const out={generated_from_main_sha:'ae66fe9339ab941a1e028c0fc7e622003e7d1856',one_event_count:[...ebe.values()].filter(x=>x.length===1).length,selection_rule:'priority_score = missing_launch*4 + unknown_support*3 + max(0,4-evidence_count); then evidence_count asc, entity_id asc',selected};fs.mkdirSync('data-staging/coverage',{recursive:true});fs.writeFileSync('data-staging/coverage/coverage-recovery-wave-03-thin-history-10.json',`${JSON.stringify(out,null,2)}\n`);console.log(JSON.stringify(out,null,2));
