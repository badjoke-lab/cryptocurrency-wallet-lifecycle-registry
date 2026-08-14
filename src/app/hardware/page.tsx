import EntityTable from '../../components/entity-table'
import { entities } from '../../lib/data'
export const metadata={title:'Hardware wallets'}
export default function HardwarePage(){const rows=entities.filter(x=>x.wallet_type==='hardware'||x.wallet_type==='hybrid');return <section className="page"><p className="eyebrow">Registry view</p><h1>Hardware wallets</h1><p className="lede">Hardware-first and hybrid wallet systems, with product lineages, support state, incidents, and evidence.</p><EntityTable rows={rows}/></section>}
