import type { MetadataRoute } from 'next'
import { entities,products } from '../lib/data'
import { SITE_URL } from '../lib/site'
export default function sitemap():MetadataRoute.Sitemap{const paths=['','/hardware','/software','/incidents','/methodology','/about','/support'];return [...paths.map(p=>({url:`${SITE_URL}${p}/`})),...entities.map(e=>({url:`${SITE_URL}/wallet/${e.slug}/`})),...products.map(p=>({url:`${SITE_URL}/product/${p.slug}/`}))]}
