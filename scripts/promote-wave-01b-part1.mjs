import fs from 'node:fs';

const productsPath = 'data/products.json';
const evidencePath = 'data/evidence.json';
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));

const targets = new Set([
  'wlr_prod_000094',
  'wlr_prod_000095',
  'wlr_prod_000098',
  'wlr_prod_000100',
  'wlr_prod_000101'
]);
for (const p of products) {
  if (targets.has(p.id)) {
    p.support_status = 'supported';
    p.last_verified_at = '2026-08-26';
  }
}

const additions = [
  {
    id: 'wlr_src_000398', entity_id: 'wlr_ent_000045', product_id: 'wlr_prod_000094', event_id: null,
    source_type: 'official_statement', title: 'Ronin Wallet', url: 'https://wallet.roninchain.com/', publisher: 'Ronin',
    published_at: null, accessed_at: '2026-08-26', reliability: 'high', claim_scope: 'support_status', is_primary: true,
    notes: 'Current first-party wallet surface distributes the Ronin Wallet extension and mobile app; current Ronin support documentation also covers browser-extension setup and updating. Supports active maintenance of the extension product, but does not establish an initial launch date.'
  },
  {
    id: 'wlr_src_000399', entity_id: 'wlr_ent_000046', product_id: 'wlr_prod_000095', event_id: null,
    source_type: 'official_statement', title: 'Download Bitget Wallet', url: 'https://web3.bitget.com/wallet-download', publisher: 'Bitget Wallet',
    published_at: null, accessed_at: '2026-08-26', reliability: 'high', claim_scope: 'support_status', is_primary: true,
    notes: 'Current first-party download surface distributes Bitget Wallet through Google Play, App Store and Android APK, supporting an actively maintained mobile product. No exact initial mobile launch date is inferred from this source.'
  },
  {
    id: 'wlr_src_000400', entity_id: 'wlr_ent_000049', product_id: 'wlr_prod_000098', event_id: null,
    source_type: 'official_statement', title: 'Phoenix Wallet', url: 'https://phoenix.acinq.co/', publisher: 'ACINQ',
    published_at: null, accessed_at: '2026-08-26', reliability: 'high', claim_scope: 'support_status', is_primary: true,
    notes: 'Current first-party Phoenix site presents the non-custodial Lightning wallet and active support/source-code links, supporting a currently maintained product state. This source is not used to infer a launch date.'
  },
  {
    id: 'wlr_src_000401', entity_id: 'wlr_ent_000051', product_id: 'wlr_prod_000100', event_id: null,
    source_type: 'official_statement', title: 'Brave Wallet', url: 'https://brave.com/wallet/', publisher: 'Brave',
    published_at: null, accessed_at: '2026-08-26', reliability: 'high', claim_scope: 'support_status', is_primary: true,
    notes: 'Current first-party Brave Wallet page documents the built-in browser wallet, desktop/mobile availability and continuing compatibility improvements, supporting active maintenance. Initial release date remains unresolved in this bundle.'
  },
  {
    id: 'wlr_src_000402', entity_id: 'wlr_ent_000052', product_id: 'wlr_prod_000101', event_id: null,
    source_type: 'official_statement', title: 'Crypto.com Onchain', url: 'https://help.crypto.com/en/collections/2221157-crypto-com-onchain', publisher: 'Crypto.com',
    published_at: null, accessed_at: '2026-08-26', reliability: 'high', claim_scope: 'support_status', is_primary: true,
    notes: 'Current first-party help collection contains active Crypto.com Onchain Extension setup, import, swap and wallet-management documentation; Crypto.com also published a revamped extension in 2025. Supports active maintenance, without inferring the original extension launch date.'
  }
];

const existing = new Set(evidence.map(e => e.id));
for (const row of additions) if (!existing.has(row.id)) evidence.push(row);

fs.writeFileSync(productsPath, JSON.stringify(products, null, 2) + '\n');
fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
