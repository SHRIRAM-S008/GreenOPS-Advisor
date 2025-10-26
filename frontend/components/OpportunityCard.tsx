'use client'

import { useRouter } from 'next/navigation'

interface OpportunityCardProps {
  opportunity: any
}

export default function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const router = useRouter()

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="border-2 border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-lg font-bold text-gray-900">
            {opportunity.workloads.name}
          </h4>
          <p className="text-sm text-gray-600">
            {opportunity.workloads.kind} • {opportunity.workloads.namespaces.name}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${getRiskColor(opportunity.risk_level)}`}>
          {opportunity.risk_level.toUpperCase()} RISK
        </span>
      </div>
      
      <p className="text-gray-700 mb-4">{opportunity.explanation}</p>
      
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Monthly Savings</p>
          <p className="text-xl font-bold text-green-600">${opportunity.savings_usd.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Carbon Reduction</p>
          <p className="text-xl font-bold text-green-600">{(opportunity.carbon_reduction_gco2e / 1000).toFixed(2)} kg</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Confidence</p>
          <p className="text-xl font-bold text-blue-600">{(opportunity.confidence_score * 100).toFixed(0)}%</p>
        </div>
      </div>
      
      <div className="flex gap-2">
        <button 
          onClick={() => router.push(`/opportunities/${opportunity.id}`)}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          View Details
        </button>
        <button 
          onClick={() => router.push(`/opportunities/${opportunity.id}`)}
          className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Apply Fix
        </button>
      </div>
    </div>
  )
}