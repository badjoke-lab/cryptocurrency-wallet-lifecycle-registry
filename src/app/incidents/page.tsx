import type { Metadata } from 'next'
import IncidentExplorer, { type IncidentExplorerRow } from '../../components/incident-explorer'
import { byEntityId,byProductId,evidenceForEvent,events,isIncident } from '../../lib/data'
import { impactTone } from '../../lib/ui'

export const metadata: Metadata = {
  title: 'Cryptocurrency wallet security incidents',
  description: 'Evidence-backed history of cryptocurrency wallet vulnerabilities, exploits, supply-chain incidents, data breaches, affected products, fixes, and user actions.',
  alternates: { canonical: '/incidents/' },
}

export default function IncidentsPage() {
  const rows: IncidentExplorerRow[] = events
    .filter(isIncident)
    .sort((a,b)=>b.event_date.localeCompare(a.event_date))
    .map((event) => {
      const entity = byEntityId.get(event.entity_id)!
      const product = event.product_id ? byProductId.get(event.product_id) ?? null : null
      return {
        id: event.id,
        eventDate: event.event_date,
        eventType: event.event_type,
        title: event.title,
        description: event.description,
        impactLevel: event.impact_level ?? null,
        impactTone: impactTone(event.impact_level),
        securityScope: event.security_scope ?? null,
        fundsAffected: event.funds_affected ?? null,
        userActions: event.user_actions_required ?? [],
        evidenceCount: evidenceForEvent(event.id).length,
        entityName: entity.canonical_name,
        entitySlug: entity.slug,
        productName: product?.product_name ?? null,
        productSlug: product?.slug ?? null,
        searchText: [entity.canonical_name, ...(entity.aliases ?? []), product?.product_name, event.title, event.description, event.event_type, event.security_scope, event.third_party_name, ...(event.affected_data ?? [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
      }
    })

  return <section className="page"><p className="eyebrow">Evidence-backed timeline</p><h1>Wallet incidents</h1><p className="lede">Search and filter reviewed vulnerabilities, exploits, supply-chain incidents, data breaches, and other security events. Severity describes the recorded event, not a permanent safety score for the wallet.</p><IncidentExplorer rows={rows}/></section>
}
