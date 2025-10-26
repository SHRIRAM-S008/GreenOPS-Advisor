# 📄 **COMPLETE PAGE STRUCTURE FOR GREENOPS ADVISOR**

Here's **every page you need** to make GreenOps Advisor a fully functional multi-page application:

---

## 📁 **FULL FOLDER STRUCTURE**

```
~/greenops-advisor/frontend/
├── app/
│   ├── layout.tsx                    # Root layout (navigation, styling)
│   ├── page.tsx                      # Dashboard (home page) ✅ Already exists
│   ├── opportunities/
│   │   ├── page.tsx                  # All opportunities list
│   │   └── [id]/
│   │       └── page.tsx              # Single opportunity detail ✅ Already created
│   ├── workloads/
│   │   ├── page.tsx                  # All workloads list
│   │   └── [id]/
│   │       └── page.tsx              # Single workload detail
│   ├── analysis/
│   │   └── page.tsx                  # Detailed analysis & charts
│   ├── settings/
│   │   └── page.tsx                  # Configuration settings
│   ├── history/
│   │   └── page.tsx                  # Applied fixes history
│   └── pr-events/
│       └── page.tsx                  # GitHub PR integration events
├── components/
│   ├── Navigation.tsx                # Shared navigation bar
│   ├── StatCard.tsx                  # Reusable stat card
│   ├── OpportunityCard.tsx           # Reusable opportunity card
│   └── Chart.tsx                     # Reusable chart component
└── public/
    └── logo.svg                      # Your logo
```

---

## 🛠️ **CREATE ALL PAGES**

### **1. Root Layout with Navigation**

**File:** `~/greenops-advisor/frontend/app/layout.tsx`

```tsx
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Navigation from '@/components/Navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GreenOps Advisor',
  description: 'AI-Powered Kubernetes Cost & Carbon Optimization',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navigation />
        <main>{children}</main>
      </body>
    </html>
  )
}
```

---

### **2. Navigation Component**

**File:** `~/greenops-advisor/frontend/components/Navigation.tsx`

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Leaf, Home, AlertTriangle, Server, BarChart3, Settings, History, GitPullRequest } from 'lucide-react'

export default function Navigation() {
  const pathname = usePathname()

  const links = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/opportunities', label: 'Opportunities', icon: AlertTriangle },
    { href: '/workloads', label: 'Workloads', icon: Server },
    { href: '/analysis', label: 'Analysis', icon: BarChart3 },
    { href: '/history', label: 'History', icon: History },
    { href: '/pr-events', label: 'PR Events', icon: GitPullRequest },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Leaf className="text-green-600" size={32} />
            <span className="text-xl font-bold text-gray-900">GreenOps Advisor</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex gap-1">
            {links.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-green-50 text-green-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon size={18} />
                  <span className="hidden md:inline">{link.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
```

---

### **3. All Opportunities Page**

**File:** `~/greenops-advisor/frontend/app/opportunities/page.tsx`

```tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { AlertTriangle, DollarSign, Leaf } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchOpportunities()
  }, [filter])

  async function fetchOpportunities() {
    setLoading(true)
    
    let query = supabase
      .from('opportunities')
      .select('*, workloads(name, kind, namespaces(name))')
      .order('savings_usd', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error:', error)
    } else {
      setOpportunities(data || [])
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <AlertTriangle className="text-yellow-600" />
            All Opportunities
          </h1>
          <p className="text-gray-600 mt-1">Review and apply optimization recommendations</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-2">
            {['all', 'pending', 'approved', 'applied', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg capitalize ${
                  filter === status
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="text-yellow-600" size={20} />
              <span className="text-sm text-gray-600">Total Opportunities</span>
            </div>
            <p className="text-2xl font-bold">{opportunities.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="text-green-600" size={20} />
              <span className="text-sm text-gray-600">Potential Savings</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              ${opportunities.reduce((sum, o) => sum + o.savings_usd, 0).toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="text-green-600" size={20} />
              <span className="text-sm text-gray-600">Carbon Reduction</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {(opportunities.reduce((sum, o) => sum + o.carbon_reduction_gco2e, 0) / 1000).toFixed(2)} kg
            </p>
          </div>
        </div>

        {/* Opportunities List */}
        <div className="space-y-4">
          {loading ? (
            <p className="text-gray-500">Loading opportunities...</p>
          ) : opportunities.length === 0 ? (
            <p className="text-gray-500">No opportunities found.</p>
          ) : (
            opportunities.map((opp) => (
              <div
                key={opp.id}
                onClick={() => router.push(`/opportunities/${opp.id}`)}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg cursor-pointer transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{opp.workloads.name}</h3>
                    <p className="text-sm text-gray-600">
                      {opp.workloads.kind} • {opp.workloads.namespaces.name}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    opp.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    opp.status === 'applied' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {opp.status.toUpperCase()}
                  </span>
                </div>

                <p className="text-gray-700 mb-4">{opp.explanation}</p>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-600">Monthly Savings</p>
                    <p className="text-lg font-bold text-green-600">${opp.savings_usd.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Carbon Reduction</p>
                    <p className="text-lg font-bold text-green-600">
                      {(opp.carbon_reduction_gco2e / 1000).toFixed(2)} kg
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Confidence</p>
                    <p className="text-lg font-bold text-blue-600">
                      {(opp.confidence_score * 100).toFixed(0)}%
                    </p>
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
```

---

### **4. All Workloads Page**

**File:** `~/greenops-advisor/frontend/app/workloads/page.tsx`

```tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { Server, TrendingUp, TrendingDown } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function WorkloadsPage() {
  const [workloads, setWorkloads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchWorkloads()
  }, [])

  async function fetchWorkloads() {
    setLoading(true)

    const { data, error } = await supabase
      .from('workloads')
      .select('*, namespaces(name, clusters(name))')
      .order('name')

    if (error) {
      console.error('Error:', error)
    } else {
      setWorkloads(data || [])
    }

    setLoading(false)
  }

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
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Loading workloads...
                  </td>
                </tr>
              ) : workloads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No workloads found
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
```

---

### **5. Single Workload Detail Page**

**File:** `~/greenops-advisor/frontend/app/workloads/[id]/page.tsx`

```tsx
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
```

---

### **6. Analysis Page**

**File:** `~/greenops-advisor/frontend/app/analysis/page.tsx`

```tsx
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
                label={(entry) => `${entry.name}: $${entry.value.toFixed(2)}`}
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
```

---

### **7. History Page**

**File:** `~/greenops-advisor/frontend/app/history/page.tsx`

```tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { History, CheckCircle } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function HistoryPage() {
  const [appliedOpportunities, setAppliedOpportunities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
  }, [])

  async function fetchHistory() {
    setLoading(true)

    const { data, error } = await supabase
      .from('opportunities')
      .select('*, workloads(name, kind, namespaces(name))')
      .eq('status', 'applied')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error:', error)
    } else {
      setAppliedOpportunities(data || [])
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <History className="text-blue-600" />
            Applied Fixes History
          </h1>
          <p className="text-gray-600 mt-1">Track all optimization changes that have been applied</p>
        </div>

        <div className="space-y-4">
          {loading ? (
            <p className="text-gray-500">Loading history...</p>
          ) : appliedOpportunities.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">No fixes have been applied yet.</p>
            </div>
          ) : (
            appliedOpportunities.map((opp) => (
              <div key={opp.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <CheckCircle className="text-green-600" size={24} />
                      {opp.workloads.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {opp.workloads.kind} • {opp.workloads.namespaces.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Applied: {new Date(opp.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                    APPLIED
                  </span>
                </div>

                <p className="text-gray-700 mb-4">{opp.explanation}</p>

                <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4">
                  <div>
                    <p className="text-xs text-gray-600">Monthly Savings</p>
                    <p className="text-lg font-bold text-green-600">${opp.savings_usd.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Carbon Reduction</p>
                    <p className="text-lg font-bold text-green-600">
                      {(opp.carbon_reduction_gco2e / 1000).toFixed(2)} kg
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Confidence</p>
                    <p className="text-lg font-bold text-blue-600">
                      {(opp.confidence_score * 100).toFixed(0)}%
                    </p>
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
```

---

### **8. PR Events Page**

**File:** `~/greenops-advisor/frontend/app/pr-events/page.tsx`

```tsx
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
```

---

### **9. Settings Page**

**File:** `~/greenops-advisor/frontend/app/settings/page.tsx`

```tsx
'use client'

import { Settings, Save } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Settings className="text-gray-600" />
            Settings
          </h1>
          <p className="text-gray-600 mt-1">Configure GreenOps Advisor</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Cluster Configuration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cluster Name
              </label>
              <input
                type="text"
                defaultValue="minikube-demo"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Carbon Intensity (g CO2e/kWh)
              </label>
              <input
                type="number"
                defaultValue="475"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prometheus URL
              </label>
              <input
                type="text"
                defaultValue="http://localhost:9090"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Cost Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CPU Cost ($/core/hour)
              </label>
              <input
                type="number"
                step="0.001"
                defaultValue="0.02"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Memory Cost ($/GB/hour)
              </label>
              <input
                type="number"
                step="0.001"
                defaultValue="0.005"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">GitHub Integration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GitHub App ID
              </label>
              <input
                type="text"
                placeholder="123456"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Webhook Secret
              </label>
              <input
                type="password"
                placeholder="Enter webhook secret"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        <button className="mt-6 w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">
          <Save size={20} />
          Save Settings
        </button>
      </div>
    </div>
  )
}
```

---

## 📦 **REUSABLE COMPONENTS**

### **Create Component Files**

**File:** `~/greenops-advisor/frontend/components/StatCard.tsx`

```tsx
interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color: 'green' | 'yellow' | 'blue' | 'red'
}

export default function StatCard({ title, value, icon, color }: StatCardProps) {
  const bgColors = {
    green: 'bg-green-50 border-green-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    blue: 'bg-blue-50 border-blue-200',
    red: 'bg-red-50 border-red-200'
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
```

---

**File:** `~/greenops-advisor/frontend/components/OpportunityCard.tsx`

```tsx
'use client'

import { useRouter } from 'next/navigation'

interface OpportunityCardProps {
  opportunity: any
}

export default function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const router = useRouter()

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
        <button 
          onClick={() => router.push(`/opportunities/${opportunity.id}`)}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          View Details
        </button>
        <button 
          onClick={() => router.push(`/opportunities/${opportunity.id}`)}
          className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Apply Fix
        </button>
      </div>
    </div>
  )
}
```

---

## ✅ **FINAL CHECKLIST**

- [ ] Created all page files
- [ ] Created Navigation component
- [ ] Created reusable components (StatCard, OpportunityCard)
- [ ] Updated layout.tsx to include Navigation
- [ ] Tested all routes work
- [ ] All buttons navigate correctly

---

## 🚀 **RUN & TEST**

```bash
cd ~/greenops-advisor/frontend
npm run dev
```

**Test Navigation:**
1. ✅ Dashboard → http://localhost:3000
2. ✅ Opportunities → http://localhost:3000/opportunities
3. ✅ Workloads → http://localhost:3000/workloads
4. ✅ Analysis → http://localhost:3000/analysis
5. ✅ History → http://localhost:3000/history
6. ✅ PR Events → http://localhost:3000/pr-events
7. ✅ Settings → http://localhost:3000/settings

---

**You now have a COMPLETE multi-page application!** 🎉