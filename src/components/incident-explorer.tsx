'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Chip from './chip'

export type IncidentExplorerRow = {
  id: string
  eventDate: string
  eventType: string
  title: string
  description: string
  impactLevel: string | null
  impactTone: string
  securityScope: string | null
  fundsAffected: string | null
  userActions: string[]
  evidenceCount: number
  entityName: string
  entitySlug: string
  productName: string | null
  productSlug: string | null
  searchText: string
}

export default function IncidentExplorer({ rows }: { rows: IncidentExplorerRow[] }) {
  const [query, setQuery] = useState('')
  const [impact, setImpact] = useState('all')
  const [eventType, setEventType] = useState('all')
  const [scope, setScope] = useState('all')
  const [funds, setFunds] = useState('all')

  const impacts = useMemo(() => [...new Set(rows.map((row) => row.impactLevel).filter(Boolean) as string[])].sort(), [rows])
  const eventTypes = useMemo(() => [...new Set(rows.map((row) => row.eventType))].sort(), [rows])
  const scopes = useMemo(() => [...new Set(rows.map((row) => row.securityScope).filter(Boolean) as string[])].sort(), [rows])
  const fundsValues = useMemo(() => [...new Set(rows.map((row) => row.fundsAffected).filter(Boolean) as string[])].sort(), [rows])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (impact !== 'all' && row.impactLevel !== impact) return false
      if (eventType !== 'all' && row.eventType !== eventType) return false
      if (scope !== 'all' && row.securityScope !== scope) return false
      if (funds !== 'all' && row.fundsAffected !== funds) return false
      if (normalized && !row.searchText.includes(normalized)) return false
      return true
    })
  }, [eventType, funds, impact, query, rows, scope])

  const reset = () => {
    setQuery('')
    setImpact('all')
    setEventType('all')
    setScope('all')
    setFunds('all')
  }

  return <div className="incident-explorer">
    <div className="controls incident-controls">
      <label className="control-field search-field"><span>Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Wallet, product, incident, vendor…" /></label>
      <label className="control-field"><span>Severity</span><select value={impact} onChange={(event) => setImpact(event.target.value)}><option value="all">All severities</option>{impacts.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
      <label className="control-field"><span>Event type</span><select value={eventType} onChange={(event) => setEventType(event.target.value)}><option value="all">All event types</option>{eventTypes.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
      <label className="control-field"><span>Scope</span><select value={scope} onChange={(event) => setScope(event.target.value)}><option value="all">All scopes</option>{scopes.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
      <label className="control-field"><span>Funds</span><select value={funds} onChange={(event) => setFunds(event.target.value)}><option value="all">All fund states</option>{fundsValues.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
      <button type="button" className="ghost-button" onClick={reset}>Reset</button>
    </div>
    <div className="registry-count"><strong>{filtered.length}</strong> of {rows.length} reviewed incident records</div>
    {filtered.length ? <div className="timeline-list">{filtered.map((row) => <article className={`timeline-item ${row.impactLevel ? `event-${row.impactLevel}` : ''}`} key={row.id}><div className="timeline-date">{row.eventDate}</div><div><div className="chip-row"><Chip>{row.eventType}</Chip>{row.impactLevel ? <Chip tone={row.impactTone}>{row.impactLevel}</Chip> : null}</div><h3>{row.title}</h3><p className="muted small">Wallet: <Link href={`/wallet/${row.entitySlug}/`}>{row.entityName}</Link>{row.productName && row.productSlug ? <> · Product: <Link href={`/product/${row.productSlug}/`}>{row.productName}</Link></> : null}</p><p>{row.description}</p><div className="event-meta">{row.securityScope ? <span>Scope: {row.securityScope}</span> : null}{row.fundsAffected ? <span>Funds affected: {row.fundsAffected}</span> : null}{row.userActions.length ? <span>Action: {row.userActions.join(', ')}</span> : null}<span>Evidence: {row.evidenceCount}</span></div></div></article>)}</div> : <p className="empty-state">No reviewed incidents match these filters.</p>}
  </div>
}
