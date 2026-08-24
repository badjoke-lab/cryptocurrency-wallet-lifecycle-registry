import json
from pathlib import Path

root=Path('.')
products_path=root/'data/products.json'
events_path=root/'data/events.json'
evidence_path=root/'data/evidence.json'

products=json.loads(products_path.read_text())
events=json.loads(events_path.read_text())
evidence=json.loads(evidence_path.read_text())

# Guard expected fresh-main tails.
assert not any(e['id'] in {'wlr_ev_000156','wlr_ev_000157'} for e in events)
for i in range(386,398):
    assert not any(x['id']==f'wlr_src_{i:06d}' for x in evidence)

prod_by_id={p['id']:p for p in products}
# Strong current-maintenance/support evidence found in Wave 01A.
for pid in ['wlr_prod_000082','wlr_prod_000083','wlr_prod_000084','wlr_prod_000086','wlr_prod_000087','wlr_prod_000089']:
    prod_by_id[pid]['support_status']='supported'
    prod_by_id[pid]['last_verified_at']='2026-08-25'
# Launch corrections backed by first-party sources.
prod_by_id['wlr_prod_000083']['launch_date']='2014'
prod_by_id['wlr_prod_000083']['launch_date_precision']='year'
prod_by_id['wlr_prod_000084']['launch_date']='2023-11-06'
prod_by_id['wlr_prod_000084']['launch_date_precision']='day'

new_events=[
 {"id":"wlr_ev_000156","entity_id":"wlr_ent_000034","product_id":"wlr_prod_000083","affected_product_ids":["wlr_prod_000083"],"event_type":"product_released","event_date":"2014","event_date_basis":"release","title":"Coinomi wallet launched","description":"Coinomi's first-party company history states that Coinomi was launched in 2014.","confidence":"high","event_status_effect":"active","is_major_event":True,"notes":"Year precision only. The reviewed first-party history does not establish a defensible exact release day for the current wallet lineage."},
 {"id":"wlr_ev_000157","entity_id":"wlr_ent_000035","product_id":"wlr_prod_000084","affected_product_ids":["wlr_prod_000084"],"event_type":"product_released","event_date":"2023-11-06","event_date_basis":"release","title":"ELLIPAL Titan 2.0 introduced","description":"ELLIPAL's first-party release article introduced the Titan 2.0 on 2023-11-06.","confidence":"high","event_status_effect":"active","is_major_event":True,"notes":"Day precision follows the dated first-party product-release article."}
]

events.extend(new_events)

sources=[
('000386','wlr_ent_000014','wlr_prod_000075',None,'official_blog','Tangem Annual Report 2025','https://tangem.com/en-GB/annual-report/','Tangem',None,'product','First-party product timeline documents Tangem Wallet v1 in 2022, v2 in 2023, and continued app-feature development through 2025. Useful for companion-app lineage/support review; does not by itself prove an exact Tangem App launch date.'),
('000387','wlr_ent_000033','wlr_prod_000082',None,'official_statement','Get Guarda for any device','https://guarda.com/download/','Guarda',None,'support_status','Current first-party download page distributes Guarda for iOS, Android, macOS, Windows and Linux and publishes current desktop release checksums, supporting an active maintained product state.'),
('000388','wlr_ent_000034','wlr_prod_000083','wlr_ev_000156','official_statement','About us','https://www.coinomi.com/en/about/','Coinomi',None,'launch_date','Coinomi first-party company history states that Coinomi was launched in 2014.'),
('000389','wlr_ent_000034','wlr_prod_000083',None,'official_statement','Download Coinomi','https://www.coinomi.com/en/downloads/','Coinomi',None,'support_status','Current first-party page distributes current Android/iOS builds and desktop binaries and describes an ongoing desktop update, supporting current maintenance.'),
('000390','wlr_ent_000035','wlr_prod_000084','wlr_ev_000157','official_blog','ELLIPAL Titan 2.0: Elevating Cold Wallet Security and Accessibility','https://www.ellipal.com/blogs/news/ellipal-titan-2-0-redefining-cryptocurrency-cold-wallet-security','ELLIPAL','2023-11-06','launch_date','First-party dated product introduction for Titan 2.0.'),
('000391','wlr_ent_000035','wlr_prod_000084',None,'official_blog','How to Send and Receive Your Coins/Tokens with ELLIPAL Titan 2.0','https://www.ellipal.com/blogs/support/ellipal-titan-send-receive-crypto-securely','ELLIPAL','2024-09-28','support_status','First-party support guide for Titan 2.0 operation and setup, supporting continued product support.'),
('000392','wlr_ent_000037','wlr_prod_000086',None,'release_notes','OneKey Pro Firmware Update Log','https://help.onekey.so/en/articles/11461394-onekey-pro-firmware-update-log','OneKey',None,'support_status','Official continuously maintained OneKey Pro firmware log includes 2026 releases through v4.21.0, directly supporting current maintenance.'),
('000393','wlr_ent_000038','wlr_prod_000087',None,'official_blog',"Buy a D'CENT Wallet and Get Up to $10 in Crypto",'https://store.dcentwallet.com/blogs/post/dcent-reward-program',"D'CENT",'2026-03-18','support_status',"Current first-party 2026 program requires purchase and activation of the D'CENT Biometric Wallet through the current D'CENT App, supporting active product operation."),
('000394','wlr_ent_000040','wlr_prod_000089',None,'release_notes','NGRAVE ZERO Firmware Update','https://ngrave.io/firmware-upgrade','NGRAVE',None,'support_status','Official firmware-update surface and release notes for NGRAVE ZERO establish an active maintained firmware/support path.'),
('000395','wlr_ent_000039','wlr_prod_000088',None,'official_statement','CoolWallet official product site','https://www.coolwallet.io/','CoolBitX / CoolWallet',None,'product','Current first-party product surface retained for bounded support/launch research; formal support classification still requires stronger maintenance evidence before promotion.'),
('000396','wlr_ent_000041','wlr_prod_000090',None,'official_statement','Nunchuk official wallet site','https://nunchuk.io/','Nunchuk',None,'product','Current first-party product surface retained for bounded launch/support research; no exact launch or formal support claim is promoted from this source alone.'),
('000397','wlr_ent_000043','wlr_prod_000092',None,'official_statement','Keplr official wallet site','https://www.keplr.app/','Keplr',None,'product','Current first-party product surface retained for bounded launch/support research; no exact launch or formal support claim is promoted from this source alone.')]
for sid,eid,pid,event_id,stype,title,url,publisher,published,scope,notes in sources:
    evidence.append({"id":f"wlr_src_{sid}","entity_id":eid,"product_id":pid,"event_id":event_id,"source_type":stype,"title":title,"url":url,"publisher":publisher,"published_at":published,"accessed_at":"2026-08-25","reliability":"high","claim_scope":scope,"is_primary":True,"notes":notes})

products_path.write_text(json.dumps(products,ensure_ascii=False,indent=2)+'\n')
events_path.write_text(json.dumps(events,ensure_ascii=False,indent=2)+'\n')
evidence_path.write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n')
print('Wave 01A canonical applied:', len(products), len(events), len(evidence))
