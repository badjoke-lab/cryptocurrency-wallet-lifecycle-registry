const records=[
  {href:'https://cya.badjoke-lab.com/platform/izaka-ya/',name:'Crypto Yield Archive — IZAKA-YA',note:'Lending / yield platform record for the IZAKA-YA service.'},
  {href:'https://www.stableorgone.com/stablecoin/jpyr/',name:'Stable or Gone — JPYR',note:'Stable-asset record for JPYR and its reviewed backing / redemption uncertainty.'},
  {href:'https://hei.badjoke-lab.com/exchange/izaka-ya/',name:'Historical Exchange Index — IZAKA-YA',note:'Exchange / hybrid-service record for IZAKA-YA.'},
]
export default function IzakayaRelatedRegistryRecords(){return <section className="section"><div className="section-heading"><div><p className="kicker">Ledger Series</p><h2>Related registry records</h2></div></div><p className="muted">These are separate public records concerning the same IZAKA-YA / JPYR product ecosystem. The links do not assert common legal ownership, issuer status, custody, or safety.</p><div className="product-grid">{records.map(record=><a className="product-card" href={record.href} target="_blank" rel="noreferrer" key={record.href}><strong>{record.name}</strong><p>{record.note}</p></a>)}</div></section>}
