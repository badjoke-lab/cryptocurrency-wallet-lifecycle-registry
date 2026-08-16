'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { CompareEvent, CompareProduct, CompareWallet } from '../../lib/compare'
import Chip from '../../components/chip'

function humanize(value: string) {
  return value.replace(/_/g, ' ')
}

function displayValue(value?: string | null) {
  if (!value) return 'Not recorded'
  if (value === 'unknown') return 'Unknown'
  return humanize(value)
}

function dateValue(date?: string | null, precision?: string | null) {
  if (!date) return 'Not recorded'
  if (!precision || precision === 'day') return date
  return `${date} (${humanize(precision)})`
}

function statusTone(status: string) {
  if (status === 'active' || status === 'supported' || status === 'on_sale') return 'active'
  if (status === 'limited' || status === 'maintenance' || status === 'security_only') return 'limited'
  if (status === 'deprecated' || status === 'end_of_sale') return 'deprecated'
  if (status === 'discontinued' || status === 'ended' || status === 'dead') return 'dead'
  if (status === 'acquired') return 'acquired'
  if (status === 'rebranded') return 'rebranded'
  return 'unknown'
}

function EventEvidence({ event }: { event: CompareEvent }) {
  if (!event.evidence.length) return <span className="compare-missing">No linked evidence displayed</span>
  return (
    <ul className="compare-source-list">
      {event.evidence.map((source) => (
        <li key={source.id}>
          <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
          <span>{source.publisher} · {source.isPrimary ? 'primary' : 'supplementary'} · {source.reliability}</span>
        </li>
      ))}
    </ul>
  )
}

function VersionRules({ label, rows }: { label: string; rows: CompareEvent['affectedVersionRules'] | CompareEvent['fixedVersions'] }) {
  if (!rows.length) return null
  return (
    <div className="compare-event-subset">
      <strong>{label}</strong>
      <ul>
        {rows.map((row, index) => (
          <li key={`${row.track}-${row.value}-${index}`}>
            {row.products.length ? `${row.products.join(', ')} · ` : ''}{row.track}: {row.value}
          </li>
        ))}
      </ul>
    </div>
  )
}

function EventCard({ event, severity = false }: { event: CompareEvent; severity?: boolean }) {
  return (
    <article className={`compare-event-card${severity && event.impactLevel ? ` event-${event.impactLevel}` : ''}`}>
      <div className="compare-event-heading">
        <time>{event.date}</time>
        <Chip tone={severity && event.impactLevel ? event.impactLevel : undefined}>{humanize(event.type)}</Chip>
      </div>
      <h3>{event.title}</h3>
      <p>{event.description}</p>
      <dl className="compare-mini-facts">
        <div><dt>Confidence</dt><dd>{displayValue(event.confidence)}</dd></div>
        {event.dateBasis ? <div><dt>Date basis</dt><dd>{humanize(event.dateBasis)}</dd></div> : null}
        {event.impactLevel ? <div><dt>Impact</dt><dd>{humanize(event.impactLevel)}</dd></div> : null}
        {event.securityScope ? <div><dt>Scope</dt><dd>{humanize(event.securityScope)}</dd></div> : null}
        {event.fundsAffected ? <div><dt>Funds affected</dt><dd>{humanize(event.fundsAffected)}</dd></div> : null}
      </dl>
      {event.products.length ? <p className="compare-event-meta"><strong>Products:</strong> {event.products.join(', ')}</p> : null}
      {event.affectedVersions.length ? <p className="compare-event-meta"><strong>Affected versions:</strong> {event.affectedVersions.join(', ')}</p> : null}
      <VersionRules label="Affected version rules" rows={event.affectedVersionRules} />
      <VersionRules label="Fixed versions" rows={event.fixedVersions} />
      {event.cveIds.length ? <p className="compare-event-meta"><strong>CVE:</strong> {event.cveIds.join(', ')}</p> : null}
      {event.userActions.length ? <p className="compare-event-meta"><strong>User actions:</strong> {event.userActions.map(humanize).join(', ')}</p> : null}
      <div className="compare-event-sources">
        <strong>Evidence</strong>
        <EventEvidence event={event} />
      </div>
    </article>
  )
}

function ProductCard({ product }: { product: CompareProduct }) {
  return (
    <article className="compare-product-card">
      <div className="compare-product-heading">
        <Link href={`/product/${product.slug}/`}>{product.name}</Link>
        <Chip tone={statusTone(product.status)}>{humanize(product.status)}</Chip>
      </div>
      <dl className="compare-mini-facts compare-product-facts">
        <div><dt>Type</dt><dd>{displayValue(product.type)}</dd></div>
        <div><dt>Support</dt><dd>{product.supportStatus ? <Chip tone={statusTone(product.supportStatus)}>{humanize(product.supportStatus)}</Chip> : 'Not recorded'}</dd></div>
        <div><dt>Sales</dt><dd>{product.salesStatus ? <Chip tone={statusTone(product.salesStatus)}>{humanize(product.salesStatus)}</Chip> : 'Not recorded'}</dd></div>
        <div><dt>Custody</dt><dd>{displayValue(product.custodyModel)}</dd></div>
        <div><dt>Key model</dt><dd>{displayValue(product.keyManagementModel)}</dd></div>
        <div><dt>Launch</dt><dd>{dateValue(product.launchDate, product.launchDatePrecision)}</dd></div>
        <div><dt>Sales end</dt><dd>{displayValue(product.salesEndDate)}</dd></div>
        <div><dt>Discontinued</dt><dd>{displayValue(product.discontinuedDate)}</dd></div>
        <div><dt>Predecessor</dt><dd>{displayValue(product.predecessor)}</dd></div>
        <div><dt>Successor</dt><dd>{displayValue(product.successor)}</dd></div>
        <div><dt>Confidence</dt><dd>{displayValue(product.confidence)}</dd></div>
        <div><dt>Verified</dt><dd>{product.lastVerified}</dd></div>
      </dl>
      {product.supportCommitment.length ? (
        <div className="compare-support-commitment">
          <strong>Recorded support commitment</strong>
          <dl>
            {product.supportCommitment.map((row) => <div key={row.key}><dt>{humanize(row.key)}</dt><dd>{row.value}</dd></div>)}
          </dl>
        </div>
      ) : <p className="compare-missing">Support commitment: Not recorded</p>}
    </article>
  )
}

function CompareColumns({ wallets, children }: { wallets: CompareWallet[]; children: (wallet: CompareWallet) => React.ReactNode }) {
  return (
    <div className="compare-scroll" tabIndex={0} aria-label="Scrollable comparison detail">
      <div className="compare-column-grid" style={{ gridTemplateColumns: `repeat(${wallets.length}, minmax(300px, 1fr))`, minWidth: `${wallets.length * 300}px` }}>
        {wallets.map((wallet) => (
          <section className="compare-column" key={wallet.id}>
            <div className="compare-column-title"><Link href={`/wallet/${wallet.slug}/`}>{wallet.name}</Link></div>
            {children(wallet)}
          </section>
        ))}
      </div>
    </div>
  )
}

function Matrix({ wallets }: { wallets: CompareWallet[] }) {
  const rows: Array<{ label: string; render: (wallet: CompareWallet) => React.ReactNode }> = [
    { label: 'Wallet type', render: (wallet) => displayValue(wallet.walletType) },
    { label: 'Custody model', render: (wallet) => displayValue(wallet.custodyModel) },
    { label: 'Key-management model', render: (wallet) => displayValue(wallet.keyManagementModel) },
    { label: 'Developer / company', render: (wallet) => displayValue(wallet.developer) },
    { label: 'Country / origin', render: (wallet) => displayValue(wallet.origin) },
    { label: 'Launch', render: (wallet) => dateValue(wallet.launchDate, wallet.launchDatePrecision) },
    { label: 'Current lifecycle status', render: (wallet) => <Chip tone={statusTone(wallet.status)}>{humanize(wallet.status)}</Chip> },
    { label: 'Discontinued date', render: (wallet) => displayValue(wallet.discontinuedDate) },
    { label: 'Predecessor', render: (wallet) => displayValue(wallet.predecessor) },
    { label: 'Successor', render: (wallet) => displayValue(wallet.successor) },
    { label: 'Confidence', render: (wallet) => displayValue(wallet.confidence) },
    { label: 'Last verified', render: (wallet) => wallet.lastVerified },
    { label: 'Reviewed products', render: (wallet) => wallet.products.length },
  ]

  return (
    <div className="compare-scroll" tabIndex={0} aria-label="Scrollable identity comparison matrix">
      <table className="compare-matrix" style={{ minWidth: `${220 + wallets.length * 250}px` }}>
        <thead><tr><th>Fact</th>{wallets.map((wallet) => <th key={wallet.id}><Link href={`/wallet/${wallet.slug}/`}>{wallet.name}</Link></th>)}</tr></thead>
        <tbody>
          {rows.map((row) => <tr key={row.label}><th scope="row">{row.label}</th>{wallets.map((wallet) => <td key={wallet.id}>{row.render(wallet)}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  )
}

function SecurityMatrix({ wallets }: { wallets: CompareWallet[] }) {
  const rows = [
    ['Reviewed incident events', (wallet: CompareWallet) => wallet.incidents.length],
    ['Critical impact recorded', (wallet: CompareWallet) => wallet.severityCounts.critical],
    ['High impact recorded', (wallet: CompareWallet) => wallet.severityCounts.high],
    ['Medium impact recorded', (wallet: CompareWallet) => wallet.severityCounts.medium],
    ['Low impact recorded', (wallet: CompareWallet) => wallet.severityCounts.low],
    ['Recorded remediation events', (wallet: CompareWallet) => wallet.remediations.length],
    ['Recorded EOL/deprecation events', (wallet: CompareWallet) => wallet.eolEvents.length],
  ] as const

  return (
    <div className="compare-scroll" tabIndex={0} aria-label="Scrollable security history summary">
      <table className="compare-matrix" style={{ minWidth: `${220 + wallets.length * 250}px` }}>
        <thead><tr><th>Reviewed registry fact</th>{wallets.map((wallet) => <th key={wallet.id}>{wallet.name}</th>)}</tr></thead>
        <tbody>{rows.map(([label, getValue]) => <tr key={label}><th scope="row">{label}</th>{wallets.map((wallet) => <td key={wallet.id}>{getValue(wallet)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

export default function CompareClient({ wallets }: { wallets: CompareWallet[] }) {
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([])
  const [invalidSlugs, setInvalidSlugs] = useState<string[]>([])
  const [tooMany, setTooMany] = useState(false)
  const [pendingAdd, setPendingAdd] = useState('')
  const [ready, setReady] = useState(false)

  const walletBySlug = useMemo(() => new Map(wallets.map((wallet) => [wallet.slug, wallet])), [wallets])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const raw = params.getAll('wallet')
    const selected: string[] = []
    const invalid: string[] = []
    const seen = new Set<string>()
    let overflow = false

    for (const slug of raw) {
      if (seen.has(slug)) continue
      seen.add(slug)
      if (!walletBySlug.has(slug)) {
        invalid.push(slug)
        continue
      }
      if (selected.length < 4) selected.push(slug)
      else overflow = true
    }
    setSelectedSlugs(selected)
    setInvalidSlugs(invalid)
    setTooMany(overflow)
    setReady(true)
  }, [walletBySlug])

  useEffect(() => {
    if (!ready) return
    const url = new URL(window.location.href)
    url.search = ''
    for (const slug of selectedSlugs) url.searchParams.append('wallet', slug)
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  }, [ready, selectedSlugs])

  const selected = selectedSlugs.map((slug) => walletBySlug.get(slug)).filter((wallet): wallet is CompareWallet => Boolean(wallet))
  const available = wallets.filter((wallet) => !selectedSlugs.includes(wallet.slug))

  const addWallet = () => {
    if (!pendingAdd || selectedSlugs.length >= 4 || selectedSlugs.includes(pendingAdd)) return
    setSelectedSlugs((current) => [...current, pendingAdd])
    setPendingAdd('')
  }
  const removeWallet = (slug: string) => setSelectedSlugs((current) => current.filter((value) => value !== slug))
  const reset = () => {
    setSelectedSlugs([])
    setInvalidSlugs([])
    setTooMany(false)
    setPendingAdd('')
  }

  return (
    <section className="compare-workspace" aria-live="polite">
      <div className="compare-selector-panel">
        <div className="compare-selector-copy">
          <p className="eyebrow">Select 2–4 reviewed wallet entities</p>
          <p>Selections stay in URL order. Product support remains product-specific; no overall support or safety status is inferred.</p>
        </div>
        <div className="compare-add-row">
          <label className="control-field compare-add-field">
            <span>Add wallet</span>
            <select value={pendingAdd} onChange={(event) => setPendingAdd(event.target.value)} disabled={selectedSlugs.length >= 4}>
              <option value="">Choose a reviewed wallet…</option>
              {available.map((wallet) => <option value={wallet.slug} key={wallet.id}>{wallet.name} — {humanize(wallet.walletType)}</option>)}
            </select>
          </label>
          <button type="button" className="secondary-action" onClick={addWallet} disabled={!pendingAdd || selectedSlugs.length >= 4}>Add</button>
          <button type="button" className="ghost-button" onClick={reset} disabled={!selectedSlugs.length && !invalidSlugs.length}>Reset</button>
        </div>
        <div className="compare-selection-list" aria-label="Selected wallets">
          {selected.map((wallet, index) => (
            <div className="compare-selection" key={wallet.id}>
              <span>{index + 1}</span>
              <strong>{wallet.name}</strong>
              <button type="button" onClick={() => removeWallet(wallet.slug)} aria-label={`Remove ${wallet.name}`}>Remove</button>
            </div>
          ))}
          {!selected.length ? <p className="compare-missing">No wallets selected.</p> : null}
        </div>
        {invalidSlugs.length ? <p className="compare-warning">Ignored unknown wallet selection: {invalidSlugs.join(', ')}</p> : null}
        {tooMany ? <p className="compare-warning">Only the first four distinct valid wallet selections are compared.</p> : null}
      </div>

      {!ready ? <p className="compare-state">Loading shareable selection…</p> : null}
      {ready && selected.length === 0 ? <p className="compare-state">Choose at least two reviewed wallet entities to build a comparison.</p> : null}
      {ready && selected.length === 1 ? <p className="compare-state"><strong>{selected[0].name}</strong> is selected. Add at least one more wallet; no comparison conclusion is generated from a single selection.</p> : null}

      {selected.length >= 2 ? (
        <div className="compare-results">
          <section className="compare-section">
            <div className="section-heading"><div><p className="eyebrow">Identity / lifecycle</p><h2>Recorded wallet facts</h2></div><p>Missing values stay “Not recorded”; canonical `unknown` stays “Unknown”.</p></div>
            <Matrix wallets={selected} />
          </section>

          <section className="compare-section">
            <div className="section-heading"><div><p className="eyebrow">Product / support</p><h2>Product-specific support facts</h2></div><p>Support and sales states are never collapsed into one ecosystem-wide label.</p></div>
            <CompareColumns wallets={selected}>{(wallet) => wallet.products.length ? <div className="compare-card-stack">{wallet.products.map((product) => <ProductCard product={product} key={product.id} />)}</div> : <p className="compare-missing">No reviewed products recorded.</p>}</CompareColumns>
          </section>

          <section className="compare-section">
            <div className="section-heading"><div><p className="eyebrow">Security history</p><h2>Reviewed incident records</h2></div><p>Counts describe WLR coverage only. Zero does not mean safe, vulnerability-free, or never compromised.</p></div>
            <SecurityMatrix wallets={selected} />
            <CompareColumns wallets={selected}>{(wallet) => wallet.incidents.length ? <div className="compare-card-stack">{wallet.incidents.map((event) => <EventCard event={event} severity key={event.id} />)}</div> : <p className="compare-missing">No reviewed incident recorded.</p>}</CompareColumns>
          </section>

          <section className="compare-section">
            <div className="section-heading"><div><p className="eyebrow">Recorded response</p><h2>Fix / remediation events</h2></div><p>No response-time score or inferred patch status is calculated.</p></div>
            <CompareColumns wallets={selected}>{(wallet) => wallet.remediations.length ? <div className="compare-card-stack">{wallet.remediations.map((event) => <EventCard event={event} key={event.id} />)}</div> : <p className="compare-missing">No reviewed fix/remediation recorded.</p>}</CompareColumns>
          </section>

          <section className="compare-section">
            <div className="section-heading"><div><p className="eyebrow">EOL / lineage</p><h2>Deprecation, replacement, and migration history</h2></div><p>Service shutdown alone is not treated as wallet EOL, and newer products are not called replacements without explicit lineage.</p></div>
            <CompareColumns wallets={selected}>{(wallet) => (
              <div className="compare-card-stack">
                <div className="compare-lineage-card">
                  <dl className="compare-mini-facts">
                    <div><dt>Entity predecessor</dt><dd>{displayValue(wallet.predecessor)}</dd></div>
                    <div><dt>Entity successor</dt><dd>{displayValue(wallet.successor)}</dd></div>
                    <div><dt>Discontinued date</dt><dd>{displayValue(wallet.discontinuedDate)}</dd></div>
                  </dl>
                </div>
                {wallet.eolEvents.map((event) => <EventCard event={event} key={`eol-${event.id}`} />)}
                {wallet.migrationEvents.filter((event) => !wallet.eolEvents.some((eol) => eol.id === event.id)).map((event) => <EventCard event={event} key={`migration-${event.id}`} />)}
                {!wallet.eolEvents.length && !wallet.migrationEvents.length ? <p className="compare-missing">No reviewed EOL/deprecation or migration event recorded.</p> : null}
              </div>
            )}</CompareColumns>
          </section>

          <p className="compare-disclaimer">Compare is a historical registry view. It does not recommend a wallet, declare a winner, or convert missing records into a safety conclusion.</p>
        </div>
      ) : null}
    </section>
  )
}
