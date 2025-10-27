import { NextResponse } from 'next/server'

// Function to fetch data from our backend API
async function fetchMetricsData() {
  // Use the backend API URL - this will be http://localhost:8000 in development
  const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  
  try {
    const response = await fetch(`${BACKEND_API_URL}/metrics`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching metrics data:', error)
    throw error
  }
}

export async function GET() {
  try {
    const data = await fetchMetricsData()
    
    // Simple AI analysis logic
    // In a real implementation, this would be more sophisticated
    let totalCost = 0
    let totalCPU = 0
    let itemCount = 0
    
    // Process the data to calculate totals
    if (data.cost_metrics && Array.isArray(data.cost_metrics)) {
      data.cost_metrics.forEach((metric: any) => {
        totalCost += metric.total_cost_usd || 0
        totalCPU += metric.cpu_cores_used || 0
        itemCount++
      })
    }
    
    // Simple AI recommendations based on the data
    let suggestion = "✅ All good!"
    if (totalCPU > 0.8 * itemCount) {
      suggestion = "⚠️ High CPU usage — consider scaling down."
    } else if (totalCPU < 0.2 * itemCount && itemCount > 0) {
      suggestion = "💤 Underused — scale down to save energy."
    }
    
    const result = {
      totalCost: totalCost,
      averageCPU: itemCount > 0 ? totalCPU / itemCount : 0,
      itemCount: itemCount,
      suggestion: suggestion,
      raw: data
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch or analyze GreenOps data' },
      { status: 500 }
    )
  }
}