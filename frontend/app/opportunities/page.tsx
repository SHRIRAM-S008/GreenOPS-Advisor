'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { AlertTriangle, DollarSign, Leaf } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchOpportunities()
  }, [filter])

  async function fetchOpportunities() {
    setLoading(true)
    
    let query = supabase
      .from('opportunities')
      .select('*, workloads(name, kind, namespaces(name))')
      .order('savings_usd', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error:', error)
    } else {
      setOpportunities(data || [])
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <AlertTriangle className="text-yellow-600" />
            All Opportunities
          </h1>
          <p className="text-gray-600 mt-1">Review and apply optimization recommendations</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-2">
            {['all', 'pending', 'approved', 'applied', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg capitalize ${
                  filter === status
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="text-yellow-600" size={20} />
              <span className="text-sm text-gray-600">Total Opportunities</span>
            </div>
            <p className="text-2xl font-bold">{opportunities.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="text-green-600" size={20} />
              <span className="text-sm text-gray-600">Potential Savings</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              ${opportunities.reduce((sum, o) => sum + o.savings_usd, 0).toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="text-green-600" size={20} />
              <span className="text-sm text-gray-600">Carbon Reduction</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {(opportunities.reduce((sum, o) => sum + o.carbon_reduction_gco2e, 0) / 1000).toFixed(2)} kg
            </p>
          </div>
        </div>

        {/* Opportunities List */}
        <div className="space-y-4">
          {loading ? (
            <p className="text-gray-500">Loading opportunities...</p>
          ) : opportunities.length === 0 ? (
            <p className="text-gray-500">No opportunities found.</p>
          ) : (
            opportunities.map((opp) => (
              <div
                key={opp.id}
                onClick={() => router.push(`/opportunities/${opp.id}`)}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg cursor-pointer transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{opp.workloads.name}</h3>
                    <p className="text-sm text-gray-600">
                      {opp.workloads.kind} • {opp.workloads.namespaces.name}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    opp.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    opp.status === 'applied' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {opp.status.toUpperCase()}
                  </span>
                </div>

                <p className="text-gray-700 mb-4">{opp.explanation}</p>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-600">Monthly Savings</p>
                    <p className="text-lg font-bold text-green-600">${opp.savings_usd.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Carbon Reduction</p>
                    <p className="text-lg font-bold text-green-600">
                      {(opp.carbon_reduction_gco2e / 1000).toFixed(2)} kg
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Confidence</p>
                    <p className="text-lg font-bold text-blue-600">
                      {(opp.confidence_score * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}