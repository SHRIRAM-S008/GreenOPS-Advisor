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