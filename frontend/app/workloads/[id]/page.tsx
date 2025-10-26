'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { ArrowLeft, Server, DollarSign, Zap } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function WorkloadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [workload, setWorkload] = useState<any>(null)
  const [costMetrics, setCostMetrics] = useState<any[]>([])
  const [energyMetrics, setEnergyMetrics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWorkloadDetail()
  }, [params.id])

  async function fetchWorkloadDetail() {
    setLoading(true)

    // Fetch workload
    const { data: workloadData, error: workloadError } = await supabase
      .from('workloads')
      .select('*, namespaces(name, clusters(name))')
      .eq('id', params.id)
      .single()

    if (workloadError) {
      console.error('Error:', workloadError)
    } else {
      setWorkload(workloadData)
    }

    // Fetch cost metrics (last 24 hours)
    const { data: costData, error: costError } = await supabase
      .from('cost_metrics')
      .select('*')
      .eq('workload_id', params.id)
      .order('timestamp', { ascending: true })
      .limit(100)

    if (!costError) {
      setCostMetrics(costData || [])
    }

    // Fetch energy metrics
    const { data: energyData, error: energyError } = await supabase
      .from('energy_metrics')
      .select('*')
      .eq('workload_id', params.id)
      .order('timestamp', { ascending: true })
      .limit(100)

    if (!energyError) {
      setEnergyMetrics(energyData || [])
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <p className="text-xl text-gray-600">Loading...</p>
      </div>
    )
  }

  if (!workload) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <p className="text-xl text-red-600">Workload not found</p>
      </div>
    )
  }

  // Prepare chart data
  const chartData = costMetrics.map((cost, index) => ({
    timestamp: new Date(cost.timestamp).toLocaleTimeString(),
    cost: cost.total_cost_usd,
    cpu: cost.cpu_cores_used,
    memory: cost.memory_gb_used,
    energy: energyMetrics[index]?.power_watts || 0
  }))

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.push('/workloads')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft size={20} />
          Back to Workloads
        </button>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Server className="text-blue-600" size={32} />
            <h1 className="text-3xl font-bold text-gray-900">{workload.name}</h1>
          </div>
          <p className="text-gray-600">
            {workload.kind} • {workload.namespaces.name} • {workload.namespaces.clusters.name}
          </p>
          <p className="text-gray-600 mt-1">Replicas: {workload.replicas}</p>
        </div>

        {/* Current Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="text-green-600" size={20} />
              <span className="text-sm text-gray-600">Current Cost/Hour</span>
            </div>
            <p className="text-2xl font-bold">
              ${costMetrics.length > 0 ? costMetrics[costMetrics.length - 1].total_cost_usd.toFixed(4) : '0.00'}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="text-yellow-600" size={20} />
              <span className="text-sm text-gray-600">Power Draw</span>
            </div>
            <p className="text-2xl font-bold">
              {energyMetrics.length > 0 ? energyMetrics[energyMetrics.length - 1].power_watts.toFixed(2) : '0'} W
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <span className="text-sm text-gray-600">CPU Utilization</span>
            <p className="text-2xl font-bold">
              {costMetrics.length > 0 ? ((costMetrics[costMetrics.length - 1].cpu_cores_used / costMetrics[costMetrics.length - 1].cpu_cores_requested) * 100).toFixed(1) : '0'}%
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <span className="text-sm text-gray-600">Memory Utilization</span>
            <p className="text-2xl font-bold">
              {costMetrics.length > 0 ? ((costMetrics[costMetrics.length - 1].memory_gb_used / costMetrics[costMetrics.length - 1].memory_gb_requested) * 100).toFixed(1) : '0'}%
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Cost Trend (Last 24 Hours)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="cost" stroke="#10b981" name="Cost ($)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">CPU & Memory Usage</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="cpu" stroke="#3b82f6" name="CPU (cores)" />
                <Line type="monotone" dataKey="memory" stroke="#8b5cf6" name="Memory (GB)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Power Consumption</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="energy" stroke="#f59e0b" name="Power (W)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}