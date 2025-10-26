'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { History, CheckCircle } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function HistoryPage() {
  const [appliedOpportunities, setAppliedOpportunities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
  }, [])

  async function fetchHistory() {
    setLoading(true)

    const { data, error } = await supabase
      .from('opportunities')
      .select('*, workloads(name, kind, namespaces(name))')
      .eq('status', 'applied')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error:', error)
    } else {
      setAppliedOpportunities(data || [])
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <History className="text-blue-600" />
            Applied Fixes History
          </h1>
          <p className="text-gray-600 mt-1">Track all optimization changes that have been applied</p>
        </div>

        <div className="space-y-4">
          {loading ? (
            <p className="text-gray-500">Loading history...</p>
          ) : appliedOpportunities.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">No fixes have been applied yet.</p>
            </div>
          ) : (
            appliedOpportunities.map((opp) => (
              <div key={opp.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <CheckCircle className="text-green-600" size={24} />
                      {opp.workloads.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {opp.workloads.kind} • {opp.workloads.namespaces.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Applied: {new Date(opp.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                    APPLIED
                  </span>
                </div>

                <p className="text-gray-700 mb-4">{opp.explanation}</p>

                <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4">
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