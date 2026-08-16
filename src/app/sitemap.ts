import type { MetadataRoute } from 'next'
import { entities, products } from '../lib/data'
import { SITE_URL } from '../lib/site'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['', '/hardware', '/software', '/incidents', '/compare', '/methodology', '/about', '/support']
  return [
    ...paths.map((path) => ({ url: `${SITE_URL}${path}/` })),
    ...entities.map((entity) => ({ url: `${SITE_URL}/wallet/${entity.slug}/` })),
    ...products.map((product) => ({ url: `${SITE_URL}/product/${product.slug}/` })),
  ]
}
