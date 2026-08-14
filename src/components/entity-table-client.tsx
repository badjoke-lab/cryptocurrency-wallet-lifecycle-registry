'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Chip from './chip'

export type EntityTableRow = {
  id: string
  slug: string
  name: string
  summary: string
  searchText: string
  walletType: string
  status: string
  statusTone: string
  productCount: number
  incidentCount: number
  origin: string
  verified: string
}

export default function EntityTableClient({ rows }: { rows: EntityTableRow[] }) {
  const [query, setQuery] = useState('')
  const [walletType, setWalletType] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('name')

  const walletTypes = useMemo(() => [...new Set(rows.map((row) => row.walletType))].sort(), [rows])
  const statuses = useMemo(() => [...new Set(rows.map((row) => row.status))].sort(), [rows])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const next = rows.filter((row) => {
      if (walletType !== 'all' && row.walletType !== walletType) return false
      if (status !== 'all' && row.status !== status) return false
      if (normalized && !row.searchText.includes(normalized)) return false
      return true
    })
    next.sort((a, b) => {
      if (sort === 'verified') return b.verified.localeCompare(a.verified) || a.name.localeCompare(b.name)
      if (sort === 'incidents') return b.incidentCount - a.incidentCount || a.name.localeCompare(b.name)
      if (sort === 'products') return b.productCount - a.productCount || a.name.localeCompare(b.name)
      return a.name.localeCompare(b.name)
    })
    return next
  }, [query, rows, sort, status, walletType])

  const reset = () => {
    setQuery('')
    setWalletType('all')
    setStatus('all')
    setSort('name')
  }

  return (
    <div className="registry-panel">
      <div className="controls registry-controls">
        <label className="control-field search-field">
          <span>Search</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Wallet, company, alias, origin…" />
        </label>
        <label className="control-field">
          <span>Type</span>
          <select value={walletType} onChange={(event) => setWalletType(event.target.value)}>
            <option value="all">All types</option>
            {walletTypes.map((value) => <option value={value} key={value}>{value}</option>)}
          </select>
        </label>
        <label className="control-field">
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            {statuses.map((value) => <option value={value} key={value}>{value}</option>)}
          </select>
        </label>
        <label className="control-field">
          <span>Sort</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="name">Name</option>
            <option value="verified">Recently verified</option>
            <option value="incidents">Incident count</option>
            <option value="products">Product count</option>
          </select>
        </label>
        <button type="button" className="ghost-button" onClick={reset}>Reset</button>
      </div>
      <div className="registry-count"><strong>{filtered.length}</strong> of {rows.length} reviewed wallet records</div>
      {filtered.length ? <div className="table-wrap"><table className="registry-table"><thead><tr><th>Wallet</th><th>Type</th><th>Status</th><th>Products</th><th>Incidents</th><th>Origin</th><th>Verified</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id}><td className="name-cell"><Link className="strong-link" href={`/wallet/${row.slug}/`}>{row.name}</Link><small>{row.summary}</small></td><td><Chip>{row.walletType}</Chip></td><td><Chip tone={row.statusTone}>{row.status}</Chip></td><td>{row.productCount}</td><td>{row.incidentCount}</td><td>{row.origin}</td><td>{row.verified}</td></tr>)}</tbody></table></div> : <p className="empty-state">No reviewed wallet records match these filters.</p>}
    </div>
  )
}
