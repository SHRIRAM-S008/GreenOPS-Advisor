'use client'

import { useState } from 'react'
import { FileText, Download, Eye, Calendar, Filter } from 'lucide-react'

type Report = {
  id: string
  title: string
  date: string
  type: 'cost_analysis' | 'carbon_footprint' | 'optimization_summary' | 'compliance'
  status: 'completed' | 'processing' | 'failed'
  size: string
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([
    {
      id: '1',
      title: 'Monthly Cost Analysis Report',
      date: '2024-06-01',
      type: 'cost_analysis',
      status: 'completed',
      size: '2.4 MB'
    },
    {
      id: '2',
      title: 'Quarterly Carbon Footprint Report',
      date: '2024-04-01',
      type: 'carbon_footprint',
      status: 'completed',
      size: '3.1 MB'
    },
    {
      id: '3',
      title: 'Optimization Summary Report',
      date: '2024-06-15',
      type: 'optimization_summary',
      status: 'processing',
      size: '1.2 MB'
    },
    {
      id: '4',
      title: 'Compliance Audit Report',
      date: '2024-05-20',
      type: 'compliance',
      status: 'completed',
      size: '4.7 MB'
    },
    {
      id: '5',
      title: 'Weekly Resource Utilization Report',
      date: '2024-06-10',
      type: 'cost_analysis',
      status: 'failed',
      size: '1.8 MB'
    }
  ])

  const [filter, setFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '2024-01-01',
    end: '2024-06-30'
  })

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cost_analysis':
        return <span className="text-green-600 font-bold">$</span>
      case 'carbon_footprint':
        return <span className="text-green-600">🌿</span>
      case 'optimization_summary':
        return <span className="text-blue-600">⚡</span>
      case 'compliance':
        return <span className="text-purple-600">✓</span>
      default:
        return <span className="text-gray-600">📄</span>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Completed</span>
      case 'processing':
        return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">Processing</span>
      case 'failed':
        return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">Failed</span>
      default:
        return <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">Unknown</span>
    }
  }

  const filteredReports = reports.filter(report => {
    if (filter === 'all') return true
    return report.type === filter
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="text-green-600" size={40} />
            Reports & Analytics
          </h1>
          <p className="text-gray-600 mt-2">Generate and download detailed reports on your Kubernetes optimization</p>
        </div>

        {/* Controls */}
        <div className="mb-6 bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  filter === 'all' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <FileText size={16} />
                All Reports
              </button>
              <button
                onClick={() => setFilter('cost_analysis')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  filter === 'cost_analysis' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <span className="font-bold">$</span>
                Cost Analysis
              </button>
              <button
                onClick={() => setFilter('carbon_footprint')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  filter === 'carbon_footprint' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <span>🌿</span>
                Carbon Footprint
              </button>
              <button
                onClick={() => setFilter('optimization_summary')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  filter === 'optimization_summary' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <span>⚡</span>
                Optimization
              </button>
            </div>
            
            <div className="flex gap-2">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-500" />
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                />
              </div>
              <span className="self-center">to</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                />
              </div>
              <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 flex items-center gap-2">
                <Filter size={16} />
                Apply
              </button>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2">
              <Download size={16} />
              Generate New Report
            </button>
          </div>
        </div>

        {/* Reports List */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Report
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        {getTypeIcon(report.type)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{report.title}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 capitalize">
                      {report.type.replace('_', ' ')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(report.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {report.size}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(report.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-green-600 hover:text-green-900 mr-3 flex items-center gap-1">
                      <Eye size={16} />
                      View
                    </button>
                    <button className="text-blue-600 hover:text-blue-900 flex items-center gap-1">
                      <Download size={16} />
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Report Preview */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Report Preview</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">Select a report to preview</h3>
            <p className="mt-1 text-sm text-gray-500">
              Choose a report from the list above to view its contents
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}