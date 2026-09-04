import fs from 'node:fs';

const candidate = JSON.parse(fs.readFileSync('data-staging/candidates/coverage-recovery-wave-03-thin-history-6.json', 'utf8'));
const entities = JSON.parse(fs.readFileSync('data/entities.json', 'utf8'));
const products = JSON.parse(fs.readFileSync('data/products.json', 'utf8'));
const events = JSON.parse(fs.readFileSync('data/events.json', 'utf8'));
const evidence = JSON.parse(fs.readFileSync('data/evidence.json', 'utf8'));

const expected = [
  ['wlr_ent_000084', 'VESPR', 'wlr_prod_000133', 'VESPR Mobile'],
  ['wlr_ent_000085', 'Begin Wallet', 'wlr_prod_000134', 'Begin Wallet Mobile'],
  ['wlr_ent_000086', 'Glow', 'wlr_prod_000135', 'Glow Browser Extension'],
  ['wlr_ent_000097', 'Casa', 'wlr_prod_000146', 'Casa 3-Key Vault'],
  ['wlr_ent_000059', 'Ctrl Wallet', 'wlr_prod_000108', 'Ctrl Wallet Extension']
];

for (const [eid, ename, pid, pname] of expected) {
  const entity = entities.find((x) => x.id === eid);
  const product = products.find((x) => x.id === pid);
  if (!entity || entity.canonical_name !== ename) throw new Error(`entity identity mismatch ${eid}`);
  if (!product || product.product_name !== pname || product.entity_id !== eid) throw new Error(`product identity mismatch ${pid}`);
  const current = events.filter((x) => x.entity_id === eid);
  if (current.length !== 1) throw new Error(`fresh-main one-event invariant failed ${eid}: ${current.length}`);
}

if (candidate.records.events.length !== 5 || candidate.records.evidence.length !== 5) throw new Error('candidate must contain exactly 5 events and 5 evidence');

const eventKeys = new Set(events.map((x) => `${x.entity_id}|${x.product_id ?? ''}|${x.event_date}|${x.title}`));
for (const row of candidate.records.events) {
  const key = `${row.entity_id}|${row.product_id ?? ''}|${row.event_date}|${row.title}`;
  if (eventKeys.has(key)) throw new Error(`duplicate event ${key}`);
}

const urls = new Set(evidence.map((x) => x.url));
for (const row of candidate.records.evidence) {
  if (urls.has(row.url)) throw new Error(`duplicate evidence URL ${row.url}`);
}

const nextNum = (rows, prefix) => Math.max(...rows.map((x) => Number(x.id.replace(prefix, ''))).filter(Number.isFinite)) + 1;
let evNum = nextNum(events, 'wlr_ev_');
let srcNum = nextNum(evidence, 'wlr_src_');
const eventIdMap = new Map();
for (const row of candidate.records.events) {
  const id = `wlr_ev_${String(evNum++).padStart(6, '0')}`;
  eventIdMap.set(row.id, id);
  events.push({ ...row, id });
}
for (const row of candidate.records.evidence) {
  const event_id = eventIdMap.get(row.event_id);
  if (!event_id) throw new Error(`missing promoted event map for ${row.event_id}`);
  const id = `wlr_src_${String(srcNum++).padStart(6, '0')}`;
  evidence.push({ ...row, id, event_id });
}

fs.writeFileSync('data/events.json', `${JSON.stringify(events, null, 2)}\n`);
fs.writeFileSync('data/evidence.json', `${JSON.stringify(evidence, null, 2)}\n`);
console.log('Promoted event IDs:', [...eventIdMap.values()].join(', '));
console.log('Promoted evidence IDs:', evidence.slice(-5).map((x) => x.id).join(', '));
