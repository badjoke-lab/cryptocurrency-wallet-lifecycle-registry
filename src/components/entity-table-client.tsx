'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  discoveryLabels,
  formatDiscoveryValue,
} from '../lib/discovery'
import type { NaturalFilterState } from '../lib/natural-language-filters'
import Chip from './chip'
import NaturalFilterHelper from './natural-filter-helper'

export type EntityTableRow = {
  id: string
  slug: string
  name: string
  summary: string
  searchText: string
  walletType: string
  custodyModel: string
  status: string
  statusTone: string
  productCount: number
  incidentCount: number
  incidentRecorded: boolean
  remediationRecorded: boolean
  eolRecorded: boolean
  launchYear: number | null
  origin: string
  verified: string
}

type RecordedFilter = 'all' | 'recorded' | 'not_recorded'

function matchesRecordedFilter(value: boolean, filter: RecordedFilter) {
  if (filter === 'recorded') return value
  if (filter === 'not_recorded') return !value
  return true
}

function parseYear(value: string) {
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) ? parsed : null
}

export default function EntityTableClient({ rows }: { rows: EntityTableRow[] }) {
  const [query, setQuery] = useState('')
  const [walletType, setWalletType] = useState('all')
  const [custodyModel, setCustodyModel] = useState('all')
  const [status, setStatus] = useState('all')
  const [securityHistory, setSecurityHistory] = useState<RecordedFilter>('all')
  const [remediationHistory, setRemediationHistory] = useState<RecordedFilter>('all')
  const [eolHistory, setEolHistory] = useState<RecordedFilter>('all')
  const [launchFrom, setLaunchFrom] = useState('')
  const [launchTo, setLaunchTo] = useState('')
  const [sort, setSort] = useState('name')
  const [helperResetToken, setHelperResetToken] = useState(0)

  const walletTypes = useMemo(() => [...new Set(rows.map((row) => row.walletType))].sort(), [rows])
  const custodyModels = useMemo(
    () => [...new Set(rows.map((row) => row.custodyModel))].sort((a, b) => formatDiscoveryValue(a).localeCompare(formatDiscoveryValue(b))),
    [rows],
  )
  const statuses = useMemo(() => [...new Set(rows.map((row) => row.status))].sort(), [rows])
  const naturalFilterFacets = useMemo(
    () => ({ walletTypes, custodyModels, statuses }),
    [custodyModels, statuses, walletTypes],
  )

  const fromYear = parseYear(launchFrom)
  const toYear = parseYear(launchTo)
  const invalidYearRange = fromYear !== null && toYear !== null && fromYear > toYear

  const filtered = useMemo(() => {
    if (invalidYearRange) return []

    const normalized = query.trim().toLowerCase()
    const next = rows.filter((row) => {
      if (walletType !== 'all' && row.walletType !== walletType) return false
      if (custodyModel !== 'all' && row.custodyModel !== custodyModel) return false
      if (status !== 'all' && row.status !== status) return false
      if (!matchesRecordedFilter(row.incidentRecorded, securityHistory)) return false
      if (!matchesRecordedFilter(row.remediationRecorded, remediationHistory)) return false
      if (!matchesRecordedFilter(row.eolRecorded, eolHistory)) return false
      if (fromYear !== null && (row.launchYear === null || row.launchYear < fromYear)) return false
      if (toYear !== null && (row.launchYear === null || row.launchYear > toYear)) return false
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
  }, [
    custodyModel,
    eolHistory,
    fromYear,
    invalidYearRange,
    query,
    remediationHistory,
    rows,
    securityHistory,
    sort,
    status,
    toYear,
    walletType,
  ])

  const applyNaturalFilters = (filters: NaturalFilterState) => {
    setQuery('')
    setWalletType(filters.walletType ?? 'all')
    setCustodyModel(filters.custodyModel ?? 'all')
    setStatus(filters.status ?? 'all')
    setSecurityHistory(filters.securityHistory ?? 'all')
    setRemediationHistory(filters.remediationHistory ?? 'all')
    setEolHistory(filters.eolHistory ?? 'all')
    setLaunchFrom(filters.launchFrom ?? '')
    setLaunchTo(filters.launchTo ?? '')
    setSort(filters.sort ?? 'name')
  }

  const reset = () => {
    setQuery('')
    setWalletType('all')
    setCustodyModel('all')
    setStatus('all')
    setSecurityHistory('all')
    setRemediationHistory('all')
    setEolHistory('all')
    setLaunchFrom('')
    setLaunchTo('')
    setSort('name')
    setHelperResetToken((value) => value + 1)
  }

  return (
    <div className="registry-panel">
      <div className="controls registry-controls" aria-describedby="registry-filter-note">
        <NaturalFilterHelper facets={naturalFilterFacets} resetToken={helperResetToken} onApply={applyNaturalFilters} />
        <label className="control-field search-field">
          <span>Search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Wallet, product, company, alias, event…"
          />
        </label>
        <label className="control-field">
          <span>Type</span>
          <select value={walletType} onChange={(event) => setWalletType(event.target.value)}>
            <option value="all">All types</option>
            {walletTypes.map((value) => <option value={value} key={value}>{formatDiscoveryValue(value)}</option>)}
          </select>
        </label>
        <label className="control-field">
          <span>Custody / key model</span>
          <select value={custodyModel} onChange={(event) => setCustodyModel(event.target.value)}>
            <option value="all">All custody states</option>
            {custodyModels.map((value) => <option value={value} key={value}>{formatDiscoveryValue(value)}</option>)}
          </select>
        </label>
        <label className="control-field">
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            {statuses.map((value) => <option value={value} key={value}>{formatDiscoveryValue(value)}</option>)}
          </select>
        </label>
        <label className="control-field">
          <span>Security history</span>
          <select value={securityHistory} onChange={(event) => setSecurityHistory(event.target.value as RecordedFilter)}>
            <option value="all">All records</option>
            <option value="recorded">{discoveryLabels.incident_recorded}</option>
            <option value="not_recorded">{discoveryLabels.incident_not_recorded}</option>
          </select>
        </label>
        <label className="control-field">
          <span>Fix / remediation</span>
          <select value={remediationHistory} onChange={(event) => setRemediationHistory(event.target.value as RecordedFilter)}>
            <option value="all">All records</option>
            <option value="recorded">{discoveryLabels.remediation_recorded}</option>
            <option value="not_recorded">{discoveryLabels.remediation_not_recorded}</option>
          </select>
        </label>
        <label className="control-field">
          <span>EOL / deprecation</span>
          <select value={eolHistory} onChange={(event) => setEolHistory(event.target.value as RecordedFilter)}>
            <option value="all">All records</option>
            <option value="recorded">{discoveryLabels.eol_recorded}</option>
            <option value="not_recorded">{discoveryLabels.eol_not_recorded}</option>
          </select>
        </label>
        <label className="control-field year-field">
          <span>Launch year from</span>
          <input type="number" inputMode="numeric" min="1900" step="1" value={launchFrom} onChange={(event) => setLaunchFrom(event.target.value)} placeholder="e.g. 2014" />
        </label>
        <label className="control-field year-field">
          <span>Launch year to</span>
          <input type="number" inputMode="numeric" min="1900" step="1" value={launchTo} onChange={(event) => setLaunchTo(event.target.value)} placeholder="e.g. 2024" />
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
        <p className="filter-note" id="registry-filter-note">
          “Recorded” describes reviewed WLR coverage, not wallet safety or patch status. Launch-year filters exclude records without a supported canonical launch date.
        </p>
      </div>
      <div className="registry-count">
        <strong>{filtered.length}</strong> of {rows.length} reviewed wallet records
        {invalidYearRange ? <span className="filter-warning"> — launch year from must not exceed launch year to</span> : null}
      </div>
      {filtered.length ? (
        <div className="table-wrap">
          <table className="registry-table">
            <thead>
              <tr>
                <th>Wallet</th><th>Type</th><th>Custody</th><th>Status</th><th>Launch</th><th>Products</th><th>Incidents</th><th>Origin</th><th>Verified</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td className="name-cell"><Link className="strong-link" href={`/wallet/${row.slug}/`}>{row.name}</Link><small>{row.summary}</small></td>
                  <td><Chip>{formatDiscoveryValue(row.walletType)}</Chip></td>
                  <td>{formatDiscoveryValue(row.custodyModel)}</td>
                  <td><Chip tone={row.statusTone}>{formatDiscoveryValue(row.status)}</Chip></td>
                  <td>{row.launchYear ?? '—'}</td>
                  <td>{row.productCount}</td>
                  <td>{row.incidentCount}</td>
                  <td>{row.origin}</td>
                  <td>{row.verified}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="empty-state">No reviewed wallet records match these filters.</p>}
    </div>
  )
}
