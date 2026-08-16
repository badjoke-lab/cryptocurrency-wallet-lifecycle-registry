export type StatCoverage = {
  count: number
  denominator: number
  percentage: number
}

export type StatBucket = StatCoverage & {
  value: string
}

export type StatsDocument = {
  schema: string
  scope: string
  interpretation: string
  generated_from: string[]
  registry: {
    entities: number
    products: number
    events: number
    evidence: number
    incident_events: number
    remediation_events: number
    eol_events: number
  }
  entities: {
    wallet_type: StatBucket[]
    status: StatBucket[]
    confidence: StatBucket[]
    custody_model: StatBucket[]
    launch_date: StatCoverage
    launch_precision: StatBucket[]
  }
  products: {
    product_type: StatBucket[]
    status: StatBucket[]
    support_status: StatBucket[]
    sales_status: StatBucket[]
    confidence: StatBucket[]
    launch_date: StatCoverage
    launch_precision: StatBucket[]
    support_commitment: StatCoverage
    lineage_participation: StatCoverage
  }
  incidents: {
    by_year: StatBucket[]
    event_type: StatBucket[]
    impact_level: StatBucket[]
    security_scope: StatBucket[]
    funds_affected: StatBucket[]
    confidence: StatBucket[]
    cve: StatCoverage
    affected_version_info: StatCoverage
    fixed_version_info_inside_incident: StatCoverage
  }
  remediation: {
    by_year: StatBucket[]
    event_type: StatBucket[]
    confidence: StatBucket[]
    fixed_versions: StatCoverage
    affected_product_reference: StatCoverage
    user_actions_required: StatCoverage
    patch_response_duration: {
      status: string
      reason: string
    }
  }
  eol_lifecycle: {
    by_year: StatBucket[]
    event_type: StatBucket[]
    entity_discontinued_date: StatCoverage
    entity_eol_status: StatCoverage
    product_discontinued_date: StatCoverage
    product_sales_end_date: StatCoverage
    product_eol_status: StatCoverage
    exact_product_lifespan: {
      eligible_count: number
      eligibility: string
      records: Array<{
        product_id: string
        slug: string
        product_name: string
        launch_date: string
        discontinued_date: string
        days: number
      }>
      distribution: null | {
        eligible_count: number
        minimum_days: number
        median_days: number
        maximum_days: number
      }
      distribution_status: string
    }
  }
  data_quality: {
    entities: Record<string, StatCoverage | StatBucket[]>
    products: Record<string, StatCoverage | StatBucket[]>
    events: Record<string, StatCoverage | StatBucket[]>
    evidence: Record<string, StatCoverage | StatBucket[]>
  }
}
