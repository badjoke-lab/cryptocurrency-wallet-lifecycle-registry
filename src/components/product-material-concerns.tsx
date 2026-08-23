type ProductRecord = Record<string, unknown>
type EventRecord = Record<string, unknown>

function text(value: unknown) {
  return typeof value === 'string' ? value : ''
}

export default function ProductMaterialConcerns({product,events}:{product:ProductRecord;events:EventRecord[]}) {
  const concerns: Array<[string,string]> = []
  const custodyModel = text(product.custody_model)
  const keyModel = text(product.key_management_model)
  const recovery = text(product.recovery_model || product.recovery_method)
  const accountDependency = text(product.account_dependency)
  const thirdParty = text(product.third_party_custody_infrastructure || product.custody_infrastructure)
  const withdrawalDependency = text(product.withdrawal_dependency)
  const eventText = events.map((event)=>`${text(event.event_type)} ${text(event.title)} ${text(event.description)}`).join(' ').toLowerCase()

  concerns.push(['Custody model', custodyModel || 'Unknown / not explicit in the canonical product record'])
  concerns.push(['Key-management model', keyModel || 'Unknown / requires evidence review'])
  concerns.push(['Independent recovery', recovery || 'Unknown / requires evidence review'])
  if (accountDependency) concerns.push(['Account / service dependency', accountDependency])
  if (thirdParty) concerns.push(['Third-party custody infrastructure', thirdParty])
  if (withdrawalDependency) concerns.push(['Withdrawal dependency', withdrawalDependency])
  if (/withdraw|suspend|freeze|halt|comprom|breach|incident/.test(eventText)) concerns.push(['Material lifecycle / security events', 'Relevant event recorded in the canonical timeline'])

  return <section className="section" aria-labelledby="material-concerns-title">
    <div className="section-heading"><div><p className="kicker">Material concerns</p><h2 id="material-concerns-title">Custody and recovery assumptions</h2></div></div>
    <p className="muted">Active support, evidence verification, or product type is not a safety endorsement. Missing custody or recovery metadata is shown as unknown rather than inferred as self-custody.</p>
    <dl className="facts">{concerns.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
  </section>
}
