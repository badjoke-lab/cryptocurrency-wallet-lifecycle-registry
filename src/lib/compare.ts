import discoveryPolicy from '../../config/structured-discovery.json'
import {
  byEntityId,
  byProductId,
  entities,
  evidenceForEvent,
  eventsForEntity,
  isIncident,
  productsForEntity,
} from './data'
import type { FixedVersion, VersionRule, WalletEntity, WalletEvent, WalletEvidence, WalletProduct } from './types'

const remediationTypes = new Set<string>(discoveryPolicy.remediation_event_types)
const eolTypes = new Set<string>(discoveryPolicy.eol_event_types)
const migrationTypes = new Set<string>([
  'key_migration_recommended',
  'network_migration_announced',
  'network_migration',
  'recall',
])

export const COMPARE_MAX_WALLETS = 4

export type CompareEvidence = {
  id: string
  title: string
  url: string
  publisher: string
  reliability: string
  isPrimary: boolean
}

export type CompareVersionRule = {
  products: string[]
  track: string
  value: string
}

export type CompareEvent = {
  id: string
  date: string
  dateBasis: string | null
  type: string
  title: string
  description: string
  confidence: string
  impactLevel: string | null
  securityScope: string | null
  fundsAffected: string | null
  products: string[]
  affectedVersions: string[]
  affectedVersionRules: CompareVersionRule[]
  fixedVersions: CompareVersionRule[]
  cveIds: string[]
  userActions: string[]
  evidence: CompareEvidence[]
}

export type CompareProduct = {
  id: string
  slug: string
  name: string
  type: string
  status: string
  supportStatus: string | null
  salesStatus: string | null
  custodyModel: string | null
  keyManagementModel: string | null
  launchDate: string | null
  launchDatePrecision: string | null
  salesEndDate: string | null
  discontinuedDate: string | null
  predecessor: string | null
  successor: string | null
  supportCommitment: Array<{ key: string; value: string }>
  confidence: string
  lastVerified: string
}

export type CompareWallet = {
  id: string
  slug: string
  name: string
  walletType: string
  custodyModel: string | null
  keyManagementModel: string | null
  developer: string | null
  origin: string | null
  launchDate: string | null
  launchDatePrecision: string | null
  discontinuedDate: string | null
  status: string
  predecessor: string | null
  successor: string | null
  confidence: string
  lastVerified: string
  products: CompareProduct[]
  incidents: CompareEvent[]
  remediations: CompareEvent[]
  eolEvents: CompareEvent[]
  migrationEvents: CompareEvent[]
  severityCounts: Record<'low' | 'medium' | 'high' | 'critical', number>
}

function entityName(id?: string | null) {
  if (!id) return null
  return byEntityId.get(id)?.canonical_name ?? null
}

function productName(id?: string | null) {
  if (!id) return null
  return byProductId.get(id)?.product_name ?? null
}

function formatCommitment(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

function evidenceView(row: WalletEvidence): CompareEvidence {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    publisher: row.publisher,
    reliability: row.reliability,
    isPrimary: Boolean(row.is_primary),
  }
}

function productReferences(event: WalletEvent) {
  const ids = new Set<string>()
  if (event.product_id) ids.add(event.product_id)
  for (const id of event.affected_product_ids ?? []) ids.add(id)
  for (const rule of event.affected_version_rules ?? []) {
    for (const id of rule.product_ids ?? []) ids.add(id)
  }
  for (const fixed of event.fixed_versions ?? []) {
    for (const id of fixed.product_ids ?? []) ids.add(id)
  }
  return [...ids].map(productName).filter((name): name is string => Boolean(name)).sort()
}

function versionRuleView(rule: VersionRule): CompareVersionRule {
  return {
    products: (rule.product_ids ?? []).map(productName).filter((name): name is string => Boolean(name)).sort(),
    track: rule.track,
    value: rule.range,
  }
}

function fixedVersionView(row: FixedVersion): CompareVersionRule {
  return {
    products: (row.product_ids ?? []).map(productName).filter((name): name is string => Boolean(name)).sort(),
    track: row.track,
    value: row.version,
  }
}

function eventView(event: WalletEvent): CompareEvent {
  return {
    id: event.id,
    date: event.event_date,
    dateBasis: event.event_date_basis ?? null,
    type: event.event_type,
    title: event.title,
    description: event.description,
    confidence: event.confidence,
    impactLevel: event.impact_level ?? null,
    securityScope: event.security_scope ?? null,
    fundsAffected: event.funds_affected ?? null,
    products: productReferences(event),
    affectedVersions: event.affected_versions ?? [],
    affectedVersionRules: (event.affected_version_rules ?? []).map(versionRuleView),
    fixedVersions: (event.fixed_versions ?? []).map(fixedVersionView),
    cveIds: event.cve_ids ?? [],
    userActions: event.user_actions_required ?? [],
    evidence: evidenceForEvent(event.id).map(evidenceView),
  }
}

function productView(product: WalletProduct): CompareProduct {
  const commitment = Object.entries(product.support_commitment ?? {})
    .map(([key, value]) => ({ key, value: formatCommitment(value) }))
    .filter((row) => row.value.length > 0)
    .sort((a, b) => a.key.localeCompare(b.key))

  return {
    id: product.id,
    slug: product.slug,
    name: product.product_name,
    type: product.product_type,
    status: product.status,
    supportStatus: product.support_status ?? null,
    salesStatus: product.sales_status ?? null,
    custodyModel: product.custody_model ?? null,
    keyManagementModel: product.key_management_model ?? null,
    launchDate: product.launch_date ?? null,
    launchDatePrecision: product.launch_date_precision ?? null,
    salesEndDate: product.sales_end_date ?? null,
    discontinuedDate: product.discontinued_date ?? null,
    predecessor: productName(product.predecessor_product_id),
    successor: productName(product.successor_product_id),
    supportCommitment: commitment,
    confidence: product.confidence,
    lastVerified: product.last_verified_at,
  }
}

export function deriveCompareWallet(entity: WalletEntity): CompareWallet {
  const entityEvents = eventsForEntity(entity.id)
  const incidentEvents = entityEvents.filter(isIncident)
  const remediations = entityEvents.filter((event) => remediationTypes.has(event.event_type))
  const eolEvents = entityEvents.filter((event) => eolTypes.has(event.event_type))
  const migrationEvents = entityEvents.filter((event) => migrationTypes.has(event.event_type))
  const severityCounts = { low: 0, medium: 0, high: 0, critical: 0 }

  for (const event of incidentEvents) {
    if (event.impact_level && event.impact_level in severityCounts) {
      severityCounts[event.impact_level as keyof typeof severityCounts] += 1
    }
  }

  return {
    id: entity.id,
    slug: entity.slug,
    name: entity.canonical_name,
    walletType: entity.wallet_type,
    custodyModel: entity.custody_model ?? null,
    keyManagementModel: entity.key_management_model ?? null,
    developer: entity.developer_or_company ?? null,
    origin: entity.country_or_origin ?? null,
    launchDate: entity.launch_date ?? null,
    launchDatePrecision: entity.launch_date_precision ?? null,
    discontinuedDate: entity.discontinued_date ?? null,
    status: entity.status,
    predecessor: entityName(entity.predecessor_entity_id),
    successor: entityName(entity.successor_entity_id),
    confidence: entity.confidence,
    lastVerified: entity.last_verified_at,
    products: productsForEntity(entity.id).map(productView).sort((a, b) => a.name.localeCompare(b.name)),
    incidents: incidentEvents.map(eventView).sort((a, b) => a.date.localeCompare(b.date)),
    remediations: remediations.map(eventView).sort((a, b) => a.date.localeCompare(b.date)),
    eolEvents: eolEvents.map(eventView).sort((a, b) => a.date.localeCompare(b.date)),
    migrationEvents: migrationEvents.map(eventView).sort((a, b) => a.date.localeCompare(b.date)),
    severityCounts,
  }
}

export const compareWallets = entities.map(deriveCompareWallet).sort((a, b) => a.name.localeCompare(b.name))

export function normalizeCompareSelection(slugs: string[]) {
  const known = new Set(compareWallets.map((wallet) => wallet.slug))
  const selected: string[] = []
  const invalid: string[] = []
  const seen = new Set<string>()

  for (const slug of slugs) {
    if (seen.has(slug)) continue
    seen.add(slug)
    if (!known.has(slug)) {
      invalid.push(slug)
      continue
    }
    if (selected.length < COMPARE_MAX_WALLETS) selected.push(slug)
  }

  return { selected, invalid }
}
