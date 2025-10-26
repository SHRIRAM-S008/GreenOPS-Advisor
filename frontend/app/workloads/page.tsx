'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Server, Play, Pause, RotateCcw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

type Workload = {
  id: string
  name: string
  namespace: string
  kind: string
  status: 'running' | 'stopped' | 'pending' | 'error'
  cpu_request: number
  cpu_limit: number
  memory_request: number
  memory_limit: number
  last_updated: string
  optimization_status: 'optimized' | 'needs_attention' | 'not_optimized'
}

export default function WorkloadsPage() {
  const [supabase, setSupabase] = useState<any>(null)
  const [workloads, setWorkloads] = useState<Workload[]>([])
  const [filteredWorkloads, setFilteredWorkloads] = useState<Workload[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      setError('Missing Supabase environment variables')
      return
    }
    
    try {
      const client = createClient(supabaseUrl, supabaseKey)
      setSupabase(client)
    } catch (err) {
      setError('Failed to initialize Supabase client')
      console.error(err)
    }
  }, [])

  useEffect(() => {
    if (supabase) {
      fetchWorkloads()
    }
  }, [supabase])

  useEffect(() => {
    // Apply filter when it changes
    if (filter === 'all') {
      setFilteredWorkloads(workloads)
    } else {
      setFilteredWorkloads(workloads.filter(workload => workload.optimization_status === filter))
    }
  }, [filter, workloads])

  async function fetchWorkloads() {
    if (!supabase) return
    
    setLoading(true)
    
    try {
      // In a real implementation, you would fetch this data from your database
      // For now, we'll generate mock data
      const mockWorkloads: Workload[] = [
        {
          id: '1',
          name: 'frontend-app',
          namespace: 'default',
          kind: 'Deployment',
          status: 'running',
          cpu_request: 0.5,
          cpu_limit: 1,
          memory_request: 512,
          memory_limit: 1024,
          last_updated: '2024-06-15T10:30:00Z',
          optimization_status: 'optimized'
        },
        {
          id: '2',
          name: 'backend-api',
          namespace: 'production',
          kind: 'StatefulSet',
          status: 'running',
          cpu_request: 1,
          cpu_limit: 2,
          memory_request: 1024,
          memory_limit: 2048,
          last_updated: '2024-06-15T09:15:00Z',
          optimization_status: 'needs_attention'
        },
        {
          id: '3',
          name: 'database',
          namespace: 'production',
          kind: 'StatefulSet',
          status: 'running',
          cpu_request: 2,
          cpu_limit: 4,
          memory_request: 2048,
          memory_limit: 4096,
          last_updated: '2024-06-14T14:20:00Z',
          optimization_status: 'not_optimized'
        },
        {
          id: '4',
          name: 'cache-service',
          namespace: 'staging',
          kind: 'Deployment',
          status: 'running',
          cpu_request: 0.25,
          cpu_limit: 0.5,
          memory_request: 256,
          memory_limit: 512,
          last_updated: '2024-06-15T11:45:00Z',
          optimization_status: 'optimized'
        },
        {
          id: '5',
          name: 'monitoring-agent',
          namespace: 'monitoring',
          kind: 'DaemonSet',
          status: 'running',
          cpu_request: 0.1,
          cpu_limit: 0.2,
          memory_request: 128,
          memory_limit: 256,
          last_updated: '2024-06-15T08:30:00Z',
          optimization_status: 'optimized'
        }
      ]
      
      setWorkloads(mockWorkloads)
      setFilteredWorkloads(mockWorkloads)
    } catch (err) {
      setError('Failed to fetch workloads data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Play className="text-green-500" size={16} />
      case 'stopped':
        return <Pause className="text-red-500" size={16} />
      case 'pending':
        return <RotateCcw className="text-yellow-500" size={16} />
      case 'error':
        return <XCircle className="text-red-500" size={16} />
      default:
        return <Play className="text-gray-500" size={16} />
    }
  }

  const getOptimizationStatusIcon = (status: string) => {
    switch (status) {
      case 'optimized':
        return <CheckCircle className="text-green-500" size={16} />
      case 'needs_attention':
        return <AlertTriangle className="text-yellow-500" size={16} />
      case 'not_optimized':
        return <XCircle className="text-red-500" size={16} />
      default:
        return <AlertTriangle className="text-gray-500" size={16} />
    }
  }

  const formatBytes = (bytes: number) => {
    return `${bytes} Mi`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl">
          <h2 className="text-2xl font-bold text-red-800 mb-4">Error</h2>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <Server className="text-green-600" size={40} />
            Workloads Management
          </h1>
          <p className="text-gray-600 mt-2">Monitor and manage your Kubernetes workloads</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'all' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All Workloads
          </button>
          <button
            onClick={() => setFilter('optimized')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              filter === 'optimized' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <CheckCircle size={16} />
            Optimized
          </button>
          <button
            onClick={() => setFilter('needs_attention')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              filter === 'needs_attention' 
                ? 'bg-yellow-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <AlertTriangle size={16} />
            Needs Attention
          </button>
          <button
            onClick={() => setFilter('not_optimized')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              filter === 'not_optimized' 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <XCircle size={16} />
            Not Optimized
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-gray-500">Loading workloads...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Workload
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CPU (req/lim)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Memory (req/lim)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Optimization
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredWorkloads.map((workload) => (
                  <tr key={workload.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <Server className="text-green-600" size={20} />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{workload.name}</div>
                          <div className="text-sm text-gray-500">{workload.namespace}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{workload.kind}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(workload.status)}
                        <span className="ml-2 text-sm capitalize">{workload.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {workload.cpu_request} / {workload.cpu_limit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatBytes(workload.memory_request)} / {formatBytes(workload.memory_limit)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getOptimizationStatusIcon(workload.optimization_status)}
                        <span className="ml-2 text-sm capitalize">
                          {workload.optimization_status.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(workload.last_updated)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-green-600 hover:text-green-900 mr-3">
                        Optimize
                      </button>
                      <button className="text-blue-600 hover:text-blue-900">
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}