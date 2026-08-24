import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Chip from '../../../components/chip'
import Timeline from '../../../components/timeline'
import EvidenceList from '../../../components/evidence-list'
import ProductMaterialConcerns from '../../../components/product-material-concerns'
import IzakayaRelatedRegistryRecords from '../../../components/izakaya-related-registry-records'
import { byEntityId,evidenceForProduct,eventsForProduct,productBySlug,products } from '../../../lib/data'
import { SITE_NAME,SITE_URL } from '../../../lib/site'
import { salesTone,statusTone,supportTone } from '../../../lib/ui'

export function generateStaticParams(){return products.map(x=>({slug:x.slug}))}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params
  const product=productBySlug(slug)
  if(!product)return {}
  const entity=byEntityId.get(product.entity_id)
  const pathname=`/product/${product.slug}/`
  const keywords=[product.product_name,entity?.canonical_name,'cryptocurrency wallet','wallet security','wallet lifecycle'].filter((value):value is string=>Boolean(value))
  return {
    title:`${product.product_name} lifecycle`,
    description:product.summary,
    alternates:{canonical:pathname},
    openGraph:{type:'article',title:`${product.product_name} lifecycle`,description:product.summary,url:pathname},
    keywords,
  }
}

export default async function ProductPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params
  const product=productBySlug(slug)
  if(!product){notFound();return null}
  const entity=byEntityId.get(product.entity_id)!
  const rows=eventsForProduct(product.id)
  const sources=evidenceForProduct(product.id)
  const pageUrl=`${SITE_URL}/product/${product.slug}/`
  const productJsonLd={
    '@context':'https://schema.org',
    '@type':'Product',
    '@id':`${pageUrl}#product`,
    name:product.product_name,
    description:product.summary,
    url:pageUrl,
    brand:{'@type':'Brand',name:entity.canonical_name},
    releaseDate:product.launch_date??undefined,
    sameAs:product.official_url??undefined,
    subjectOf:sources.map((source)=>source.url),
  }
  const breadcrumbJsonLd={
    '@context':'https://schema.org',
    '@type':'BreadcrumbList',
    itemListElement:[
      {'@type':'ListItem',position:1,name:SITE_NAME,item:`${SITE_URL}/`},
      {'@type':'ListItem',position:2,name:entity.canonical_name,item:`${SITE_URL}/wallet/${entity.slug}/`},
      {'@type':'ListItem',position:3,name:product.product_name,item:pageUrl},
    ],
  }
  return <article className="page"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(productJsonLd)}}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(breadcrumbJsonLd)}}/><p className="eyebrow">Product record · <Link href={`/wallet/${entity.slug}/`}>{entity.canonical_name}</Link></p><div className="title-row"><h1>{product.product_name}</h1><div className="chip-row"><Chip>{product.product_type}</Chip><Chip tone={statusTone(product.status)}>{product.status}</Chip>{product.sales_status?<Chip tone={salesTone(product.sales_status)}>{product.sales_status}</Chip>:null}{product.support_status?<Chip tone={supportTone(product.support_status)}>{product.support_status}</Chip>:null}</div></div><p className="lede">{product.summary}</p><dl className="facts"><div><dt>Launch</dt><dd>{product.launch_date??'—'}</dd></div><div><dt>Sales</dt><dd>{product.sales_status??'—'}</dd></div><div><dt>Support</dt><dd>{product.support_status??'—'}</dd></div><div><dt>Variants</dt><dd>{product.variants?.length?product.variants.join(', '):'—'}</dd></div><div><dt>Confidence</dt><dd>{product.confidence}</dd></div><div><dt>Last verified</dt><dd>{product.last_verified_at}</dd></div></dl><ProductMaterialConcerns product={product} events={rows}/>{product.id==='wlr_prod_000150'?<IzakayaRelatedRegistryRecords/>:null}<section className="section"><div className="section-heading"><div><p className="kicker">Lifecycle</p><h2>Product timeline</h2></div></div>{rows.length?<Timeline rows={rows}/>:<p className="muted">No product-specific events in the current seed.</p>}</section><section className="section"><div className="section-heading"><div><p className="kicker">Sources</p><h2>Evidence</h2></div></div><EvidenceList rows={sources}/></section></article>
}
