'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Server, TrendingUp, TrendingDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Workload } from '@/types/supabase'

export default function WorkloadsPage() {
  const [workloads, setWorkloads] = useState<Workload[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchWorkloads()

    // Subscribe to real-time changes
    const channel = supabase
      .channel('workloads-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workloads' },
        (payload) => {
          // Handle insert/update/delete
          fetchWorkloads()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchWorkloads() {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('workloads')
        .select('*, namespaces(name, clusters(name))')
        .order('name')

      if (error) {
        setError(error.message)
        console.error('Error:', error)
      } else {
        setWorkloads(data || [])
      }
    } catch (err) {
      setError('Failed to fetch workloads')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Add skeleton loader component
  const SkeletonLoader = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-6 bg-gray-200 rounded w-16"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </td>
    </tr>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Server className="text-blue-600" />
            All Workloads
          </h1>
          <p className="text-gray-600 mt-1">Kubernetes workloads being monitored</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">Error: {error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Namespace</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Replicas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <>
                  <SkeletonLoader />
                  <SkeletonLoader />
                  <SkeletonLoader />
                </>
              ) : workloads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Server className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No workloads found</h3>
                    <p className="mt-1 text-sm text-gray-500">Check back later for new workloads.</p>
                  </td>
                </tr>
              ) : (
                workloads.map((workload) => (
                  <tr key={workload.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{workload.name}</td>
                    <td className="px-6 py-4 text-gray-600">{workload.kind}</td>
                    <td className="px-6 py-4 text-gray-600">{workload.namespaces.name}</td>
                    <td className="px-6 py-4 text-gray-600">{workload.replicas}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => router.push(`/workloads/${workload.id}`)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}