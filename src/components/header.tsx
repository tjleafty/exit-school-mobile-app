'use client'

import { GraduationCap } from 'lucide-react'
import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { useState, useEffect } from 'react'

interface User {
  id: string
  email: string
  name: string
  role: string
  isSuperUser: boolean
  isActive: boolean
}

export function Header() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get user session from API
    const fetchSession = async () => {
      try {
        const response = await fetch('/api/auth/session')
        const data = await response.json()
        
        if (data.authenticated && data.user) {
          setCurrentUser(data.user)
        } else {
          setCurrentUser(null)
        }
      } catch (error) {
        console.error('Failed to fetch session:', error)
        setCurrentUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSession()
  }, [])

  // Determine the dashboard link based on user role
  const getDashboardLink = () => {
    if (!currentUser) return '/'
    
    switch (currentUser.role.toUpperCase()) {
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
        <Navigation userRole={currentUser?.role || undefined} />
      </div>
    </header>
  )
}