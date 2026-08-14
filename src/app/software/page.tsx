import EntityTable from '../../components/entity-table'
import { entities } from '../../lib/data'
export const metadata={title:'Software wallets'}
export default function SoftwarePage(){const rows=entities.filter(x=>['software','smart_contract','mpc_threshold'].includes(x.wallet_type));return <section className="page"><p className="eyebrow">Registry view</p><h1>Software wallets</h1><p className="lede">Software, smart-contract, and MPC wallets tracked as historical products rather than recommendation scores.</p><EntityTable rows={rows}/></section>}
