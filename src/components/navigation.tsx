'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { 
  BookOpen, 
  Home, 
  Users, 
  Video, 
  Settings, 
  LogOut,
  Menu,
  X,
  GraduationCap,
  Wrench
} from 'lucide-react'
import { useState, useEffect } from 'react'

interface NavItem {
  title: string
  href: string
  icon: React.ReactNode
  roles?: string[]
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: <Home className="h-4 w-4" />,
  },
  {
    title: 'Courses',
    href: '/courses',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    title: 'My Learning',
    href: '/my-courses',
    icon: <GraduationCap className="h-4 w-4" />,
    roles: ['STUDENT'],
  },
  {
    title: 'Instructor',
    href: '/instructor',
    icon: <Video className="h-4 w-4" />,
    roles: ['INSTRUCTOR', 'ADMIN'],
  },
  {
    title: 'Admin',
    href: '/admin',
    icon: <Users className="h-4 w-4" />,
    roles: ['ADMIN'],
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: <Settings className="h-4 w-4" />,
  },
]

interface User {
  id: string
  email: string
  name: string
  role: string
  isSuperUser: boolean
  isActive: boolean
}

export function Navigation({ userRole }: { userRole?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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

  const effectiveRole = userRole || currentUser?.role
  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true
    return item.roles.includes(effectiveRole?.toUpperCase() || '')
  })

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/login', { method: 'DELETE' })
    } catch (error) {
      console.error('Logout failed:', error)
    }
    
    // Clear local state and redirect
    setCurrentUser(null)
    router.push('/')
  }

  // Only show navigation if user is logged in
  const isLoggedIn = currentUser !== null && !isLoading
  const isAdmin = currentUser?.role?.toUpperCase() === 'ADMIN'

  return (
    <>
      {/* Desktop Navigation */}
      {isLoggedIn ? (
        <nav className="hidden md:flex items-center space-x-4">
          {/* Admin-specific buttons in header */}
          {isAdmin && (
            <>
              <Link href="/admin/users">
                <Button variant="ghost" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  Users
                </Button>
              </Link>
              <Link href="/admin/courses">
                <Button variant="ghost" size="sm">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Courses
                </Button>
              </Link>
              <Link href="/admin/tools">
                <Button variant="ghost" size="sm">
                  <Wrench className="h-4 w-4 mr-2" />
                  Tools
                </Button>
              </Link>
            </>
          )}
          
          {/* Regular navigation items */}
          {filteredNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary",
                pathname.startsWith(item.href)
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              {item.icon}
              <span>{item.title}</span>
            </Link>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </nav>
      ) : (
        <nav className="hidden md:flex items-center space-x-4">
          <Link href="/courses">
            <Button variant="ghost">Courses</Button>
          </Link>
          <Link href="/login">
            <Button>Sign In</Button>
          </Link>
        </nav>
      )}

      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </Button>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="absolute top-16 left-0 right-0 bg-background border-b md:hidden">
          <nav className="flex flex-col p-4 space-y-2">
            {isLoggedIn ? (
              <>
                {/* Admin-specific buttons in mobile navigation */}
                {isAdmin && (
                  <>
                    <Link
                      href="/admin/users"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent"
                    >
                      <Users className="h-4 w-4" />
                      <span>Users</span>
                    </Link>
                    <Link
                      href="/admin/courses"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent"
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>Courses</span>
                    </Link>
                    <Link
                      href="/admin/tools"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent"
                    >
                      <Wrench className="h-4 w-4" />
                      <span>Tools</span>
                    </Link>
                  </>
                )}
                
                {filteredNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent",
                      pathname.startsWith(item.href)
                        ? "bg-accent text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    {item.icon}
                    <span>{item.title}</span>
                  </Link>
                ))}
                <Button
                  variant="ghost"
                  className="justify-start px-3"
                  onClick={() => {
                    handleLogout()
                    setMobileMenuOpen(false)
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link
                  href="/courses"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Courses</span>
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent"
                >
                  <span>Sign In</span>
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </>
  )
}