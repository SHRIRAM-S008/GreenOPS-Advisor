'use client'

import { useState, useEffect } from 'react'
import { BarChart3, TrendingDown, TrendingUp, DollarSign, Leaf } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis } from 'recharts'
import { supabase } from '@/lib/supabase'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

export default function AnalysisPage() {
  const [data, setData] = useState<any>({
    costByWorkload: [],
    savingsByType: [],
    utilizationDistribution: [],
    costCarbonCorrelation: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalysisData()

    // Subscribe to real-time changes
    const opportunitiesChannel = supabase
      .channel('opportunities-analysis')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'opportunities' },
        (payload) => {
          fetchAnalysisData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(opportunitiesChannel)
    }
  }, [])

  async function fetchAnalysisData() {
    try {
      setLoading(true)
      setError(null)

      // Fetch opportunities
      const { data: opportunities, error: opportunitiesError } = await supabase
        .from('opportunities')
        .select('*')

      if (opportunitiesError) {
        setError(opportunitiesError.message)
        return
      }

      if (opportunities) {
        // Savings by opportunity type
        const savingsByType = opportunities.reduce((acc: any, opp: any) => {
          const existing = acc.find((item: any) => item.name === opp.opportunity_type)
          if (existing) {
            existing.value += opp.savings_usd
          } else {
            acc.push({ name: opp.opportunity_type, value: opp.savings_usd })
          }
          return acc
        }, [])

        // Cost vs carbon correlation data
        const costCarbonCorrelation = opportunities.map((opp: any) => ({
          cost: opp.savings_usd,
          carbon: opp.carbon_reduction_gco2e,
          workload: opp.workload_id
        }))

        setData({
          savingsByType,
          costCarbonCorrelation
        })
      }
    } catch (err) {
      setError('Failed to fetch analysis data')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Add skeleton loader component
  const SkeletonLoader = () => (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="h-64 bg-gray-200 rounded"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="text-purple-600" />
            Detailed Analysis
          </h1>
          <p className="text-gray-600 mt-1">Comprehensive cost and carbon insights</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">Error: {error}</p>
          </div>
        )}

        {loading ? (
          <>
            <SkeletonLoader />
            <SkeletonLoader />
          </>
        ) : (
          <>
            {/* Savings by Opportunity Type */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <DollarSign className="text-green-600" />
                Savings by Opportunity Type
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.savingsByType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: $${(entry.value as number).toFixed(2)}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.savingsByType.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`$${value}`, 'Savings']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Cost vs Carbon Correlation */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Leaf className="text-green-600" />
                Cost vs Carbon Correlation
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid />
                  <XAxis type="number" dataKey="cost" name="Cost Savings ($)" />
                  <YAxis type="number" dataKey="carbon" name="Carbon Reduction (gCO2e)" />
                  <ZAxis range={[100, 100]} />
                  <Tooltip formatter={(value, name) => {
                    if (name === 'cost') return [`$${value}`, 'Cost Savings'];
                    if (name === 'carbon') return [`${value} gCO2e`, 'Carbon Reduction'];
                    return [value, name];
                  }} />
                  <Legend />
                  <Scatter name="Opportunities" data={data.costCarbonCorrelation} fill="#10b981" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Additional Insights */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">Insights</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900">Top Recommendation</h3>
                  <p className="text-gray-600 mt-2">
                    {data.savingsByType.length > 0 
                      ? `Focus on ${data.savingsByType.reduce((max: any, current: any) => 
                          current.value > max.value ? current : max, data.savingsByType[0]).name
                        } opportunities for maximum savings`
                      : "No recommendations available"}
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900">Carbon Efficiency</h3>
                  <p className="text-gray-600 mt-2">
                    {data.costCarbonCorrelation.length > 0
                      ? "Most opportunities provide both cost savings and carbon reduction"
                      : "No data available"}
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900">Next Steps</h3>
                  <p className="text-gray-600 mt-2">
                    Review opportunities in the Opportunities tab and apply recommendations
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}