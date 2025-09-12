import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, Role, UserStatus, PermissionType } from '@prisma/client'
import { SessionManager } from '@/lib/auth/session'
import { PermissionManager } from '@/lib/auth/permissions'
import { z } from 'zod'

const prisma = new PrismaClient()

const CreateUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  role: z.nativeEnum(Role),
  status: z.nativeEnum(UserStatus).default(UserStatus.ACTIVE),
  organizationId: z.string().optional(),
})

const UpdateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.nativeEnum(Role).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  isActive: z.boolean().optional(),
})

// GET /api/admin/users - List all users
export async function GET(request: NextRequest) {
  try {
    const session = await SessionManager.requireAuth()
    
    if (!PermissionManager.canAccessAdminPanel(session.permissions)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!PermissionManager.hasPermission(session.permissions, PermissionType.USER_VIEW)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') as Role | null
    const status = searchParams.get('status') as UserStatus | null
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    const where = {
      ...(role && { role }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } }
        ]
      })
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
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
        },
        skip: offset,
        take: limit
      }),
      prisma.user.count({ where })
    ])

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const session = await SessionManager.requireAuth()
    
    if (!PermissionManager.canAccessAdminPanel(session.permissions)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!PermissionManager.hasPermission(session.permissions, PermissionType.USER_CREATE)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = CreateUserSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }

    const newUser = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        role: validatedData.role,
        status: validatedData.status,
        organizationId: validatedData.organizationId,
      },
      include: {
        permissions: {
          include: {
            permission: true
          }
        },
        courseAccess: true,
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
        action: 'CREATE_USER',
        entityType: 'USER',
        entityId: newUser.id,
        metadata: {
          newUserEmail: newUser.email,
          newUserRole: newUser.role
        }
      }
    })

    return NextResponse.json(newUser, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 })
    }
    
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}