import fs from 'node:fs';

const candidate = JSON.parse(fs.readFileSync('data-staging/candidates/coverage-recovery-wave-03-thin-history-7.json', 'utf8'));
const entities = JSON.parse(fs.readFileSync('data/entities.json', 'utf8'));
const products = JSON.parse(fs.readFileSync('data/products.json', 'utf8'));
const events = JSON.parse(fs.readFileSync('data/events.json', 'utf8'));
const evidence = JSON.parse(fs.readFileSync('data/evidence.json', 'utf8'));

const targets = [
  ['wlr_ent_000096','Specter Desktop','wlr_prod_000145','Specter Desktop App'],
  ['wlr_ent_000030','TokenPocket','wlr_prod_000079','TokenPocket Mobile Wallet'],
  ['wlr_ent_000042','Cake Wallet','wlr_prod_000091','Cake Wallet'],
  ['wlr_ent_000044','Lace','wlr_prod_000093','Lace Wallet'],
  ['wlr_ent_000058','Ambire Wallet','wlr_prod_000107','Ambire Extension']
];

if (candidate.records.events.length !== 5 || candidate.records.evidence.length !== 5) {
  throw new Error('candidate must contain exactly 5 events and 5 evidence records');
}

for (const [entityId, entityName, productId, productName] of targets) {
  const entity = entities.find((x) => x.id === entityId);
  const product = products.find((x) => x.id === productId);
  if (!entity || entity.canonical_name !== entityName) throw new Error(`entity identity mismatch ${entityId}`);
  if (!product || product.entity_id !== entityId || product.product_name !== productName) throw new Error(`product identity mismatch ${productId}`);
  const canonicalEvents = events.filter((x) => x.entity_id === entityId);
  if (canonicalEvents.length !== 1) throw new Error(`one-event invariant failed ${entityId}: ${canonicalEvents.length}`);
}

const eventKeys = new Set(events.map((x) => `${x.entity_id}|${x.product_id ?? ''}|${x.event_date}|${x.title}`));
for (const row of candidate.records.events) {
  const key = `${row.entity_id}|${row.product_id ?? ''}|${row.event_date}|${row.title}`;
  if (eventKeys.has(key)) throw new Error(`duplicate event key ${key}`);
  eventKeys.add(key);
}

const urls = new Set(evidence.map((x) => x.url));
for (const row of candidate.records.evidence) {
  if (urls.has(row.url)) throw new Error(`duplicate evidence URL ${row.url}`);
  urls.add(row.url);
}

const maxSuffix = (rows, prefix) => rows.reduce((max, row) => {
  const n = Number(String(row.id).replace(prefix, ''));
  return Number.isFinite(n) ? Math.max(max, n) : max;
}, 0);

let nextEvent = maxSuffix(events, 'wlr_ev_') + 1;
let nextSource = maxSuffix(evidence, 'wlr_src_') + 1;
const eventIdMap = new Map();
const promotedEvents = candidate.records.events.map((row) => {
  const id = `wlr_ev_${String(nextEvent++).padStart(6, '0')}`;
  eventIdMap.set(row.id, id);
  return { ...row, id };
});
const promotedEvidence = candidate.records.evidence.map((row) => ({
  ...row,
  id: `wlr_src_${String(nextSource++).padStart(6, '0')}`,
  event_id: eventIdMap.get(row.event_id)
}));

fs.writeFileSync('data/events.json', `${JSON.stringify([...events, ...promotedEvents], null, 2)}\n`);
fs.writeFileSync('data/evidence.json', `${JSON.stringify([...evidence, ...promotedEvidence], null, 2)}\n`);
console.log(JSON.stringify({
  promoted_events: promotedEvents.map((x) => x.id),
  promoted_evidence: promotedEvidence.map((x) => x.id)
}, null, 2));
