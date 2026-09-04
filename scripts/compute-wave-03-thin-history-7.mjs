import fs from 'node:fs';

const entities = JSON.parse(fs.readFileSync('data/entities.json', 'utf8'));
const products = JSON.parse(fs.readFileSync('data/products.json', 'utf8'));
const events = JSON.parse(fs.readFileSync('data/events.json', 'utf8'));
const evidence = JSON.parse(fs.readFileSync('data/evidence.json', 'utf8'));

const productsByEntity = new Map();
for (const p of products) {
  if (!productsByEntity.has(p.entity_id)) productsByEntity.set(p.entity_id, []);
  productsByEntity.get(p.entity_id).push(p);
}
const eventsByEntity = new Map();
for (const e of events) {
  if (!eventsByEntity.has(e.entity_id)) eventsByEntity.set(e.entity_id, []);
  eventsByEntity.get(e.entity_id).push(e);
}
const evidenceCount = new Map();
for (const s of evidence) evidenceCount.set(s.entity_id, (evidenceCount.get(s.entity_id) || 0) + 1);

const rows = [];
for (const entity of entities) {
  const evs = eventsByEntity.get(entity.id) || [];
  if (evs.length !== 1) continue;
  const ps = productsByEntity.get(entity.id) || [];
  for (const p of ps) {
    const missingLaunch = p.launch_date ? 0 : 1;
    const unknownSupport = (p.support_status == null || p.support_status === 'unknown') ? 1 : 0;
    const evCount = evidenceCount.get(entity.id) || 0;
    const priorityScore = missingLaunch * 4 + unknownSupport * 3 + Math.max(0, 4 - evCount);
    rows.push({
      entity_id: entity.id,
      entity_name: entity.canonical_name,
      product_id: p.id,
      product_name: p.product_name,
      priority_score: priorityScore,
      evidence_count: evCount,
      missing_launch: missingLaunch,
      unknown_support: unknownSupport,
      sole_event: { id: evs[0].id, event_date: evs[0].event_date, title: evs[0].title }
    });
  }
}
rows.sort((a,b) => b.priority_score - a.priority_score || a.evidence_count - b.evidence_count || a.entity_id.localeCompare(b.entity_id) || a.product_id.localeCompare(b.product_id));
const selected = [];
const seen = new Set();
for (const row of rows) {
  if (seen.has(row.entity_id)) continue;
  seen.add(row.entity_id);
  selected.push(row);
  if (selected.length === 10) break;
}
const out = {
  generated_from_main_sha: 'c88e6d0aee4d8f1a02f423150cecdc55b0ae482d',
  one_event_count: [...eventsByEntity.values()].filter((x) => x.length === 1).length,
  selection_rule: 'priority_score = missing_launch*4 + unknown_support*3 + max(0,4-evidence_count); then evidence_count asc, entity_id asc',
  selected
};
fs.mkdirSync('data-staging/coverage', { recursive: true });
fs.writeFileSync('data-staging/coverage/coverage-recovery-wave-03-thin-history-7.json', `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
