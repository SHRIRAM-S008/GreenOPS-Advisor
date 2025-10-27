'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { ArrowLeft, AlertTriangle, DollarSign, Leaf, Zap, CheckCircle, XCircle, Download, GitPullRequest } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function OpportunityDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [opportunity, setOpportunity] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [applyLoading, setApplyLoading] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [patchData, setPatchData] = useState<{ patch: string; kubectlCommand: string } | null>(null)

  useEffect(() => {
    fetchOpportunity()
  }, [params.id])

  async function fetchOpportunity() {
    setLoading(true)

    const { data, error } = await supabase
      .from('opportunities')
      .select('*, workloads(name, kind, namespaces(name))')
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Error:', error)
    } else {
      setOpportunity(data)
    }

    setLoading(false)
  }

  async function applyFix() {
    if (!opportunity) return

    setApplyLoading(true)
    setApplyError(null)

    try {
      // Call the apply-fix API
      const response = await fetch('/api/apply-fix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          opportunityId: params.id,
          createPr: false
        })
      })

      if (!response.ok) {
        throw new Error('Failed to apply fix')
      }

      const data = await response.json()
      setPatchData(data)

      // Update the opportunity status
      const { error } = await supabase
        .from('opportunities')
        .update({ status: 'applied' })
        .eq('id', params.id)

      if (error) {
        console.error('Error updating opportunity:', error)
      } else {
        // Refresh the opportunity data
        fetchOpportunity()
      }

      // Trigger download of the patch file
      if (data.patch) {
        const blob = new Blob([data.patch], { type: 'application/yaml' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `optimization-patch-${params.id}.yaml`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error applying fix:', error)
      setApplyError((error as Error).message)
    } finally {
      setApplyLoading(false)
    }
  }

  async function rejectFix() {
    if (!opportunity) return

    const { error } = await supabase
      .from('opportunities')
      .update({ status: 'rejected' })
      .eq('id', params.id)

    if (error) {
      console.error('Error updating opportunity:', error)
    } else {
      // Refresh the opportunity data
      fetchOpportunity()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <p className="text-xl text-gray-600">Loading opportunity details...</p>
      </div>
    )
  }

  if (!opportunity) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push('/opportunities')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
          >
            <ArrowLeft size={20} />
            Back to Opportunities
          </button>
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Opportunity Not Found</h2>
            <p className="text-gray-600">The requested opportunity could not be found.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push('/opportunities')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft size={20} />
          Back to Opportunities
        </button>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <AlertTriangle className="text-yellow-600" />
                {opportunity.workloads.name}
              </h1>
              <p className="text-gray-600 mt-2">
                {opportunity.workloads.kind} • {opportunity.workloads.namespaces.name}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              opportunity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              opportunity.status === 'applied' ? 'bg-green-100 text-green-800' :
              opportunity.status === 'rejected' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {opportunity.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Explanation */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recommendation</h2>
          <p className="text-gray-700">{opportunity.explanation}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="text-green-600" size={20} />
              <span className="text-sm text-gray-600">Monthly Savings</span>
            </div>
            <p className="text-3xl font-bold text-green-600">${opportunity.savings_usd.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="text-green-600" size={20} />
              <span className="text-sm text-gray-600">Carbon Reduction</span>
            </div>
            <p className="text-3xl font-bold text-green-600">
              {(opportunity.carbon_reduction_gco2e / 1000).toFixed(2)} kg
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="text-blue-600" size={20} />
              <span className="text-sm text-gray-600">Confidence Score</span>
            </div>
            <p className="text-3xl font-bold text-blue-600">
              {(opportunity.confidence_score * 100).toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Risk Assessment</h2>
          <div className="flex items-center gap-4">
            <span className={`px-4 py-2 rounded-full font-semibold ${
              opportunity.risk_level === 'low' ? 'bg-green-100 text-green-800' :
              opportunity.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {opportunity.risk_level.toUpperCase()} RISK
            </span>
            <p className="text-gray-700">
              {opportunity.risk_level === 'low' 
                ? 'This change is considered safe with minimal risk of performance impact.'
                : opportunity.risk_level === 'medium'
                ? 'This change has moderate risk. Monitor application performance after applying.'
                : 'This change has high risk. Thoroughly test in a staging environment first.'}
            </p>
          </div>
        </div>

        {/* Apply Fix Section */}
        {opportunity.status === 'pending' && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Apply Recommendation</h2>
            
            {applyError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                <p>Error: {applyError}</p>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={applyFix}
                disabled={applyLoading}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Download size={20} />
                {applyLoading ? 'Applying...' : 'Download YAML Patch'}
              </button>
              <button
                onClick={rejectFix}
                className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
              >
                <XCircle size={20} />
                Reject Recommendation
              </button>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">How to apply this fix:</h3>
              <ol className="list-decimal list-inside text-blue-700 space-y-1">
                <li>Download the YAML patch file above</li>
                <li>Review the changes in the file</li>
                <li>Apply to your cluster with: <code className="bg-white px-1 rounded">kubectl apply -f optimization-patch-{params.id}.yaml</code></li>
              </ol>
            </div>
            
            <p className="text-sm text-gray-500 mt-4">
              Note: Applying this fix will modify your Kubernetes workload configuration.
              Make sure you have proper backups before proceeding.
            </p>
          </div>
        )}
        
        {opportunity.status === 'applied' && patchData && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Applied Fix</h2>
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-800 mb-2">Patch successfully downloaded!</h3>
              <p className="text-green-700">
                The YAML patch has been downloaded to your computer. You can apply it to your cluster using:
              </p>
              <code className="block bg-white p-2 mt-2 rounded text-sm">
                {patchData.kubectlCommand}
              </code>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}