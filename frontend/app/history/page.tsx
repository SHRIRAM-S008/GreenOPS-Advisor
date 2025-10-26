'use client'

import { useState, useEffect } from 'react'
import { History, CheckCircle, DollarSign, Leaf } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function HistoryPage() {
  const [appliedOpportunities, setAppliedOpportunities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchHistory()

    // Subscribe to real-time changes
    const channel = supabase
      .channel('history-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'opportunities' },
        (payload) => {
          // Only refetch if status changed to 'applied'
          const newRecord = payload.new as { status?: string };
          const oldRecord = payload.old as { status?: string } | null;
          if (newRecord.status === 'applied' || oldRecord?.status === 'applied') {
            fetchHistory()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchHistory() {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('opportunities')
        .select('*, workloads(name, kind, namespaces(name))')
        .eq('status', 'applied')
        .order('created_at', { ascending: false })

      if (error) {
        setError(error.message)
        console.error('Error:', error)
      } else {
        setAppliedOpportunities(data || [])
      }
    } catch (err) {
      setError('Failed to fetch history')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Add skeleton loader component
  const SkeletonLoader = () => (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="h-6 bg-gray-200 rounded w-20"></div>
      </div>
      <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
      <div className="grid grid-cols-3 gap-4">
        <div className="h-16 bg-gray-200 rounded"></div>
        <div className="h-16 bg-gray-200 rounded"></div>
        <div className="h-16 bg-gray-200 rounded"></div>
      </div>
    </div>
  )

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

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">Error: {error}</p>
          </div>
        )}

        <div className="space-y-4">
          {loading ? (
            <>
              <SkeletonLoader />
              <SkeletonLoader />
              <SkeletonLoader />
            </>
          ) : appliedOpportunities.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <History className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No applied fixes</h3>
              <p className="mt-1 text-sm text-gray-500">Applied optimization recommendations will appear here.</p>
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
                    <p className="text-xs text-gray-600 flex items-center gap-1">
                      <DollarSign className="text-green-600" size={12} />
                      Monthly Savings
                    </p>
                    <p className="text-lg font-bold text-green-600">${opp.savings_usd.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 flex items-center gap-1">
                      <Leaf className="text-green-600" size={12} />
                      Carbon Reduction
                    </p>
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