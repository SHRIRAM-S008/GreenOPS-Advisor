'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { DollarSign, Leaf, AlertTriangle, TrendingDown, Server, Activity } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Opportunity } from '@/types/supabase'
import RefreshButton from '@/components/RefreshButton'
import RealTimeMetrics from '@/components/RealTimeMetrics'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export default function Dashboard() {
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
  const [message, setMessage] = useState<string | null>(null)
  // Add state for apply fix functionality
  const [applyFixState, setApplyFixState] = useState<Record<string, ApplyFixState>>({})
  const router = useRouter()

  // Add new state for managing apply fix functionality
  interface ApplyFixState {
    loading: boolean;
    error: string | null;
    success: boolean;
    patch: string | null;
    prUrl: string | null;
    kubectlCommand: string | null;
  }

  useEffect(() => {
    fetchData()

    // Subscribe to real-time changes for opportunities
    const opportunitiesChannel = supabase
      .channel('opportunities-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'opportunities' },
        (payload) => {
          fetchData()
        }
      )
      .subscribe()

    // Subscribe to real-time changes for workloads
    const workloadsChannel = supabase
      .channel('workloads-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workloads' },
        (payload) => {
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(opportunitiesChannel)
      supabase.removeChannel(workloadsChannel)
    }
  }, [])

  async function fetchData() {
    setLoading(true)
    setError(null)
    
    try {
      // Fetch opportunities
      const { data: opps, error } = await supabase
        .from('opportunities')
        .select('*, workloads(name, kind, namespaces(name))')
        .eq('status', 'pending')
        .order('savings_usd', { ascending: false })
        .limit(20)
      
      if (error) {
        setError(error.message)
        console.error('Error fetching opportunities:', error)
      } else {
        setOpportunities(opps || [])
        
        // Calculate stats
        const totalSavings = opps?.reduce((sum, opp) => sum + opp.savings_usd, 0) || 0
        const carbonReduction = opps?.reduce((sum, opp) => sum + opp.carbon_reduction_gco2e, 0) || 0
        
        setStats({
          totalSavings,
          carbonReduction,
          opportunityCount: opps?.length || 0,
          workloadCount: new Set(opps?.map((o) => o.workload_id)).size || 0
        })
      }
    } catch (err) {
      setError('Failed to fetch data')
      console.error('Error:', err)
    }
    
    setLoading(false)
  }

  async function collectMetrics() {
    setCollecting(true)
    setMessage(null)
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
      setMessage(`Collected metrics for ${data.workloads_processed} workloads`)
      fetchData()
    } catch (error) {
      console.error('Error collecting metrics:', error)
      setMessage(`Error collecting metrics: ${(error as Error).message}`)
    }
    setCollecting(false)
  }

  async function analyzeWorkloads() {
    setAnalyzing(true)
    setMessage(null)
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
      setMessage(`Created ${data.opportunities_created} new opportunities`)
      fetchData()
    } catch (error) {
      console.error('Error analyzing workloads:', error)
      setMessage(`Error analyzing workloads: ${(error as Error).message}`)
    }
    setAnalyzing(false)
  }

  // Add the applyFix function
  async function applyFix(opportunityId: string) {
    // Set loading state for this specific opportunity
    setApplyFixState(prev => ({
      ...prev,
      [opportunityId]: {
        loading: true,
        error: null,
        success: false,
        patch: null,
        prUrl: null,
        kubectlCommand: null
      }
    }))

    try {
      const response = await fetch('/api/apply-fix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          opportunityId,
          createPr: false // Set to true if you want to create a PR instead
        })
      })

      if (!response.ok) {
        throw new Error('Failed to apply fix')
      }

      const data = await response.json()

      // Update state with the result
      setApplyFixState(prev => ({
        ...prev,
        [opportunityId]: {
          loading: false,
          error: null,
          success: true,
          patch: data.patch,
          prUrl: data.pr?.url || null,
          kubectlCommand: data.kubectlCommand || null
        }
      }))

      // Show success message
      setMessage('Fix applied successfully! Check the download prompt.')
      
      // If we have a patch, trigger download
      if (data.patch) {
        const blob = new Blob([data.patch], { type: 'application/yaml' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `optimization-patch-${opportunityId}.yaml`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error applying fix:', error)
      setApplyFixState(prev => ({
        ...prev,
        [opportunityId]: {
          loading: false,
          error: (error as Error).message,
          success: false,
          patch: null,
          prUrl: null,
          kubectlCommand: null
        }
      }))
      setMessage(`Error applying fix: ${(error as Error).message}`)
    }
  }

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']

  // Show error message if there's an initialization error
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
              <Leaf className="text-green-600" size={40} />
              GreenOps Advisor
            </h1>
            <RefreshButton onRefresh={fetchData} />
          </div>
          <p className="text-gray-600 mt-2">AI-Powered Kubernetes Cost & Carbon Optimization</p>
        </div>

        {/* Message Notification */}
        {message && (
          <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
            <p>{message}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border-2 border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Potential Monthly Savings</h3>
              <DollarSign className="text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">${stats.totalSavings.toFixed(2)}</p>
          </div>
          <div className="bg-white border-2 border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Carbon Reduction</h3>
              <Leaf className="text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{(stats.carbonReduction / 1000).toFixed(2)} kg</p>
          </div>
          <div className="bg-white border-2 border-yellow-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Opportunities Found</h3>
              <AlertTriangle className="text-yellow-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.opportunityCount}</p>
          </div>
          <div className="bg-white border-2 border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Workloads Analyzed</h3>
              <Server className="text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.workloadCount}</p>
          </div>
        </div>

        {/* Real-time Metrics */}
        <div className="mb-8">
          <RealTimeMetrics />
        </div>

        {/* Action Buttons */}
        <div className="mb-8 flex gap-4 flex-wrap">
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

        {/* Opportunities List */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <TrendingDown className="text-blue-600" />
              Top Savings Opportunities
            </h2>
            <RefreshButton onRefresh={fetchData} />
          </div>
          
          {loading ? (
            <p className="text-gray-500">Loading opportunities...</p>
          ) : opportunities.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No opportunities found</h3>
              <p className="mt-1 text-sm text-gray-500">Collect metrics and analyze workloads to get started.</p>
              <div className="mt-6">
                <button
                  onClick={collectMetrics}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                >
                  <Activity className="-ml-1 mr-2 h-5 w-5" />
                  Collect Metrics
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {opportunities.map((opp) => (
                <div key={opp.id} className="border-2 border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">
                        {opp.workloads.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {opp.workloads.kind} • {opp.workloads.namespaces.name}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${
                      opp.risk_level === 'low' ? 'text-green-600 bg-green-50 border-green-200' :
                      opp.risk_level === 'medium' ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
                      opp.risk_level === 'high' ? 'text-red-600 bg-red-50 border-red-200' :
                      'text-gray-600 bg-gray-50 border-gray-200'
                    }`}>
                      {opp.risk_level.toUpperCase()} RISK
                    </span>
                  </div>
                  
                  <p className="text-gray-700 mb-4">{opp.explanation}</p>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Monthly Savings</p>
                      <p className="text-xl font-bold text-green-600">${opp.savings_usd.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Carbon Reduction</p>
                      <p className="text-xl font-bold text-green-600">{(opp.carbon_reduction_gco2e / 1000).toFixed(2)} kg</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Confidence</p>
                      <p className="text-xl font-bold text-blue-600">{(opp.confidence_score * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => router.push(`/opportunities/${opp.id}`)}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      View Details
                    </button>
                    <button 
                      onClick={() => applyFix(opp.id)}
                      disabled={applyFixState[opp.id]?.loading}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {applyFixState[opp.id]?.loading ? 'Applying...' : 'Apply Fix'}
                    </button>
                  </div>
                </div>
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