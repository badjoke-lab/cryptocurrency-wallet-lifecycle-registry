import discoveryPolicy from '../../config/structured-discovery.json'
import rawEntities from '../../data/entities.json'
import rawEvents from '../../data/events.json'
import rawEvidence from '../../data/evidence.json'
import rawProducts from '../../data/products.json'
import type { WalletEntity, WalletEvent, WalletEvidence, WalletProduct } from './types'

export const entities = rawEntities as WalletEntity[]
export const products = rawProducts as WalletProduct[]
export const events = rawEvents as WalletEvent[]
export const evidence = rawEvidence as WalletEvidence[]

export const byEntityId = new Map(entities.map((entity) => [entity.id, entity]))
export const byProductId = new Map(products.map((product) => [product.id, product]))

export const entityBySlug = (slug: string) => entities.find((entity) => entity.slug === slug)
export const productBySlug = (slug: string) => products.find((product) => product.slug === slug)
export const productsForEntity = (id: string) => products.filter((product) => product.entity_id === id)
export const eventsForEntity = (id: string) =>
  events.filter((event) => event.entity_id === id).sort((a, b) => a.event_date.localeCompare(b.event_date))
export const eventsForProduct = (id: string) =>
  events
    .filter((event) => event.product_id === id || event.affected_product_ids?.includes(id))
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
export const evidenceForEntity = (id: string) => evidence.filter((row) => row.entity_id === id)
export const evidenceForProduct = (id: string) =>
  evidence.filter((row) => row.product_id === id || row.product_ids?.includes(id))
export const evidenceForEvent = (id: string) =>
  evidence.filter((row) => row.event_id === id || row.event_ids?.includes(id))

const incidentEventTypes = new Set<string>(discoveryPolicy.incident_event_types)

export function isIncident(event: WalletEvent) {
  return incidentEventTypes.has(event.event_type)
}
