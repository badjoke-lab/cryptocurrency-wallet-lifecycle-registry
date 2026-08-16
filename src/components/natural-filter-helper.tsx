'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  translateNaturalLanguageFilters,
  type NaturalFilterFacets,
  type NaturalFilterState,
} from '../lib/natural-language-filters'
import { formatDiscoveryValue } from '../lib/discovery'

const FILTER_LABELS: Record<keyof NaturalFilterState, string> = {
  walletType: 'Type',
  custodyModel: 'Custody / key model',
  status: 'Status',
  securityHistory: 'Security history',
  remediationHistory: 'Fix / remediation',
  eolHistory: 'EOL / deprecation',
  launchFrom: 'Launch from',
  launchTo: 'Launch to',
  sort: 'Sort',
}

function formatFilterValue(key: keyof NaturalFilterState, value: string) {
  if (value === 'recorded') return 'Recorded'
  if (value === 'not_recorded') return 'Not recorded'
  if (key === 'custodyModel' || key === 'walletType' || key === 'status') return formatDiscoveryValue(value)
  if (key === 'sort') {
    if (value === 'verified') return 'Recently verified'
    if (value === 'incidents') return 'Most incidents'
    if (value === 'products') return 'Most products'
    return 'Name'
  }
  return value
}

export default function NaturalFilterHelper({
  facets,
  resetToken,
  onApply,
}: {
  facets: NaturalFilterFacets
  resetToken: number
  onApply: (filters: NaturalFilterState) => void
}) {
  const [input, setInput] = useState('')

  useEffect(() => {
    setInput('')
  }, [resetToken])

  const translation = useMemo(
    () => translateNaturalLanguageFilters(input, facets),
    [facets, input],
  )
  const entries = Object.entries(translation.filters) as Array<[keyof NaturalFilterState, string]>
  const hasInput = input.trim().length > 0

  return (
    <section
      aria-labelledby="natural-filter-title"
      style={{
        gridColumn: '1 / -1',
        display: 'grid',
        gap: 10,
        paddingBottom: 12,
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div>
        <strong id="natural-filter-title">Describe filters</strong>
        <p className="filter-note" style={{ margin: '4px 0 0' }}>
          Optional deterministic helper. It only proposes the same filters below; no AI service or semantic inference is used.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <label className="control-field search-field" style={{ flex: '1 1 420px', minWidth: 0 }}>
          <span>Filter phrase</span>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="e.g. hardware wallets with reviewed incidents before 2020"
            aria-describedby="natural-filter-status"
          />
        </label>
        <button
          type="button"
          className="ghost-button"
          disabled={!translation.applicable}
          onClick={() => onApply(translation.filters)}
        >
          Apply filters
        </button>
      </div>
      {hasInput ? (
        <div id="natural-filter-status" aria-live="polite" style={{ display: 'grid', gap: 7 }}>
          {entries.length ? (
            <div className="chip-row">
              {entries.map(([key, value]) => (
                <span className="chip" key={key}>{FILTER_LABELS[key]}: {formatFilterValue(key, value)}</span>
              ))}
            </div>
          ) : null}
          {translation.applicable ? (
            <p className="filter-note" style={{ margin: 0 }}>Ready to apply. The explicit controls below remain the source of truth and can be edited afterward.</p>
          ) : null}
          {translation.unresolved.length ? (
            <p className="filter-note" style={{ margin: 0 }}>Unresolved: {translation.unresolved.join(', ')}. Edit the phrase before applying.</p>
          ) : null}
          {translation.conflicts.length ? (
            <p className="filter-warning" style={{ margin: 0 }}>Conflict: {translation.conflicts.join('; ')}</p>
          ) : null}
          {translation.unsupported.length ? (
            <p className="filter-warning" style={{ margin: 0 }}>
              Unsupported claim/ranking language: {translation.unsupported.join(', ')}. WLR filters reviewed records; it does not translate these terms into safety or quality claims.
            </p>
          ) : null}
          {!translation.applicable && !translation.unresolved.length && !translation.conflicts.length && !translation.unsupported.length ? (
            <p className="filter-note" style={{ margin: 0 }}>No supported filter clause recognized yet.</p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
