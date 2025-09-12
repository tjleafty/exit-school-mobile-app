'use client'

import { useState, useEffect } from 'react'
import { Role, PermissionType } from '@prisma/client'
import { PermissionCheck } from './permissions'

export interface AuthUser {
  id: string
  email: string
  name: string | null
  role: Role
  isSuperUser: boolean
}

export interface UseAuthReturn {
  user: AuthUser | null
  permissions: PermissionCheck | null
  isLoading: boolean
  error: string | null
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [permissions, setPermissions] = useState<PermissionCheck | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAuthData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      })

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated
          setUser(null)
          setPermissions(null)
          return
        }
        throw new Error('Failed to fetch auth data')
      }

      const data = await response.json()
      setUser(data.user)
      setPermissions(data.permissions)

    } catch (err) {
      console.error('Auth fetch error:', err)
      setError(err instanceof Error ? err.message : 'Authentication error')
      setUser(null)
      setPermissions(null)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/login', {
        method: 'DELETE',
        credentials: 'include'
      })
      
      setUser(null)
      setPermissions(null)
      
      // Redirect to login page
      window.location.href = '/login'
      
    } catch (err) {
      console.error('Logout error:', err)
      // Even if logout fails on server, clear client state
      setUser(null)
      setPermissions(null)
      window.location.href = '/login'
    }
  }

  const refreshAuth = async () => {
    await fetchAuthData()
  }

  useEffect(() => {
    fetchAuthData()
  }, [])

  return {
    user,
    permissions,
    isLoading,
    error,
    logout,
    refreshAuth
  }
}

// Helper hooks for common permission checks
export function useHasPermission(permission: PermissionType): boolean {
  const { permissions } = useAuth()
  
  if (!permissions) return false
  
  return permissions.permissions.includes(permission)
}

export function useHasRole(role: Role): boolean {
  const { user } = useAuth()
  
  return user?.role === role
}

export function useHasAnyRole(roles: Role[]): boolean {
  const { user } = useAuth()
  
  return user ? roles.includes(user.role) : false
}

export function useCanAccessAdminPanel(): boolean {
  return useHasPermission(PermissionType.ADMIN_PANEL_ACCESS)
}

export function useCanManageUsers(): boolean {
  const hasUserView = useHasPermission(PermissionType.USER_VIEW)
  const hasUserEdit = useHasPermission(PermissionType.USER_EDIT)
  const hasUserCreate = useHasPermission(PermissionType.USER_CREATE)
  const hasUserDelete = useHasPermission(PermissionType.USER_DELETE)
  
  return hasUserView && (hasUserEdit || hasUserCreate || hasUserDelete)
}

export function useCanManageCourses(): boolean {
  const hasView = useHasPermission(PermissionType.COURSE_VIEW)
  const hasEdit = useHasPermission(PermissionType.COURSE_EDIT)
  const hasCreate = useHasPermission(PermissionType.COURSE_CREATE)
  
  return hasView && (hasEdit || hasCreate)
}