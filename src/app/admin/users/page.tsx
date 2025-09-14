import { PrismaClient, Role, UserStatus, PermissionType } from '@prisma/client'
import UserManagement from '@/components/admin/user-management'
import { SessionManager } from '@/lib/auth/session'
import { PermissionManager } from '@/lib/auth/permissions'
import { redirect } from 'next/navigation'

const prisma = new PrismaClient()

export default async function AdminUsersPage() {
  // Check authentication and permissions
  try {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
      console.log('AdminUsersPage: Starting auth check...')
    }
    const session = await SessionManager.requireAuth()
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
      console.log('AdminUsersPage: Session obtained:', { 
        userId: session.user.id, 
        email: session.user.email, 
        role: session.user.role,
        permissions: session.permissions.permissions 
      })
    }
    
    const canAccessAdmin = PermissionManager.canAccessAdminPanel(session.permissions)
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
      console.log('AdminUsersPage: Can access admin panel:', canAccessAdmin)
    }
    
    if (!canAccessAdmin) {
      if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
        console.log('AdminUsersPage: Redirecting to dashboard - no admin access')
      }
      redirect('/dashboard?error=unauthorized')
    }

    const hasUserView = PermissionManager.hasPermission(session.permissions, PermissionType.USER_VIEW)
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
      console.log('AdminUsersPage: Has USER_VIEW permission:', hasUserView)
    }
    
    if (!hasUserView) {
      if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
        console.log('AdminUsersPage: Redirecting to admin - insufficient permissions')
      }
      redirect('/admin?error=insufficient-permissions')
    }

    // Fetch users with all related data for permission management
    const users = await prisma.user.findMany({
      include: {
        permissions: {
          include: {
            permission: true
          }
        },
        courseAccess: {
          include: {
            course: {
              select: {
                title: true
              }
            }
          }
        },
        toolAccess: true,
        _count: {
          select: {
            enrollments: true,
            courses: true,
            permissions: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return <UserManagement users={users} />

  } catch (error) {
    console.error('Error in AdminUsersPage:', error)
    redirect('/login')
  }
}