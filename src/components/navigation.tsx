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
    title: 'Tools',
    href: '/tools',
    icon: <Wrench className="h-4 w-4" />,
    // No roles restriction - always visible for admin users
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

export function Navigation({ userRole }: { userRole?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)

  useEffect(() => {
    // Get user role from cookie
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return parts.pop()?.split(';').shift()
    }
    
    const role = getCookie('user-role')
    setCurrentUserRole(role || null)
  }, [])

  const effectiveRole = userRole || currentUserRole
  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true
    return item.roles.includes(effectiveRole?.toUpperCase() || '')
  })

  const handleLogout = () => {
    // Clear cookies
    document.cookie = 'session-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    document.cookie = 'user-role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    router.push('/')
  }

  // Only show navigation if user is logged in
  const isLoggedIn = effectiveRole !== null

  return (
    <>
      {/* Desktop Navigation */}
      {isLoggedIn ? (
        <nav className="hidden md:flex items-center space-x-6">
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