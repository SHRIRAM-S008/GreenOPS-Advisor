'use client'

import { useState, useEffect } from 'react'
import { GitPullRequest, ExternalLink, DollarSign, Leaf } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function PREventsPage() {
  const [prEvents, setPREvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPREvents()

    // Subscribe to real-time changes
    const channel = supabase
      .channel('pr-events-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pr_events' },
        (payload) => {
          fetchPREvents()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchPREvents() {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('pr_events')
        .select('*, workloads(name, kind)')
        .order('timestamp', { ascending: false })
        .limit(50)

      if (error) {
        setError(error.message)
        console.error('Error:', error)
      } else {
        setPREvents(data || [])
      }
    } catch (err) {
      setError('Failed to fetch PR events')
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
          <div className="h-5 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
        <div className="h-5 bg-gray-200 rounded w-20"></div>
      </div>
      <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
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
            <GitPullRequest className="text-purple-600" />
            GitHub PR Events
          </h1>
          <p className="text-gray-600 mt-1">Track pull requests analyzed by GreenOps Advisor</p>
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
          ) : prEvents.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <GitPullRequest className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No PR events</h3>
              <p className="mt-1 text-sm text-gray-500">Connect your GitHub repository to see PR analysis events.</p>
            </div>
          ) : (
            prEvents.map((pr) => (
              <div key={pr.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      PR #{pr.pr_number} - {pr.repo_full_name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(pr.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <a
                    href={pr.pr_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                  >
                    View PR <ExternalLink size={16} />
                  </a>
                </div>

                {pr.workloads && (
                  <p className="text-gray-700 mb-3">
                    Workload: {pr.workloads.name} ({pr.workloads.kind})
                  </p>
                )}

                <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4">
                  <div>
                    <p className="text-xs text-gray-600 flex items-center gap-1">
                      <DollarSign className="text-green-600" size={12} />
                      Cost Impact
                    </p>
                    <p className={`text-lg font-bold ${pr.delta_cost_usd < 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {pr.delta_cost_usd < 0 ? '-' : '+'}${Math.abs(pr.delta_cost_usd).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 flex items-center gap-1">
                      <Leaf className="text-green-600" size={12} />
                      Carbon Impact
                    </p>
                    <p className={`text-lg font-bold ${pr.delta_carbon_gco2e < 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {pr.delta_carbon_gco2e < 0 ? '-' : '+'}
                      {Math.abs(pr.delta_carbon_gco2e / 1000).toFixed(2)} kg
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Risk Assessment</p>
                    <p className="text-lg font-bold text-gray-800">{pr.risk_assessment}</p>
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