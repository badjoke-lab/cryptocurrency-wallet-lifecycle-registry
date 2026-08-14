import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Chip from '../../../components/chip'
import Timeline from '../../../components/timeline'
import EvidenceList from '../../../components/evidence-list'
import { entities,entityBySlug,evidenceForEntity,eventsForEntity,productsForEntity } from '../../../lib/data'
import { SITE_NAME,SITE_URL } from '../../../lib/site'
import { statusTone } from '../../../lib/ui'

export function generateStaticParams(){return entities.map(x=>({slug:x.slug}))}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params
  const entity=entityBySlug(slug)
  if(!entity)return {}
  const pathname=`/wallet/${entity.slug}/`
  return {
    title: `${entity.canonical_name} wallet history`,
    description: entity.summary,
    alternates:{canonical:pathname},
    openGraph:{type:'article',title:`${entity.canonical_name} wallet history`,description:entity.summary,url:pathname},
  }
}

export default async function WalletPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params
  const entity=entityBySlug(slug)
  if(!entity){notFound();return null}
  const walletProducts=productsForEntity(entity.id)
  const walletEvents=eventsForEntity(entity.id)
  const sources=evidenceForEntity(entity.id)
  const pageUrl=`${SITE_URL}/wallet/${entity.slug}/`
  const articleJsonLd={
    '@context':'https://schema.org',
    '@type':'Article',
    '@id':`${pageUrl}#dossier`,
    headline:`${entity.canonical_name} wallet history`,
    description:entity.summary,
    url:pageUrl,
    dateModified:entity.last_verified_at,
    isPartOf:{'@id':`${SITE_URL}/#dataset`},
    publisher:{'@type':'Organization',name:'BadJoke-Lab'},
    about:{'@type':'Thing',name:entity.canonical_name,sameAs:entity.official_url??undefined},
    citation:sources.map((source)=>source.url),
  }
  const breadcrumbJsonLd={
    '@context':'https://schema.org',
    '@type':'BreadcrumbList',
    itemListElement:[
      {'@type':'ListItem',position:1,name:SITE_NAME,item:`${SITE_URL}/`},
      {'@type':'ListItem',position:2,name:entity.canonical_name,item:pageUrl},
    ],
  }
  return <article className="page"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(articleJsonLd)}}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(breadcrumbJsonLd)}}/><div className="title-row"><div><p className="eyebrow">Wallet dossier</p><h1>{entity.canonical_name}</h1></div><div className="chip-row"><Chip>{entity.wallet_type}</Chip><Chip tone={statusTone(entity.status)}>{entity.status}</Chip></div></div><p className="lede">{entity.summary}</p><dl className="facts"><div><dt>Developer / company</dt><dd>{entity.developer_or_company??'—'}</dd></div><div><dt>Origin</dt><dd>{entity.country_or_origin??'—'}</dd></div><div><dt>Launch</dt><dd>{entity.launch_date??'—'}</dd></div><div><dt>Custody</dt><dd>{entity.custody_model??'—'}</dd></div><div><dt>Confidence</dt><dd>{entity.confidence}</dd></div><div><dt>Last verified</dt><dd>{entity.last_verified_at}</dd></div></dl><section className="section"><div className="section-heading"><div><p className="kicker">Product family</p><h2>Products</h2></div></div><div className="product-grid">{walletProducts.map(p=><Link className="product-card" href={`/product/${p.slug}/`} key={p.id}><div className="chip-row"><Chip>{p.product_type}</Chip><Chip tone={statusTone(p.status)}>{p.status}</Chip></div><strong>{p.product_name}</strong><span>{p.generation?`Generation ${p.generation} · `:''}{p.last_verified_at}</span><p>{p.summary}</p></Link>)}</div></section><section className="section"><div className="section-heading"><div><p className="kicker">Chronology</p><h2>Lifecycle timeline</h2></div></div><Timeline rows={walletEvents}/></section><section className="section"><div className="section-heading"><div><p className="kicker">Sources</p><h2>Evidence</h2></div></div><EvidenceList rows={sources}/></section></article>
}
