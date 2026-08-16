import type { Metadata } from 'next'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { StatBucket, StatCoverage, StatsDocument } from '../../lib/stats-types'
import './stats.css'

export const metadata: Metadata = {
  title: 'Registry statistics | WLR',
  description: 'Deterministic statistics describing reviewed Wallet Lifecycle Registry records, incident history, lifecycle coverage, and data availability.',
  alternates: { canonical: '/stats/' },
}

function loadStats(): StatsDocument {
  return JSON.parse(readFileSync(resolve(process.cwd(), 'public', 'data', 'stats.json'), 'utf8')) as StatsDocument
}

function humanize(value: string) {
  if (value === 'not_recorded') return 'Not recorded'
  if (value === 'unknown') return 'Unknown'
  return value.replace(/_/g, ' ')
}

function Coverage({ value }: { value: StatCoverage }) {
  return <span className="stats-coverage"><strong>{value.count}</strong> / {value.denominator} <small>({value.percentage}%)</small></span>
}

function CoverageCard({ label, value, note }: { label: string; value: StatCoverage; note?: string }) {
  return <article className="stats-coverage-card"><p>{label}</p><Coverage value={value} />{note ? <small>{note}</small> : null}</article>
}

function Distribution({ title, rows, impact = false }: { title: string; rows: StatBucket[]; impact?: boolean }) {
  const max = Math.max(1, ...rows.map((row) => row.count))
  return (
    <article className="stats-distribution">
      <h3>{title}</h3>
      <div className="stats-bars">
        {rows.map((row) => (
          <div className={`stats-bar-row${impact ? ` stats-impact-${row.value}` : ''}`} key={row.value}>
            <div className="stats-bar-label"><span>{humanize(row.value)}</span><strong>{row.count} / {row.denominator}</strong></div>
            <div className="stats-bar-track" aria-hidden="true"><span style={{ width: `${(row.count / max) * 100}%` }} /></div>
            <small>{row.percentage}% of reviewed records in this section</small>
          </div>
        ))}
      </div>
    </article>
  )
}

function QualityGroup({ title, values }: { title: string; values: Record<string, StatCoverage | StatBucket[]> }) {
  const coverageRows = Object.entries(values).filter(([, value]) => !Array.isArray(value)) as Array<[string, StatCoverage]>
  const distributions = Object.entries(values).filter(([, value]) => Array.isArray(value)) as Array<[string, StatBucket[]]>
  return (
    <section className="stats-quality-group">
      <h3>{title}</h3>
      <div className="stats-quality-grid">
        {coverageRows.map(([key, value]) => <CoverageCard key={key} label={humanize(key)} value={value} />)}
      </div>
      {distributions.map(([key, value]) => <Distribution key={key} title={humanize(key)} rows={value} />)}
    </section>
  )
}

export default function StatsPage() {
  const stats = loadStats()
  const lifespan = stats.eol_lifecycle.exact_product_lifespan

  return (
    <main className="shell page stats-page">
      <section className="hero-panel stats-hero">
        <p className="kicker">Deterministic registry summary</p>
        <h1>Registry statistics</h1>
        <p className="lede">Counts and coverage ratios describe reviewed WLR records. They are not wallet rankings, safety scores, recommendations, market-share estimates, or vendor-performance grades.</p>
        <a className="text-action" href="/data/stats.json">Open machine-readable stats.json</a>
      </section>

      <section className="stats-section">
        <div className="section-heading"><div><p className="eyebrow">Registry scope</p><h2>Current reviewed corpus</h2></div><p>Canonical record totals plus the central incident/remediation/EOL classifications.</p></div>
        <div className="stats-totals">
          <article><strong>{stats.registry.entities}</strong><span>Wallet entities</span></article>
          <article><strong>{stats.registry.products}</strong><span>Products</span></article>
          <article><strong>{stats.registry.events}</strong><span>Events</span></article>
          <article><strong>{stats.registry.evidence}</strong><span>Evidence</span></article>
          <article><strong>{stats.registry.incident_events}</strong><span>Reviewed incidents</span></article>
          <article><strong>{stats.registry.remediation_events}</strong><span>Recorded remediation events</span></article>
          <article><strong>{stats.registry.eol_events}</strong><span>Explicit EOL/deprecation events</span></article>
        </div>
      </section>

      <section className="stats-section">
        <div className="section-heading"><div><p className="eyebrow">Wallet records</p><h2>Entity distributions</h2></div><p>Distributions are over reviewed WLR entities, not the wallet market.</p></div>
        <div className="stats-grid-2">
          <Distribution title="Wallet type" rows={stats.entities.wallet_type} />
          <Distribution title="Current lifecycle status" rows={stats.entities.status} />
          <Distribution title="Confidence" rows={stats.entities.confidence} />
          <Distribution title="Custody model" rows={stats.entities.custody_model} />
        </div>
        <div className="stats-quality-grid stats-inline-coverage">
          <CoverageCard label="Launch date recorded" value={stats.entities.launch_date} />
        </div>
        <Distribution title="Launch-date precision among dated entities" rows={stats.entities.launch_precision} />
      </section>

      <section className="stats-section">
        <div className="section-heading"><div><p className="eyebrow">Product records</p><h2>Product and support coverage</h2></div><p>Support and sales states remain product-specific.</p></div>
        <div className="stats-grid-2">
          <Distribution title="Product type" rows={stats.products.product_type} />
          <Distribution title="Product status" rows={stats.products.status} />
          <Distribution title="Support status" rows={stats.products.support_status} />
          <Distribution title="Sales status" rows={stats.products.sales_status} />
          <Distribution title="Confidence" rows={stats.products.confidence} />
          <Distribution title="Launch-date precision" rows={stats.products.launch_precision} />
        </div>
        <div className="stats-quality-grid stats-inline-coverage">
          <CoverageCard label="Launch date recorded" value={stats.products.launch_date} />
          <CoverageCard label="Support commitment recorded" value={stats.products.support_commitment} />
          <CoverageCard label="Explicit lineage participation" value={stats.products.lineage_participation} />
        </div>
      </section>

      <section className="stats-section">
        <div className="section-heading"><div><p className="eyebrow">Reviewed incident history</p><h2>Incident distributions</h2></div><p>Incident counts are historical registry coverage, not wallet risk scores.</p></div>
        <div className="stats-grid-2">
          <Distribution title="Incident year" rows={stats.incidents.by_year} />
          <Distribution title="Incident event type" rows={stats.incidents.event_type} />
          <Distribution title="Impact level" rows={stats.incidents.impact_level} impact />
          <Distribution title="Security scope" rows={stats.incidents.security_scope} />
          <Distribution title="Funds affected" rows={stats.incidents.funds_affected} />
          <Distribution title="Confidence" rows={stats.incidents.confidence} />
        </div>
        <div className="stats-quality-grid stats-inline-coverage">
          <CoverageCard label="CVE recorded" value={stats.incidents.cve} />
          <CoverageCard label="Affected-version information" value={stats.incidents.affected_version_info} />
          <CoverageCard label="Fixed-version information inside incident record" value={stats.incidents.fixed_version_info_inside_incident} />
        </div>
      </section>

      <section className="stats-section">
        <div className="section-heading"><div><p className="eyebrow">Recorded remediation</p><h2>Patch / response information</h2></div><p>Remediation events are counted only from the central reviewed taxonomy.</p></div>
        <div className="stats-grid-2">
          <Distribution title="Remediation year" rows={stats.remediation.by_year} />
          <Distribution title="Remediation event type" rows={stats.remediation.event_type} />
          <Distribution title="Confidence" rows={stats.remediation.confidence} />
        </div>
        <div className="stats-quality-grid stats-inline-coverage">
          <CoverageCard label="Fixed versions recorded" value={stats.remediation.fixed_versions} />
          <CoverageCard label="Affected product reference" value={stats.remediation.affected_product_reference} />
          <CoverageCard label="User actions recorded" value={stats.remediation.user_actions_required} />
        </div>
        <aside className="stats-unavailable">
          <strong>Patch-response duration: unavailable</strong>
          <p>{stats.remediation.patch_response_duration.reason}. WLR does not pair incident and remediation events by nearby dates, shared products, matching versions, or other inferred relationships.</p>
        </aside>
      </section>

      <section className="stats-section">
        <div className="section-heading"><div><p className="eyebrow">EOL / lifecycle</p><h2>Recorded lifecycle endpoints</h2></div><p>Service shutdown alone is not counted as wallet or product EOL.</p></div>
        <div className="stats-grid-2">
          <Distribution title="EOL/deprecation year" rows={stats.eol_lifecycle.by_year} />
          <Distribution title="EOL/deprecation event type" rows={stats.eol_lifecycle.event_type} />
        </div>
        <div className="stats-quality-grid stats-inline-coverage">
          <CoverageCard label="Entity discontinued date" value={stats.eol_lifecycle.entity_discontinued_date} />
          <CoverageCard label="Entity EOL/deprecated current status" value={stats.eol_lifecycle.entity_eol_status} />
          <CoverageCard label="Product discontinued date" value={stats.eol_lifecycle.product_discontinued_date} />
          <CoverageCard label="Product sales-end date" value={stats.eol_lifecycle.product_sales_end_date} />
          <CoverageCard label="Product EOL/deprecated current status" value={stats.eol_lifecycle.product_eol_status} />
        </div>
        <aside className="stats-unavailable">
          <strong>Exact product lifespan distribution: {lifespan.distribution_status === 'available' ? 'available' : 'not published'}</strong>
          <p>{lifespan.eligible_count} product records currently meet the exact day-level launch-to-discontinued eligibility rule. Partial/approximate dates and sales-end dates are not converted into synthetic product lifespans.</p>
          {lifespan.distribution ? <p>Eligible subset: min {lifespan.distribution.minimum_days} days · median {lifespan.distribution.median_days} days · max {lifespan.distribution.maximum_days} days.</p> : null}
        </aside>
      </section>

      <section className="stats-section">
        <div className="section-heading"><div><p className="eyebrow">Data-quality coverage</p><h2>What the registry has recorded</h2></div><p>Coverage ratios expose missing data; they are not grades.</p></div>
        <div className="stats-quality-sections">
          <QualityGroup title="Entity coverage" values={stats.data_quality.entities} />
          <QualityGroup title="Product coverage" values={stats.data_quality.products} />
          <QualityGroup title="Event coverage" values={stats.data_quality.events} />
          <QualityGroup title="Evidence coverage" values={stats.data_quality.evidence} />
        </div>
      </section>

      <section className="stats-methodology">
        <p className="eyebrow">Interpretation</p>
        <p>{stats.interpretation}</p>
        <p>Generated from: {stats.generated_from.join(', ')}. Canonical JSON remains the authority; <code>/data/stats.json</code> is a deterministic derived view.</p>
      </section>
    </main>
  )
}
