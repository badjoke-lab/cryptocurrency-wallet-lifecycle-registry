import rawEntities from '../../data/entities.json'
import rawProducts from '../../data/products.json'
import rawEvents from '../../data/events.json'
import rawEvidence from '../../data/evidence.json'
import type { WalletEntity, WalletProduct, WalletEvent, WalletEvidence } from './types'
export const entities=rawEntities as WalletEntity[]; export const products=rawProducts as WalletProduct[]; export const events=rawEvents as WalletEvent[]; export const evidence=rawEvidence as WalletEvidence[]
export const byEntityId=new Map(entities.map(x=>[x.id,x])); export const byProductId=new Map(products.map(x=>[x.id,x]))
export const entityBySlug=(slug:string)=>entities.find(x=>x.slug===slug); export const productBySlug=(slug:string)=>products.find(x=>x.slug===slug)
export const productsForEntity=(id:string)=>products.filter(x=>x.entity_id===id)
export const eventsForEntity=(id:string)=>events.filter(x=>x.entity_id===id).sort((a,b)=>a.event_date.localeCompare(b.event_date))
export const eventsForProduct=(id:string)=>events.filter(x=>x.product_id===id||x.affected_product_ids?.includes(id)).sort((a,b)=>a.event_date.localeCompare(b.event_date))
export const evidenceForEntity=(id:string)=>evidence.filter(x=>x.entity_id===id)
export const evidenceForProduct=(id:string)=>evidence.filter(x=>x.product_id===id||x.product_ids?.includes(id))
export const evidenceForEvent=(id:string)=>evidence.filter(x=>x.event_id===id||x.event_ids?.includes(id))
export function isIncident(event:WalletEvent){return ['vulnerability_disclosed','security_research_published','exploit','unauthorized_access','supply_chain_compromise','malicious_update','seed_key_exposure','private_key_exposure','firmware_issue','software_issue','customer_data_breach','third_party_data_breach','phishing_campaign'].includes(event.event_type)}
