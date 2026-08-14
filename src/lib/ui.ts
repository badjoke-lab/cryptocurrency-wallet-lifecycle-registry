export const statusTone = (status?: string | null) => ({ active:'active', limited:'limited', deprecated:'deprecated', discontinued:'discontinued', acquired:'acquired', rebranded:'rebranded', dead:'dead', unknown:'unknown' }[String(status ?? '')] ?? 'neutral')
export const impactTone = (impact?: string | null) => ['low','medium','high','critical'].includes(String(impact)) ? String(impact) : 'neutral'
export const supportTone = (status?: string | null) => ({ supported:'active', maintenance:'limited', security_only:'deprecated', ended:'dead', unknown:'unknown' }[String(status ?? '')] ?? 'neutral')
export const salesTone = (status?: string | null) => ({ on_sale:'active', end_of_sale:'discontinued', not_applicable:'unknown', unknown:'unknown' }[String(status ?? '')] ?? 'neutral')
