'use client'

import { GraduationCap } from 'lucide-react'
import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { useState, useEffect } from 'react'

export function Header() {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get user role from cookie
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return parts.pop()?.split(';').shift()
    }
    
    const role = getCookie('user-role')
    setUserRole(role || null)
    setIsLoading(false)
  }, [])

  // Determine the dashboard link based on user role
  const getDashboardLink = () => {
    if (!userRole) return '/'
    
    switch (userRole.toUpperCase()) {
      case 'ADMIN':
        return '/admin'
      case 'INSTRUCTOR':
        return '/instructor'
      case 'STUDENT':
      default:
        return '/dashboard'
    }
  }

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={getDashboardLink()} className="flex items-center space-x-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl">Exit School</span>
        </Link>
        <Navigation userRole={userRole || undefined} />
      </div>
    </header>
  )
}