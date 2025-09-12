import { PrismaClient, Role, UserStatus, PermissionType } from '@prisma/client'
import UserManagement from '@/components/admin/user-management'
import { SessionManager } from '@/lib/auth/session'
import { PermissionManager } from '@/lib/auth/permissions'
import { redirect } from 'next/navigation'

const prisma = new PrismaClient()

export default async function AdminUsersPage() {
  // Check authentication and permissions
  try {
    const session = await SessionManager.requireAuth()
    
    if (!PermissionManager.canAccessAdminPanel(session.permissions)) {
      redirect('/dashboard?error=unauthorized')
    }

    if (!PermissionManager.hasPermission(session.permissions, PermissionType.USER_VIEW)) {
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