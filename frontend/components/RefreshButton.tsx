'use client'

import { RefreshCw } from 'lucide-react'
import { useState } from 'react'

interface RefreshButtonProps {
  onRefresh: () => Promise<void>
  className?: string
}

export default function RefreshButton({ onRefresh, className = '' }: RefreshButtonProps) {
  const [refreshing, setRefreshing] = useState(false)

  const handleClick = async () => {
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={refreshing}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50 ${className}`}
    >
      <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
      {refreshing ? 'Refreshing...' : 'Refresh'}
    </button>
  )
}