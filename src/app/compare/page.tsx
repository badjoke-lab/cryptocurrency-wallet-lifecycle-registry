import type { Metadata } from 'next'
import { compareWallets } from '../../lib/compare'
import CompareClient from './compare-client'
import './compare.css'

export const metadata: Metadata = {
  title: 'Compare wallet lifecycle records | WLR',
  description: 'Compare reviewed cryptocurrency wallet lifecycle, security, remediation, product support, and EOL facts without rankings or recommendations.',
  alternates: { canonical: '/compare/' },
}

export default function ComparePage() {
  return (
    <main className="shell page compare-page">
      <section className="hero-panel compare-hero">
        <p className="kicker">Deterministic historical comparison</p>
        <h1>Compare wallet records</h1>
        <p className="lede">
          Place reviewed lifecycle, security, remediation, and product-support facts side by side. Compare does not score wallets, choose a winner, or infer safety from missing records.
        </p>
      </section>
      <CompareClient wallets={compareWallets} />
    </main>
  )
}
