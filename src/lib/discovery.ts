import discoveryPolicy from '../../config/structured-discovery.json'
import type { WalletEntity, WalletEvent, WalletProduct } from './types'

export const DISCOVERY_MISSING_CUSTODY = '__not_recorded__'

const remediationEventTypes = new Set<string>(discoveryPolicy.remediation_event_types)
const eolEventTypes = new Set<string>(discoveryPolicy.eol_event_types)
const eolEntityStatuses = new Set<string>(discoveryPolicy.eol_entity_statuses)
const eolProductStatuses = new Set<string>(discoveryPolicy.eol_product_statuses)

export const discoveryLabels = discoveryPolicy.labels

export type WalletDiscoveryFacts = {
  custodyModel: string
  incidentRecorded: boolean
  remediationRecorded: boolean
  eolRecorded: boolean
  launchYear: number | null
}

export function launchYearFromCanonicalDate(value?: string | null): number | null {
  if (!value) return null
  const match = /^(\d{4})(?:-|$)/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  return Number.isInteger(year) ? year : null
}

export function deriveWalletDiscoveryFacts(
  entity: WalletEntity,
  entityProducts: WalletProduct[],
  entityEvents: WalletEvent[],
  incidentRecorded: boolean,
): WalletDiscoveryFacts {
  const custodyModel = entity.custody_model?.trim() || DISCOVERY_MISSING_CUSTODY
  const remediationRecorded = entityEvents.some((event) => remediationEventTypes.has(event.event_type))
  const eolRecorded =
    eolEntityStatuses.has(entity.status) ||
    entityProducts.some((product) =>
      eolProductStatuses.has(product.status) || Boolean(product.discontinued_date) || Boolean(product.sales_end_date),
    ) ||
    entityEvents.some((event) => eolEventTypes.has(event.event_type))

  return {
    custodyModel,
    incidentRecorded,
    remediationRecorded,
    eolRecorded,
    launchYear: launchYearFromCanonicalDate(entity.launch_date),
  }
}

export function formatDiscoveryValue(value: string): string {
  if (value === DISCOVERY_MISSING_CUSTODY) return discoveryLabels.custody_missing
  return value.replaceAll('_', ' ')
}
