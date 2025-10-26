'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, DollarSign, Leaf } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Opportunity } from '@/types/supabase'
import { formatCurrency, formatCarbon, getStatusColor } from '@/lib/utils'
import RefreshButton from '@/components/RefreshButton'

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchOpportunities()

    // Subscribe to real-time changes
    const channel = supabase
      .channel('opportunities-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'opportunities' },
        (payload) => {
          // Handle insert/update/delete
          fetchOpportunities()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [filter])

  async function fetchOpportunities() {
    try {
      setLoading(true)
      setError(null)
      
      let query = supabase
        .from('opportunities')
        .select('*, workloads(name, kind, namespaces(name))')
        .order('savings_usd', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) {
        setError(error.message)
        console.error('Error:', error)
      } else {
        setOpportunities(data || [])
      }
    } catch (err) {
      setError('Failed to fetch opportunities')
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
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <AlertTriangle className="text-yellow-600" />
              All Opportunities
            </h1>
            <RefreshButton onRefresh={fetchOpportunities} />
          </div>
          <p className="text-gray-600 mt-1">Review and apply optimization recommendations</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-2 flex-wrap">
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

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">Error: {error}</p>
            <button 
              onClick={fetchOpportunities}
              className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
              {formatCurrency(opportunities.reduce((sum, o) => sum + o.savings_usd, 0))}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="text-green-600" size={20} />
              <span className="text-sm text-gray-600">Carbon Reduction</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {formatCarbon(opportunities.reduce((sum, o) => sum + o.carbon_reduction_gco2e, 0))}
            </p>
          </div>
        </div>

        {/* Opportunities List */}
        <div className="space-y-4">
          {loading ? (
            <>
              <SkeletonLoader />
              <SkeletonLoader />
              <SkeletonLoader />
            </>
          ) : opportunities.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No opportunities found</h3>
              <p className="mt-1 text-sm text-gray-500">Check back later for new optimization recommendations.</p>
            </div>
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
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(opp.status)}`}>
                    {opp.status.toUpperCase()}
                  </span>
                </div>

                <p className="text-gray-700 mb-4">{opp.explanation}</p>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-600">Monthly Savings</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(opp.savings_usd)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Carbon Reduction</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCarbon(opp.carbon_reduction_gco2e)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Confidence</p>
                    <p className="text-lg font-bold text-blue-600">
                      {((opp.confidence_score || 0) * 100).toFixed(0)}%
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