'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface MetricsData {
  timestamp: number
  workloads_processed: number
  active_connections: number
}

export default function RealTimeMetrics() {
  const [metrics, setMetrics] = useState<MetricsData[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [websocket, setWebsocket] = useState<WebSocket | null>(null)

  useEffect(() => {
    // Connect to WebSocket endpoint
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const wsUrl = `${apiBaseUrl.replace('http', 'ws')}/ws/metrics`
    console.log('Connecting to WebSocket:', wsUrl)
    
    const ws = new WebSocket(wsUrl)
    
    ws.onopen = () => {
      console.log('Connected to real-time metrics')
      setIsConnected(true)
      setWebsocket(ws)
      // Request initial metrics collection
      ws.send('collect')
    }
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'metrics_update') {
          // Add new data point
          setMetrics(prev => {
            const newMetrics = [...prev, data.data]
            // Keep only the last 20 data points
            return newMetrics.slice(-20)
          })
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }
    
    ws.onclose = () => {
      console.log('Disconnected from real-time metrics')
      setIsConnected(false)
      setWebsocket(null)
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setIsConnected(false)
    }
    
    // Cleanup function
    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [])

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">Real-time Metrics</h3>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
      
      {metrics.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={metrics}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
            />
            <YAxis />
            <Tooltip 
              labelFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
            />
            <Line 
              type="monotone" 
              dataKey="workloads_processed" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="Workloads Processed"
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-48 text-gray-500">
          {isConnected ? 'Waiting for data...' : 'Not connected to real-time metrics'}
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-600">
        <p>Real-time updates of metrics collection and processing</p>
      </div>
    </div>
  )
}