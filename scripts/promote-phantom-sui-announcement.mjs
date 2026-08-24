import fs from 'node:fs';

const eventsPath = 'data/events.json';
const evidencePath = 'data/evidence.json';

const events = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));

const event = {
  id: 'wlr_ev_000155',
  entity_id: 'wlr_ent_000015',
  product_id: null,
  affected_product_ids: ['wlr_prod_000045', 'wlr_prod_000046'],
  event_type: 'deprecation_announced',
  event_date: '2026-08-24',
  event_date_basis: 'announcement',
  title: 'Phantom announced end of Sui support',
  description: 'Phantom announced that support for the Sui network will end on 2026-09-24 and told users to move to another Sui-compatible wallet or swap Sui assets into assets supported by Phantom before the transition date.',
  confidence: 'high',
  event_status_effect: 'none',
  is_major_event: true,
  notes: 'Announcement event only. Phantom and both affected products remain active. Do not treat Sui support as effectively removed until the 2026-09-24 transition is independently verified. User funds remain self-custodied on-chain; this is not a custody-loss or wallet-shutdown event.'
};

const sources = [
  {
    id: 'wlr_src_000384',
    entity_id: 'wlr_ent_000015',
    product_id: null,
    event_id: 'wlr_ev_000155',
    source_type: 'official_blog',
    title: 'Introducing Sui on Phantom',
    url: 'https://phantom.com/learn/blog/introducing-sui-on-phantom',
    publisher: 'Phantom',
    published_at: '2025-01-29',
    accessed_at: '2026-08-24',
    reliability: 'high',
    claim_scope: 'product',
    is_primary: true,
    notes: 'First-party history for the Sui integration: beta support began on 2025-01-29 and the page notes general availability for all users as of 2025-05-12. This source establishes the beginning of the capability being sunset.'
  },
  {
    id: 'wlr_src_000385',
    entity_id: 'wlr_ent_000015',
    product_id: null,
    event_id: 'wlr_ev_000155',
    source_type: 'news_article',
    title: 'Phantom drops Sui support with September 24 deadline for user migration',
    url: 'https://cryptobriefing.com/phantom-drops-sui-support-september-migration/',
    publisher: 'Crypto Briefing',
    published_at: '2026-08-23',
    accessed_at: '2026-08-24',
    reliability: 'medium',
    claim_scope: 'event',
    is_primary: false,
    notes: 'Secondary corroboration of Phantom’s official announcement, the 2026-09-24 transition date, migration options, fee waiver and continued user custody. The official @phantom announcement was independently reviewed from the supplied capture; this record does not substitute the secondary article for Phantom’s statement of policy.'
  }
];

if (events.some((row) => row.id === event.id)) {
  throw new Error(`${event.id} already exists in canonical events`);
}
for (const source of sources) {
  if (evidence.some((row) => row.id === source.id)) {
    throw new Error(`${source.id} already exists in canonical evidence`);
  }
}

const phantom = JSON.parse(fs.readFileSync('data/entities.json', 'utf8')).find((row) => row.id === 'wlr_ent_000015');
if (!phantom || phantom.slug !== 'phantom' || phantom.status !== 'active') {
  throw new Error('Phantom canonical entity boundary changed; abort promotion');
}
const products = JSON.parse(fs.readFileSync('data/products.json', 'utf8'));
for (const id of ['wlr_prod_000045', 'wlr_prod_000046']) {
  const product = products.find((row) => row.id === id);
  if (!product || product.entity_id !== 'wlr_ent_000015' || product.status !== 'active') {
    throw new Error(`Phantom product boundary changed for ${id}; abort promotion`);
  }
}

events.push(event);
evidence.push(...sources);
fs.writeFileSync(eventsPath, `${JSON.stringify(events, null, 2)}\n`);
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log('Promoted Phantom Sui support announcement: +1 event, +2 evidence');
