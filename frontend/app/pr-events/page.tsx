'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { GitPullRequest, ExternalLink } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function PREventsPage() {
  const [prEvents, setPREvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPREvents()
  }, [])

  async function fetchPREvents() {
    setLoading(true)

    const { data, error } = await supabase
      .from('pr_events')
      .select('*, workloads(name, kind)')
      .order('timestamp', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error:', error)
    } else {
      setPREvents(data || [])
    }

    setLoading(false)
  }

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

        <div className="space-y-4">
          {loading ? (
            <p className="text-gray-500">Loading PR events...</p>
          ) : prEvents.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">No PR events yet. Connect your GitHub repository to get started.</p>
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
                    <p className="text-xs text-gray-600">Cost Impact</p>
                    <p className={`text-lg font-bold ${pr.delta_cost_usd < 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {pr.delta_cost_usd < 0 ? '-' : '+'}${Math.abs(pr.delta_cost_usd).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Carbon Impact</p>
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