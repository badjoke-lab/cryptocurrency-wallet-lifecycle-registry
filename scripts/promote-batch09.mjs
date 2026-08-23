import fs from 'node:fs';

const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const write = (p, v) => fs.writeFileSync(p, JSON.stringify(v) + '\n');

const products = read('data/products.json');
const events = read('data/events.json');
const evidence = read('data/evidence.json');

const productUpdates = {
  wlr_prod_000076: { launch_date: '2020-03', launch_date_precision: 'month', last_verified_at: '2026-08-23' },
  wlr_prod_000078: { launch_date: '2016-11-11', launch_date_precision: 'day', last_verified_at: '2026-08-23' }
};
for (const product of products) {
  if (productUpdates[product.id]) Object.assign(product, productUpdates[product.id]);
}

const newEvents = [
  {id:'wlr_ev_000151',entity_id:'wlr_ent_000027',product_id:'wlr_prod_000076',affected_product_ids:['wlr_prod_000076'],event_type:'product_released',event_date:'2020-03',event_date_basis:'release',title:'Full-fledged MEW wallet mobile app released',description:"MyEtherWallet's first-party ten-year retrospective states that its full-fledged MEW wallet app was released in March 2020 after the earlier MEWconnect signer-app lineage.",confidence:'high',event_status_effect:'active',is_major_event:true,notes:'Month precision only. The reviewed first-party retrospective establishes March 2020 but not one defensible exact release day. Canonical product wlr_prod_000076 is corrected from unresolved launch_date to 2020-03 with month precision. This is the full-fledged MEW wallet app, not the earlier MEWconnect signer app.'},
  {id:'wlr_ev_000152',entity_id:'wlr_ent_000029',product_id:'wlr_prod_000078',affected_product_ids:['wlr_prod_000078'],event_type:'product_released',event_date:'2016-11-11',event_date_basis:'release',title:'imToken version 1.0 released',description:"imToken's first-party milestone history states that after the project was established on 2016-05-02, imToken version 1.0 was released on 2016-11-11.",confidence:'high',event_status_effect:'active',is_major_event:true,notes:'This is the selected app release milestone and is intentionally distinct from the entity founding date. Canonical product wlr_prod_000078 is corrected from unresolved launch_date to 2016-11-11 with day precision. Existing 2018 imToken 2.0 Beta incident history remains separate.'},
  {id:'wlr_ev_000153',entity_id:'wlr_ent_000031',product_id:'wlr_prod_000080',affected_product_ids:['wlr_prod_000080'],event_type:'product_released',event_date:'2020',event_date_basis:'release',title:'Solflare Web App and Extension launched in 2020',description:"Solflare's first-party documentation states that the Web App and Extension were the first products built by the team in late 2020 and establishes the browser-extension product lineage during that year.",confidence:'high',event_status_effect:'active',is_major_event:true,notes:'Year precision only. The reviewed first-party documentation does not establish one defensible exact public-release month or day, so the existing 2020 launch_date and year precision remain unchanged.'}
];
for (const e of newEvents) if (!events.some(x => x.id === e.id)) events.push(e);

const newEvidence = [
  {id:'wlr_src_000378',entity_id:'wlr_ent_000027',product_id:'wlr_prod_000076',event_id:'wlr_ev_000151',source_type:'official_blog',title:'10 Years of MyEtherWallet: Evolving with Ethereum',url:'https://www.myetherwallet.com/blog/10-years-of-myetherwallet-evolving-with-ethereum/',publisher:'MyEtherWallet',published_at:null,accessed_at:'2026-08-23',reliability:'high',claim_scope:'launch_date',is_primary:true,notes:'First-party MEW retrospective states that the full-fledged MEW wallet app was released in March 2020 and distinguishes it from the earlier MEWconnect signer app. Used at month precision only.'},
  {id:'wlr_src_000379',entity_id:'wlr_ent_000029',product_id:'wlr_prod_000078',event_id:'wlr_ev_000152',source_type:'official_statement',title:'Progress Update | 2023/06/14',url:'https://support.token.im/hc/en-us/articles/19621187921177-Progress-Update-2023-06-14',publisher:'imToken',published_at:null,accessed_at:'2026-08-23',reliability:'high',claim_scope:'launch_date',is_primary:true,notes:'First-party imToken milestone history states the project was established on 2016-05-02 and version 1.0 was released on 2016-11-11. Used for the app release event and canonical launch-date correction.'},
  {id:'wlr_src_000380',entity_id:'wlr_ent_000031',product_id:'wlr_prod_000080',event_id:'wlr_ev_000153',source_type:'official_statement',title:'Web App & Extension | Solflare Wallet',url:'https://docs.solflare.com/solflare/onboarding/web-app-and-extension',publisher:'Solflare',published_at:null,accessed_at:'2026-08-23',reliability:'high',claim_scope:'launch_date',is_primary:true,notes:'First-party Solflare documentation states the Web App and Extension were the first products built by the team in late 2020. Used at year precision only.'}
];
for (const s of newEvidence) if (!evidence.some(x => x.id === s.id)) evidence.push(s);

write('data/products.json', products);
write('data/events.json', events);
write('data/evidence.json', evidence);
