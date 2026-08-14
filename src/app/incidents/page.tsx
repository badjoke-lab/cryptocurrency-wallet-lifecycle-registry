import Timeline from '../../components/timeline'
import { events,isIncident } from '../../lib/data'
export const metadata={title:'Incidents'}
export default function IncidentsPage(){const rows=events.filter(isIncident).sort((a,b)=>b.event_date.localeCompare(a.event_date));return <section className="page"><p className="eyebrow">Evidence-backed timeline</p><h1>Wallet incidents</h1><p className="lede">Security events are historical facts, not a risk score. An incident count does not measure whether a wallet is safe today.</p><Timeline rows={rows}/></section>}
