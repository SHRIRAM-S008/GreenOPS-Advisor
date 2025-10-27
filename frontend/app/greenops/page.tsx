'use client'

import { useState, useEffect, useRef } from 'react'
import { Leaf, Cpu, Database, Zap, TrendingDown, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import RefreshButton from '@/components/RefreshButton'

// Define types for our metrics data
type CostMetric = {
  id: string;
  workload_id: string;
  timestamp: string;
  cpu_cost_usd: number;
  memory_cost_usd: number;
  storage_cost_usd: number;
  total_cost_usd: number;
  cpu_cores_requested: number;
  cpu_cores_used: number;
  memory_gb_requested: number;
  memory_gb_used: number;
}

type EnergyMetric = {
  id: string;
  workload_id: string;
  timestamp: string;
  energy_joules: number;
  carbon_gco2e: number;
  power_watts: number;
}

type Workload = {
  id: string;
  namespace_id: string;
  name: string;
  kind: string;
  replicas: number;
  created_at: string;
  namespaces: {
    name: string;
    clusters: {
      name: string;
    }
  }
}

type MetricsData = {
  cost_metrics: CostMetric[];
  energy_metrics: EnergyMetric[];
  workloads: Workload[];
}

export default function GreenOpsDashboard() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [aiInsights, setAiInsights] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [realtimeEnabled, setRealtimeEnabled] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const originalMetricsRef = useRef<MetricsData | null>(null)

  useEffect(() => {
    fetchData()

    // Subscribe to real-time changes for metrics data
    if (realtimeEnabled) {
      const channels = [
        supabase
          .channel('cost-metrics-changes')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'cost_metrics' },
            (payload) => {
              // Handle insert/update/delete
              fetchData()
            }
          )
          .subscribe(),
        supabase
          .channel('energy-metrics-changes')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'energy_metrics' },
            (payload) => {
              // Handle insert/update/delete
              fetchData()
            }
          )
          .subscribe(),
        supabase
          .channel('workloads-changes')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'workloads' },
            (payload) => {
              // Handle insert/update/delete
              fetchData()
            }
          )
          .subscribe()
      ]

      return () => {
        channels.forEach(channel => supabase.removeChannel(channel))
      }
    }
  }, [realtimeEnabled])

  // Effect for simulating real-time data changes every second
  useEffect(() => {
    if (realtimeEnabled && metrics && !loading) {
      // Start interval to update data every second
      intervalRef.current = setInterval(() => {
        setMetrics(prevMetrics => {
          if (!prevMetrics) return prevMetrics
          
          // Create a deep copy of the metrics
          const updatedMetrics: MetricsData = JSON.parse(JSON.stringify(prevMetrics))
          
          // Update cost metrics with small random variations
          if (updatedMetrics.cost_metrics) {
            updatedMetrics.cost_metrics = updatedMetrics.cost_metrics.map((metric: CostMetric) => {
              // Add small random variations to simulate real-time changes
              const variation = (Math.random() - 0.5) * 0.1 // -5% to +5% variation
              return {
                ...metric,
                cpu_cost_usd: Math.max(0, metric.cpu_cost_usd * (1 + variation)),
                memory_cost_usd: Math.max(0, metric.memory_cost_usd * (1 + variation)),
                total_cost_usd: Math.max(0, metric.total_cost_usd * (1 + variation)),
                cpu_cores_used: Math.max(0, metric.cpu_cores_used * (1 + variation)),
                memory_gb_used: Math.max(0, metric.memory_gb_used * (1 + variation))
              }
            })
          }
          
          // Update energy metrics with small random variations
          if (updatedMetrics.energy_metrics) {
            updatedMetrics.energy_metrics = updatedMetrics.energy_metrics.map((metric: EnergyMetric) => {
              // Add small random variations to simulate real-time changes
              const variation = (Math.random() - 0.5) * 0.1 // -5% to +5% variation
              return {
                ...metric,
                energy_joules: Math.max(0, metric.energy_joules * (1 + variation)),
                carbon_gco2e: Math.max(0, metric.carbon_gco2e * (1 + variation)),
                power_watts: Math.max(0, metric.power_watts * (1 + variation))
              }
            })
          }
          
          return updatedMetrics
        })
      }, 1000) // Update every 1000ms (1 second)
    } else {
      // Clear interval if realtime is disabled or data is loading
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    
    // Cleanup interval on component unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [realtimeEnabled, metrics, loading])

  async function fetchData() {
    setLoading(true)
    setError(null)
    
    try {
      // Fetch GreenOps data
      const metricsResponse = await fetch('/api/greendata')
      if (!metricsResponse.ok) {
        throw new Error('Failed to fetch GreenOps data')
      }
      const metricsData: MetricsData = await metricsResponse.json()
      
      // Store original metrics for reference
      originalMetricsRef.current = JSON.parse(JSON.stringify(metricsData))
      setMetrics(metricsData)

      // Fetch AI insights
      const insightsResponse = await fetch('/api/ai-insights')
      if (!insightsResponse.ok) {
        throw new Error('Failed to fetch AI insights')
      }
      const insightsData = await insightsResponse.json()
      setAiInsights(insightsData)
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleRealtime = () => {
    setRealtimeEnabled(!realtimeEnabled)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <p className="text-xl text-gray-600">Loading GreenOps data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl">
          <h2 className="text-2xl font-bold text-red-800 mb-4">Error</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <button 
            onClick={fetchData}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Calculate summary statistics from the metrics data
  let totalCost = 0;
  let averageCPU = 0;
  let workloadCount = 0;
  
  if (metrics && metrics.cost_metrics && metrics.cost_metrics.length > 0) {
    totalCost = metrics.cost_metrics.reduce((sum: number, metric: CostMetric) => sum + (metric.total_cost_usd || 0), 0);
    averageCPU = metrics.cost_metrics.reduce((sum: number, metric: CostMetric) => sum + (metric.cpu_cores_used || 0), 0) / metrics.cost_metrics.length;
  }
  
  if (metrics && metrics.workloads) {
    workloadCount = metrics.workloads.length;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                <Leaf className="text-green-600" size={40} />
                GreenOps Dashboard
              </h1>
              <p className="text-gray-600 mt-2">AI-Powered Kubernetes Cost & Carbon Optimization</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleRealtime}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                  realtimeEnabled 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                {realtimeEnabled ? 'Real-time ON' : 'Real-time OFF'}
              </button>
              <RefreshButton onRefresh={fetchData} />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border-2 border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Cost</h3>
              <Database className="text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              ${totalCost.toFixed(2)}
            </p>
          </div>
          <div className="bg-white border-2 border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Avg CPU Usage</h3>
              <Cpu className="text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {averageCPU.toFixed(2)} cores
            </p>
          </div>
          <div className="bg-white border-2 border-yellow-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Workloads</h3>
              <Zap className="text-yellow-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {workloadCount}
            </p>
          </div>
          <div className="bg-white border-2 border-purple-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">AI Recommendation</h3>
              <TrendingDown className="text-purple-600" />
            </div>
            <p className="text-lg font-bold text-gray-900">
              {aiInsights?.suggestion || 'Analyzing...'}
            </p>
          </div>
        </div>

        {/* AI Insights Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Zap className="text-yellow-500" />
            AI-Powered Insights
          </h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-lg">
              <span className="font-semibold">Recommendation:</span> {aiInsights?.suggestion || 'Analyzing workload patterns...'}
            </p>
          </div>
        </div>

        {/* Raw Data Section */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Raw Metrics Data</h2>
          <div className="overflow-x-auto">
            <pre className="bg-gray-100 p-4 rounded-lg text-sm">
              {JSON.stringify(metrics, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}