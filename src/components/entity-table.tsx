import type { WalletEntity } from '../lib/types'
import { eventsForEntity,isIncident,productsForEntity } from '../lib/data'
import { statusTone } from '../lib/ui'
import EntityTableClient, { type EntityTableRow } from './entity-table-client'

export default function EntityTable({ rows }: { rows: WalletEntity[] }) {
  const prepared: EntityTableRow[] = rows.map((entity) => {
    const productCount = productsForEntity(entity.id).length
    const incidentCount = eventsForEntity(entity.id).filter(isIncident).length
    return {
      id: entity.id,
      slug: entity.slug,
      name: entity.canonical_name,
      summary: entity.summary,
      searchText: [entity.canonical_name, ...(entity.aliases ?? []), entity.developer_or_company, entity.country_or_origin, entity.wallet_type, entity.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
      walletType: entity.wallet_type,
      status: entity.status,
      statusTone: statusTone(entity.status),
      productCount,
      incidentCount,
      origin: entity.country_or_origin ?? '—',
      verified: entity.last_verified_at,
    }
  })
  return <EntityTableClient rows={prepared} />
}
