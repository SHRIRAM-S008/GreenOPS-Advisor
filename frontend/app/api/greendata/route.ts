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
    return NextResponse.json(data)
  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch GreenOps data' },
      { status: 500 }
    )
  }
}