'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { DollarSign, Leaf, AlertTriangle, TrendingDown, Server, Activity } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL

// Define types for our data
type Opportunity = {
  id: string
  workload_id: string
  savings_usd: number
  carbon_reduction_gco2e: number
  confidence_score: number
  risk_level: string
  explanation: string
  opportunity_type: string
  workloads: {
    name: string
    kind: string
    namespaces: {
      name: string
    }
  }
}

export default function Dashboard() {
  const [supabase, setSupabase] = useState<any>(null)
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [stats, setStats] = useState({
    totalSavings: 0,
    carbonReduction: 0,
    opportunityCount: 0,
    workloadCount: 0
  })
  const [loading, setLoading] = useState(true)
  const [collecting, setCollecting] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if environment variables are set
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl) {
      setError('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
      return
    }
    
    if (!supabaseKey) {
      setError('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
      return
    }
    
    // Initialize Supabase client when component mounts
    try {
      const client = createClient(supabaseUrl, supabaseKey)
      setSupabase(client)
    } catch (err) {
      setError('Failed to initialize Supabase client: ' + (err as Error).message)
      console.error('Supabase client initialization error:', err)
    }
  }, [])

  useEffect(() => {
    if (supabase) {
      fetchData()
    }
  }, [supabase])

  async function fetchData() {
    if (!supabase) return
    
    setLoading(true)
    
    // Fetch opportunities
    const { data: opps, error } = await supabase
      .from('opportunities')
      .select('*, workloads(name, kind, namespaces(name))')
      .eq('status', 'pending')
      .order('savings_usd', { ascending: false })
      .limit(20)
    
    if (error) {
      console.error('Error fetching opportunities:', error)
      // More detailed error logging
      console.error('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.error('Supabase Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      // Show user-friendly error message
      alert('Failed to fetch opportunities. Please check the console for details.')
    } else {
      setOpportunities(opps || [])
      
      // Calculate stats
      const totalSavings = opps?.reduce((sum: number, opp: Opportunity) => sum + opp.savings_usd, 0) || 0
      const carbonReduction = opps?.reduce((sum: number, opp: Opportunity) => sum + opp.carbon_reduction_gco2e, 0) || 0
      
      setStats({
        totalSavings,
        carbonReduction,
        opportunityCount: opps?.length || 0,
        workloadCount: new Set(opps?.map((o: Opportunity) => o.workload_id)).size || 0
      })
    }
    
    setLoading(false)
  }

  async function collectMetrics() {
    setCollecting(true)
    try {
      if (!API_URL) {
        throw new Error('NEXT_PUBLIC_API_URL environment variable is not set')
      }
      
      const response = await fetch(`${API_URL}/collect_metrics`, { method: 'POST' })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
      
      const data = await response.json()
      alert(`Collected metrics for ${data.workloads_processed} workloads`)
      fetchData()
    } catch (error) {
      console.error('Error collecting metrics:', error)
      alert(`Error collecting metrics: ${(error as Error).message}`)
    }
    setCollecting(false)
  }

  async function analyzeWorkloads() {
    setAnalyzing(true)
    try {
      if (!API_URL) {
        throw new Error('NEXT_PUBLIC_API_URL environment variable is not set')
      }
      
      const response = await fetch(`${API_URL}/analyze`, { method: 'POST' })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
      
      const data = await response.json()
      alert(`Created ${data.opportunities_created} new opportunities`)
      fetchData()
    } catch (error) {
      console.error('Error analyzing workloads:', error)
      alert(`Error analyzing workloads: ${(error as Error).message}`)
    }
    setAnalyzing(false)
  }

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']

  // Show error message if there's an initialization error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl">
          <h2 className="text-2xl font-bold text-red-800 mb-4">Configuration Error</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <p className="text-gray-600">
            Please check your environment variables in <code className="bg-gray-100 px-2 py-1 rounded">.env.local</code>
          </p>
          <div className="mt-4">
            <h3 className="font-semibold text-gray-800">Required variables:</h3>
            <ul className="list-disc pl-5 mt-2 text-gray-700">
              <li>NEXT_PUBLIC_SUPABASE_URL</li>
              <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
              <li>NEXT_PUBLIC_API_URL</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  // Add a loading state while Supabase is initializing
  if (!supabase) {
    return <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <Leaf className="text-green-600" size={40} />
            GreenOps Advisor
          </h1>
          <p className="text-gray-600 mt-2">AI-Powered Kubernetes Cost & Carbon Optimization</p>
        </div>

        {/* Action Buttons */}
        <div className="mb-8 flex gap-4">
          <button
            onClick={collectMetrics}
            disabled={collecting}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Activity size={20} />
            {collecting ? 'Collecting...' : 'Collect Metrics'}
          </button>
          <button
            onClick={analyzeWorkloads}
            disabled={analyzing}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Server size={20} />
            {analyzing ? 'Analyzing...' : 'Analyze Workloads'}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Potential Monthly Savings"
            value={`$${stats.totalSavings.toFixed(2)}`}
            icon={<DollarSign className="text-green-600" />}
            color="green"
          />
          <StatCard
            title="Carbon Reduction"
            value={`${(stats.carbonReduction / 1000).toFixed(2)} kg`}
            icon={<Leaf className="text-green-600" />}
            color="green"
          />
          <StatCard
            title="Opportunities Found"
            value={stats.opportunityCount}
            icon={<AlertTriangle className="text-yellow-600" />}
            color="yellow"
          />
          <StatCard
            title="Workloads Analyzed"
            value={stats.workloadCount}
            icon={<Server className="text-blue-600" />}
            color="blue"
          />
        </div>

        {/* Opportunities List */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <TrendingDown className="text-blue-600" />
            Top Savings Opportunities
          </h2>
          
          {loading ? (
            <p className="text-gray-500">Loading opportunities...</p>
          ) : opportunities.length === 0 ? (
            <p className="text-gray-500">No opportunities found. Collect metrics and analyze workloads to get started.</p>
          ) : (
            <div className="space-y-4">
              {opportunities.map((opp) => (
                <OpportunityCard key={opp.id} opportunity={opp} />
              ))}
            </div>
          )}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4">Savings by Workload</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={opportunities.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="workloads.name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="savings_usd" fill="#10b981" name="Savings ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4">Opportunity Types</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Rightsizing', value: opportunities.filter(o => o.opportunity_type === 'rightsizing').length },
                    { name: 'Scheduling', value: opportunities.filter(o => o.opportunity_type === 'scheduling').length },
                    { name: 'Image Optimization', value: opportunities.filter(o => o.opportunity_type === 'image-optimization').length }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
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
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color }: any) {
  const bgColors: any = {
    green: 'bg-green-50 border-green-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    blue: 'bg-blue-50 border-blue-200'
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

function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="border-2 border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-lg font-bold text-gray-900">
            {opportunity.workloads.name}
          </h4>
          <p className="text-sm text-gray-600">
            {opportunity.workloads.kind} • {opportunity.workloads.namespaces.name}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${getRiskColor(opportunity.risk_level)}`}>
          {opportunity.risk_level.toUpperCase()} RISK
        </span>
      </div>
      
      <p className="text-gray-700 mb-4">{opportunity.explanation}</p>
      
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Monthly Savings</p>
          <p className="text-xl font-bold text-green-600">${opportunity.savings_usd.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Carbon Reduction</p>
          <p className="text-xl font-bold text-green-600">{(opportunity.carbon_reduction_gco2e / 1000).toFixed(2)} kg</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Confidence</p>
          <p className="text-xl font-bold text-blue-600">{(opportunity.confidence_score * 100).toFixed(0)}%</p>
        </div>
      </div>
      
      <div className="flex gap-2">
        <button className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          View Details
        </button>
        <button className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
          Apply Fix
        </button>
      </div>
    </div>
  )
}