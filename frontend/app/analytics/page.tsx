'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts'
import { DollarSign, Leaf, Server, Calendar } from 'lucide-react'

type AnalyticsData = {
  date: string
  cost_savings: number
  carbon_reduction: number
  opportunities_identified: number
  workloads_optimized: number
}

type WorkloadDistribution = {
  name: string
  value: number
}

export default function AnalyticsPage() {
  const [supabase, setSupabase] = useState<any>(null)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([])
  const [workloadDistribution, setWorkloadDistribution] = useState<WorkloadDistribution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      fetchAnalyticsData()
    }
  }, [supabase])

  async function fetchAnalyticsData() {
    if (!supabase) return
    
    setLoading(true)
    
    try {
      // In a real implementation, you would fetch this data from your database
      // For now, we'll generate mock data
      const mockData: AnalyticsData[] = [
        { date: '2024-01-01', cost_savings: 1200, carbon_reduction: 450, opportunities_identified: 12, workloads_optimized: 8 },
        { date: '2024-02-01', cost_savings: 1800, carbon_reduction: 620, opportunities_identified: 18, workloads_optimized: 12 },
        { date: '2024-03-01', cost_savings: 2100, carbon_reduction: 780, opportunities_identified: 22, workloads_optimized: 15 },
        { date: '2024-04-01', cost_savings: 1900, carbon_reduction: 710, opportunities_identified: 19, workloads_optimized: 14 },
        { date: '2024-05-01', cost_savings: 2400, carbon_reduction: 890, opportunities_identified: 25, workloads_optimized: 18 },
        { date: '2024-06-01', cost_savings: 2700, carbon_reduction: 980, opportunities_identified: 28, workloads_optimized: 21 },
      ]
      
      setAnalyticsData(mockData)
      
      // Mock workload distribution data
      const mockDistribution: WorkloadDistribution[] = [
        { name: 'Deployments', value: 45 },
        { name: 'StatefulSets', value: 25 },
        { name: 'DaemonSets', value: 15 },
        { name: 'Jobs', value: 10 },
        { name: 'CronJobs', value: 5 },
      ]
      
      setWorkloadDistribution(mockDistribution)
    } catch (err) {
      setError('Failed to fetch analytics data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

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
            <BarChart className="text-green-600" />
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 mt-2">Detailed insights into your Kubernetes cost and carbon optimization</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-gray-500">Loading analytics data...</p>
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Savings"
                value={`$${analyticsData.reduce((sum, data) => sum + data.cost_savings, 0).toLocaleString()}`}
                icon={<DollarSign className="text-green-600" />}
                color="green"
              />
              <StatCard
                title="Carbon Reduction"
                value={`${(analyticsData.reduce((sum, data) => sum + data.carbon_reduction, 0) / 1000).toFixed(2)} kg`}
                icon={<Leaf className="text-green-600" />}
                color="green"
              />
              <StatCard
                title="Workloads Optimized"
                value={analyticsData.reduce((sum, data) => sum + data.workloads_optimized, 0)}
                icon={<Server className="text-blue-600" />}
                color="blue"
              />
              <StatCard
                title="Avg. Opportunities/Month"
                value={(analyticsData.reduce((sum, data) => sum + data.opportunities_identified, 0) / analyticsData.length).toFixed(1)}
                icon={<Calendar className="text-purple-600" />}
                color="purple"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Cost Savings Over Time */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">Cost Savings Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="cost_savings" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Carbon Reduction Over Time */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">Carbon Reduction Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="carbon_reduction" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Opportunities Identified */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">Opportunities Identified Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="opportunities_identified" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Workload Distribution */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">Workload Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={workloadDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${((percent as number) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color }: any) {
  const bgColors: any = {
    green: 'bg-green-50 border-green-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    blue: 'bg-blue-50 border-blue-200',
    purple: 'bg-purple-50 border-purple-200'
  }

  return (
    <div className={`${bgColors[color]} border-2 rounded-lg p-6`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {icon}
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  )
}