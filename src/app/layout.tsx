import './globals.css'
import './discovery.css'
import type { Metadata,Viewport } from 'next'
import Link from 'next/link'
import SiteHeader from '../components/site-header'
import { REPO_URL,SITE_DESCRIPTION,SITE_NAME,SITE_SHORT_NAME,SITE_TAGLINE,SITE_URL } from '../lib/site'

export const metadata:Metadata={
  metadataBase:new URL(SITE_URL),
  applicationName:SITE_NAME,
  title:{default:SITE_NAME,template:`%s | ${SITE_SHORT_NAME}`},
  description:SITE_DESCRIPTION,
  alternates:{canonical:'/',types:{'application/json':'/data/manifest.json','text/plain':'/llms.txt'}},
  robots:{index:true,follow:true},
  openGraph:{type:'website',title:SITE_NAME,description:SITE_DESCRIPTION,url:SITE_URL,siteName:SITE_NAME},
  twitter:{card:'summary',title:SITE_NAME,description:SITE_DESCRIPTION},
}
export const viewport:Viewport={themeColor:'#050505'}

const websiteJsonLd={
  '@context':'https://schema.org',
  '@type':'WebSite',
  '@id':`${SITE_URL}/#website`,
  name:SITE_NAME,
  alternateName:SITE_SHORT_NAME,
  url:`${SITE_URL}/`,
  description:SITE_DESCRIPTION,
  inLanguage:'en',
  publisher:{'@type':'Organization',name:'BadJoke-Lab'},
  subjectOf:[`${SITE_URL}/version.json`,`${SITE_URL}/data/manifest.json`,`${SITE_URL}/data/entities.json`,`${SITE_URL}/data/products.json`,`${SITE_URL}/data/events.json`,`${SITE_URL}/data/evidence.json`,`${SITE_URL}/llms.txt`,`${SITE_URL}/ai.txt`],
}

export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(websiteJsonLd)}}/><div className="site-frame"><SiteHeader/><main id="main-content" className="shell">{children}</main><footer className="site-footer"><div className="shell footer-groups"><section className="footer-summary"><strong>{SITE_NAME}</strong><p>{SITE_TAGLINE} WLR records products, lifecycle changes, incidents, vulnerabilities, fixes, and supporting evidence without ranking wallets.</p></section><section className="footer-group"><h2>Registry</h2><nav aria-label="Footer registry links"><Link href="/hardware/">Hardware</Link><Link href="/software/">Software</Link><Link href="/incidents/">Incidents</Link></nav></section><section className="footer-group"><h2>Project</h2><nav aria-label="Footer project links"><Link href="/methodology/">Methodology</Link><Link href="/about/">About</Link><a href={REPO_URL}>GitHub</a></nav></section><section className="footer-group footer-support-group"><h2>Support & data</h2><nav aria-label="Support and public data"><Link className="footer-support-link" href="/support/">Support WLR</Link><a href="/version.json">Version JSON</a><a href="/data/manifest.json">Data manifest</a><a href="/llms.txt">LLM guide</a><a href="/ai.txt">AI guide</a></nav></section></div><div className="shell footer-legal"><p>WLR is a historical registry, not a wallet recommendation, security guarantee, or investment service.</p></div></footer></div></body></html>}
