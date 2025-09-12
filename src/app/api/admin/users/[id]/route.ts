import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, Role, UserStatus, PermissionType } from '@prisma/client'
import { SessionManager } from '@/lib/auth/session'
import { PermissionManager } from '@/lib/auth/permissions'
import { z } from 'zod'

const prisma = new PrismaClient()

const UpdateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.nativeEnum(Role).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  isActive: z.boolean().optional(),
})

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/admin/users/[id] - Get user by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await SessionManager.requireAuth()
    
    if (!PermissionManager.canAccessAdminPanel(session.permissions)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!PermissionManager.hasPermission(session.permissions, PermissionType.USER_VIEW)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
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
                id: true,
                title: true
              }
            }
          }
        },
        toolAccess: true,
        enrollments: {
          include: {
            course: {
              select: {
                id: true,
                title: true
              }
            }
          }
        },
        courses: {
          select: {
            id: true,
            title: true,
            status: true
          }
        },
        _count: {
          select: {
            enrollments: true,
            courses: true,
            permissions: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)

  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/users/[id] - Update user
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await SessionManager.requireAuth()
    
    if (!PermissionManager.canAccessAdminPanel(session.permissions)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!PermissionManager.hasPermission(session.permissions, PermissionType.USER_EDIT)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = UpdateUserSchema.parse(body)

    const existingUser = await prisma.user.findUnique({
      where: { id: params.id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent super user modification by non-super users
    if (existingUser.isSuperUser && !session.user.isSuperUser) {
      return NextResponse.json({ error: 'Cannot modify super user account' }, { status: 403 })
    }

    // Prevent self-role modification for admins
    if (session.user.id === params.id && validatedData.role && validatedData.role !== existingUser.role) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
    }

    // Prevent removing super user status
    if (existingUser.isSuperUser && validatedData.role && validatedData.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Super user must remain an admin' }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: validatedData,
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
      }
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE_USER',
        entityType: 'USER',
        entityId: params.id,
        metadata: {
          changes: validatedData,
          previousRole: existingUser.role,
          previousStatus: existingUser.status
        }
      }
    })

    return NextResponse.json(updatedUser)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 })
    }
    
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/users/[id] - Delete user
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await SessionManager.requireAuth()
    
    if (!PermissionManager.canAccessAdminPanel(session.permissions)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!PermissionManager.hasPermission(session.permissions, PermissionType.USER_DELETE)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Prevent self-deletion
    if (session.user.id === params.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: params.id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent super user deletion
    if (existingUser.isSuperUser) {
      return NextResponse.json({ error: 'Super user account cannot be deleted' }, { status: 403 })
    }

    // Instead of hard delete, we'll soft delete by setting isActive to false
    const deletedUser = await prisma.user.update({
      where: { id: params.id },
      data: { 
        isActive: false,
        status: UserStatus.INACTIVE
      }
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE_USER',
        entityType: 'USER',
        entityId: params.id,
        metadata: {
          deletedUserEmail: existingUser.email,
          deletedUserRole: existingUser.role
        }
      }
    })

    return NextResponse.json({ success: true, user: deletedUser })

  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}