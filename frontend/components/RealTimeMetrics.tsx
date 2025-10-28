'use client'

import { useState, useEffect, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface MetricsData {
  timestamp: number
  workloads_processed: number
  active_connections: number
}

export default function RealTimeMetrics() {
  const [metrics, setMetrics] = useState<MetricsData[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const websocketRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Function to establish WebSocket connection
  const connectWebSocket = () => {
    // Clear any existing reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    // Connect to WebSocket endpoint
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    
    // More robust WebSocket URL construction
    let wsUrl: string;
    if (apiBaseUrl.startsWith('http://')) {
      wsUrl = `ws://${apiBaseUrl.substring(7)}/ws/metrics`
    } else if (apiBaseUrl.startsWith('https://')) {
      wsUrl = `wss://${apiBaseUrl.substring(8)}/ws/metrics`
    } else {
      // Assume it's a hostname:port format
      wsUrl = `ws://${apiBaseUrl}/ws/metrics`
    }
    
    console.log('Connecting to WebSocket:', wsUrl)
    console.log('API Base URL:', apiBaseUrl)
    
    // Validate environment variable
    if (!process.env.NEXT_PUBLIC_API_URL) {
      console.warn('NEXT_PUBLIC_API_URL is not set, using default value')
    }
    
    const ws = new WebSocket(wsUrl)
    websocketRef.current = ws
    
    ws.onopen = () => {
      console.log('Connected to real-time metrics')
      setIsConnected(true)
      // Request initial metrics collection
      ws.send('collect')
    }
    
    ws.onmessage = (event) => {
      try {
        // Try to parse as JSON first
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
        // If JSON parsing fails, log the message but don't treat it as an error
        console.log('Received non-JSON message:', event.data)
      }
    }
    
    ws.onclose = () => {
      console.log('Disconnected from real-time metrics')
      setIsConnected(false)
      websocketRef.current = null
      
      // Attempt to reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('Attempting to reconnect...')
        connectWebSocket()
      }, 5000)
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      console.error('WebSocket error details:', {
        url: wsUrl,
        readyState: ws.readyState,
        protocol: ws.protocol,
        extensions: ws.extensions
      })
      setIsConnected(false)
    }
  }

  useEffect(() => {
    // Initial connection
    connectWebSocket()
    
    // Cleanup function
    return () => {
      console.log('Cleaning up WebSocket connection')
      if (websocketRef.current) {
        websocketRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
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