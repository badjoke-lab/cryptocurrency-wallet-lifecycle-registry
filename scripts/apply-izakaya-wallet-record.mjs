import fs from 'node:fs';

const read=(p)=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const nextId=(rows,prefix)=>{const max=Math.max(0,...rows.map(r=>Number(String(r.id||'').replace(prefix,''))).filter(Number.isFinite));return `${prefix}${String(max+1).padStart(6,'0')}`};

const entities=read('data/entities.json');
const products=read('data/products.json');
const events=read('data/events.json');
const evidence=read('data/evidence.json');
if(entities.some(x=>x.slug==='izaka-ya-wallet')){console.log('IZAKA-YA Wallet already present; no-op');process.exit(0)}

const entityId=nextId(entities,'wlr_ent_');
const productId=nextId(products,'wlr_prod_');
const eventId=nextId(events,'wlr_ev_');
const src1=nextId(evidence,'wlr_src_');
const src2=`wlr_src_${String(Number(src1.slice(-6))+1).padStart(6,'0')}`;
const src3=`wlr_src_${String(Number(src1.slice(-6))+2).padStart(6,'0')}`;

entities.push({
  id:entityId,slug:'izaka-ya-wallet',canonical_name:'IZAKA-YA Wallet',aliases:['IZAKA-YA'],wallet_type:'mpc_threshold',status:'active',
  summary:'Cloud wallet operated by Izakaya Limited and integrated with Fireblocks MPC infrastructure. Reviewed sources establish provider-operated custody infrastructure but do not establish that a user can independently recover or control the final signing key without the service.',
  developer_or_company:'Izakaya Limited',country_or_origin:'Hong Kong',launch_date:'2023-12',launch_date_precision:'month',official_url:'https://izakaya.tech/ja/wallet/',official_domain:'izakaya.tech',custody_model:'custodial',
  key_management_model:'Fireblocks MPC-CMP / distributed key-share infrastructure; final user-versus-provider control boundary is not independently established by reviewed sources.',
  system_components:[
    {component_type:'cloud_wallet',controlled_by:'provider',role:'account, deposit, withdrawal, transfer, swap and lending service surface',custody_note:'Service is presented as a cloud wallet.'},
    {component_type:'mpc_key_management',controlled_by:'shared',role:'Fireblocks MPC-CMP key-share infrastructure',custody_note:'Reviewed operator/vendor sources describe MPC custody infrastructure; independent user recovery is not established.'}
  ],confidence:'medium',last_verified_at:'2026-08-23',notes:'Canonical inclusion is not a safety endorsement. Custody classification reflects provider-operated cloud/custody language; independent recovery remains a material known unknown.'
});
products.push({
  id:productId,entity_id:entityId,slug:'izaka-ya-wallet-app',product_name:'IZAKA-YA Wallet',aliases:['IZAKA-YA cloud wallet'],product_type:'mpc_wallet',status:'active',sales_status:'not_applicable',support_status:'supported',launch_date:'2023-12',launch_date_precision:'month',platform:['web'],summary:'Provider-operated cloud wallet using Fireblocks MPC infrastructure with deposits, withdrawals, transfers, swaps and integrated lending.',custody_model:'custodial',key_management_model:'Fireblocks MPC-CMP; independent user recovery not established',confidence:'medium',last_verified_at:'2026-08-23',official_url:'https://izakaya.tech/ja/wallet/',notes:'Do not infer independent self-custody from MPC terminology. The reviewed record does not establish a user-controlled seed or service-independent recovery path.'
});
events.push({
  id:eventId,entity_id:entityId,product_id:productId,event_type:'launched',event_date:'2023-12',event_date_basis:'announcement',title:'IZAKA-YA service launch period',description:'Izakaya Limited states that the IZAKA-YA wallet service began in December 2023. Current service materials describe a cloud wallet using Fireblocks MPC infrastructure.',confidence:'medium',impact_level:'medium',security_scope:'cloud_service',funds_affected:'unknown',event_status_effect:'active',is_major_event:true,notes:'Month precision follows the operator company profile; no day is inferred.'
});
evidence.push(
  {id:src1,entity_id:entityId,product_id:productId,event_id:eventId,source_type:'official_statement',title:'会社概要 | IZAKA-YA',url:'https://izakaya.tech/about/',publisher:'Izakaya Limited',published_at:null,accessed_at:'2026-08-23',reliability:'high',claim_scope:'launch_date',is_primary:true,notes:'Operator states Izakaya Limited, Hong Kong address, and service start in December 2023.'},
  {id:src2,entity_id:entityId,product_id:productId,source_type:'official_statement',title:'IZAKA-YA | 仮想通貨レンディングウォレット',url:'https://izakaya.tech/ja/wallet/',publisher:'Izakaya Limited',published_at:null,accessed_at:'2026-08-23',reliability:'high',claim_scope:'architecture',is_primary:true,notes:'Operator describes cloud wallet, Fireblocks MPC-CMP, deposits, withdrawals, transfers, swaps and lending.'},
  {id:src3,entity_id:entityId,product_id:productId,source_type:'other',title:'IZAKA-YA customer story',url:'https://www.fireblocks.com/customers/izakaya/',publisher:'Fireblocks',published_at:null,accessed_at:'2026-08-23',reliability:'medium',claim_scope:'architecture',is_primary:false,notes:'Vendor customer story corroborates embedded Fireblocks custody/management infrastructure. Vendor marketing is not independent proof of overall wallet safety.'}
);
write('data/entities.json',entities);write('data/products.json',products);write('data/events.json',events);write('data/evidence.json',evidence);
console.log({entityId,productId,eventId,evidence:[src1,src2,src3]});
