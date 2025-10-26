'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { BarChart3, TrendingDown, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

export default function AnalysisPage() {
  const [data, setData] = useState<any>({
    costByWorkload: [],
    savingsByType: [],
    utilizationDistribution: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalysisData()
  }, [])

  async function fetchAnalysisData() {
    setLoading(true)

    // Fetch opportunities grouped by type
    const { data: opportunities } = await supabase
      .from('opportunities')
      .select('*')

    if (opportunities) {
      const savingsByType = opportunities.reduce((acc: any, opp: any) => {
        const existing = acc.find((item: any) => item.name === opp.opportunity_type)
        if (existing) {
          existing.value += opp.savings_usd
        } else {
          acc.push({ name: opp.opportunity_type, value: opp.savings_usd })
        }
        return acc
      }, [])

      setData({
        ...data,
        savingsByType
      })
    }

    setLoading(false)
  }

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

        {/* Savings by Opportunity Type */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Savings by Opportunity Type</h2>
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
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* More charts can be added here */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">Coming Soon</h2>
          <p className="text-gray-600">Additional analysis charts and insights will appear here.</p>
        </div>
      </div>
    </div>
  )
}