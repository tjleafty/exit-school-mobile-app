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
    const hasUserView = PermissionManager.hasPermission(session.permissions, PermissionType.USER_VIEW)
    
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
      console.log('AdminUsersPage: Permissions check:', {
        canAccessAdmin,
        hasUserView,
        bothRequired: canAccessAdmin && hasUserView,
        userRole: session.user.role,
        allPermissions: session.permissions.permissions
      })
    }
    
    // Both permissions are required for /admin/users
    if (!canAccessAdmin || !hasUserView) {
      if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
        console.log('AdminUsersPage: Insufficient permissions - redirecting to admin')
        console.log('AdminUsersPage: Missing permissions:', {
          needsAdminAccess: !canAccessAdmin,
          needsUserView: !hasUserView
        })
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