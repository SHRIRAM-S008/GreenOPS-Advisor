export interface Opportunity {
  id: string
  workload_id: string
  savings_usd: number
  carbon_reduction_gco2e: number
  confidence_score: number
  risk_level: string
  explanation: string
  opportunity_type: string
  status: string
  created_at: string
  workloads: {
    name: string
    kind: string
    namespaces: {
      name: string
    }
  }
}

export interface Workload {
  id: string
  name: string
  kind: string
  namespace_id: string
  replicas: number
  cpu_request: number
  cpu_limit: number
  memory_request: number
  memory_limit: number
  last_updated: string
  namespaces: {
    name: string
    cluster_id: string
    clusters: {
      name: string
    }
  }
}

export interface PREvent {
  id: string
  pr_number: number
  repo_full_name: string
  pr_url: string
  timestamp: string
  delta_cost_usd: number
  delta_carbon_gco2e: number
  risk_assessment: string
  workload_id: string
  workloads?: {
    name: string
    kind: string
  }
}