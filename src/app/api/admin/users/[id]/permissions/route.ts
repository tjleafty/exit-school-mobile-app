import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, PermissionType } from '@prisma/client'
import { SessionManager } from '@/lib/auth/session'
import { PermissionManager } from '@/lib/auth/permissions'
import { z } from 'zod'

const prisma = new PrismaClient()

const GrantPermissionSchema = z.object({
  permissions: z.array(z.nativeEnum(PermissionType)),
  expiresAt: z.string().datetime().optional(),
})

const CourseAccessSchema = z.object({
  courseId: z.string(),
  canView: z.boolean().default(true),
  canEdit: z.boolean().default(false),
})

const ToolAccessSchema = z.object({
  toolName: z.string(),
  canAccess: z.boolean().default(true),
  expiresAt: z.string().datetime().optional(),
})

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/admin/users/[id]/permissions - Get user permissions
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await SessionManager.requireAuth()
    
    if (!PermissionManager.canManageUsers(session.permissions)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const userPermissions = await prisma.user.findUnique({
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
      }
    })

    if (!userPermissions) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      userId: params.id,
      role: userPermissions.role,
      permissions: userPermissions.permissions.map(p => ({
        id: p.id,
        permission: p.permission.name,
        description: p.permission.description,
        granted: p.granted,
        expiresAt: p.expiresAt,
        grantedAt: p.grantedAt,
      })),
      courseAccess: userPermissions.courseAccess.map(ca => ({
        id: ca.id,
        courseId: ca.courseId,
        courseTitle: ca.course.title,
        canView: ca.canView,
        canEdit: ca.canEdit,
        grantedAt: ca.grantedAt,
      })),
      toolAccess: userPermissions.toolAccess.map(ta => ({
        id: ta.id,
        toolName: ta.toolName,
        canAccess: ta.canAccess,
        expiresAt: ta.expiresAt,
        grantedAt: ta.grantedAt,
      })),
    })

  } catch (error) {
    console.error('Error fetching user permissions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/users/[id]/permissions - Grant permissions to user
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await SessionManager.requireAuth()
    
    if (!PermissionManager.canManageUsers(session.permissions)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = GrantPermissionSchema.parse(body)

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: params.id }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Ensure all permissions exist
    const permissions = await prisma.permission.findMany({
      where: {
        name: { in: validatedData.permissions }
      }
    })

    if (permissions.length !== validatedData.permissions.length) {
      return NextResponse.json({ error: 'Some permissions not found' }, { status: 400 })
    }

    // Grant permissions (upsert to handle existing permissions)
    const grantedPermissions = await Promise.all(
      permissions.map(permission =>
        prisma.userPermission.upsert({
          where: {
            userId_permissionId: {
              userId: params.id,
              permissionId: permission.id
            }
          },
          update: {
            granted: true,
            expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
            grantedBy: session.user.id,
            grantedAt: new Date(),
          },
          create: {
            userId: params.id,
            permissionId: permission.id,
            granted: true,
            expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
            grantedBy: session.user.id,
          },
          include: {
            permission: true
          }
        })
      )
    )

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'GRANT_PERMISSIONS',
        entityType: 'USER',
        entityId: params.id,
        metadata: {
          permissions: validatedData.permissions,
          expiresAt: validatedData.expiresAt,
        }
      }
    })

    return NextResponse.json(grantedPermissions, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 })
    }
    
    console.error('Error granting permissions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/users/[id]/permissions - Revoke permissions from user
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await SessionManager.requireAuth()
    
    if (!PermissionManager.canManageUsers(session.permissions)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const permissionNames = searchParams.getAll('permission')

    if (permissionNames.length === 0) {
      return NextResponse.json({ error: 'No permissions specified' }, { status: 400 })
    }

    // Find permission IDs
    const permissions = await prisma.permission.findMany({
      where: {
        name: { in: permissionNames as PermissionType[] }
      }
    })

    // Revoke permissions
    const revokedPermissions = await prisma.userPermission.updateMany({
      where: {
        userId: params.id,
        permissionId: { in: permissions.map(p => p.id) }
      },
      data: {
        granted: false
      }
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'REVOKE_PERMISSIONS',
        entityType: 'USER',
        entityId: params.id,
        metadata: {
          permissions: permissionNames,
        }
      }
    })

    return NextResponse.json({ 
      success: true, 
      revokedCount: revokedPermissions.count 
    })

  } catch (error) {
    console.error('Error revoking permissions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}