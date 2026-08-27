import fs from 'node:fs';

const candidateUrl = 'https://raw.githubusercontent.com/badjoke-lab/cryptocurrency-wallet-lifecycle-registry/research/coverage-recovery-wave-01b-part2/data-staging/candidates/coverage-recovery-wave-01b-part2.json';
const response = await fetch(candidateUrl);
if (!response.ok) throw new Error(`candidate fetch failed: ${response.status}`);
const bundle = await response.json();
const additions = bundle.records?.evidence ?? [];
if (additions.length !== 15) throw new Error(`expected 15 evidence rows, got ${additions.length}`);

const productsPath = 'data/products.json';
const evidencePath = 'data/evidence.json';
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));

const supported = new Set([
  'wlr_prod_000102','wlr_prod_000103','wlr_prod_000104','wlr_prod_000105','wlr_prod_000106',
  'wlr_prod_000109','wlr_prod_000110','wlr_prod_000112','wlr_prod_000113','wlr_prod_000115',
  'wlr_prod_000116','wlr_prod_000118'
]);
for (const p of products) {
  if (supported.has(p.id)) {
    p.support_status = 'supported';
    p.last_verified_at = '2026-08-26';
  }
}

const nums = evidence.map(e => Number(String(e.id).replace('wlr_src_', ''))).filter(Number.isFinite);
let next = (nums.length ? Math.max(...nums) : 0) + 1;
const existingIds = new Set(evidence.map(e => e.id));
for (const sourceRow of additions) {
  let id;
  do {
    id = `wlr_src_${String(next++).padStart(6, '0')}`;
  } while (existingIds.has(id));
  const row = { ...sourceRow, id };
  evidence.push(row);
  existingIds.add(id);
}

fs.writeFileSync(productsPath, JSON.stringify(products, null, 2) + '\n');
fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
