import type { WalletEntity } from '../lib/types'
import { eventsForEntity, isIncident, productsForEntity } from '../lib/data'
import { deriveWalletDiscoveryFacts } from '../lib/discovery'
import { statusTone } from '../lib/ui'
import EntityTableClient, { type EntityTableRow } from './entity-table-client'

export default function EntityTable({ rows }: { rows: WalletEntity[] }) {
  const prepared: EntityTableRow[] = rows.map((entity) => {
    const entityProducts = productsForEntity(entity.id)
    const entityEvents = eventsForEntity(entity.id)
    const incidentCount = entityEvents.filter(isIncident).length
    const discovery = deriveWalletDiscoveryFacts(entity, entityProducts, entityEvents, incidentCount > 0)

    const productSearch = entityProducts.flatMap((product) => [
      product.product_name,
      ...(product.aliases ?? []),
      product.product_type,
      product.status,
    ])
    const eventSearch = entityEvents.flatMap((event) => [event.title, event.event_type])

    return {
      id: entity.id,
      slug: entity.slug,
      name: entity.canonical_name,
      summary: entity.summary,
      searchText: [
        entity.canonical_name,
        ...(entity.aliases ?? []),
        entity.developer_or_company,
        entity.country_or_origin,
        entity.wallet_type,
        entity.custody_model,
        entity.status,
        ...productSearch,
        ...eventSearch,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
      walletType: entity.wallet_type,
      custodyModel: discovery.custodyModel,
      status: entity.status,
      statusTone: statusTone(entity.status),
      productCount: entityProducts.length,
      incidentCount,
      incidentRecorded: discovery.incidentRecorded,
      remediationRecorded: discovery.remediationRecorded,
      eolRecorded: discovery.eolRecorded,
      launchYear: discovery.launchYear,
      origin: entity.country_or_origin ?? '—',
      verified: entity.last_verified_at,
    }
  })

  return <EntityTableClient rows={prepared} />
}
