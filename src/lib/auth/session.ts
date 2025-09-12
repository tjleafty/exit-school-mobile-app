import { cookies } from 'next/headers'
import { PrismaClient, Role, PermissionType, UserStatus } from '@prisma/client'
import { PermissionCheck, PermissionManager } from './permissions'

const prisma = new PrismaClient()

export interface SessionUser {
  id: string
  email: string
  name: string | null
  role: Role
  status: UserStatus
  isActive: boolean
  isSuperUser: boolean
}

export interface AuthSession {
  user: SessionUser
  permissions: PermissionCheck
  expires: Date
}

export class SessionManager {
  private static readonly SESSION_COOKIE = 'session-token'
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

  static async createSession(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        permissions: {
          include: {
            permission: true
          }
        },
        courseAccess: true,
        toolAccess: true
      }
    })

    if (!user || !user.isActive || user.status !== UserStatus.ACTIVE) {
      throw new Error('User not found or inactive')
    }

    // Generate session token
    const token = this.generateSecureToken()
    const expiresAt = new Date(Date.now() + this.SESSION_DURATION)

    // Store session in database
    await prisma.session.create({
      data: {
        id: token,
        userId: user.id,
        token,
        expiresAt
      }
    })

    // Update last login
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() }
    })

    return token
  }

  static async getSession(): Promise<AuthSession | null> {
    const cookieStore = cookies()
    const token = cookieStore.get(this.SESSION_COOKIE)?.value

    if (!token) {
      return null
    }

    return this.getSessionByToken(token)
  }

  static async getSessionByToken(token: string): Promise<AuthSession | null> {
    const session = await prisma.session.findUnique({
      where: { token }
    })

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.session.delete({ where: { token } })
      }
      return null
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        permissions: {
          include: {
            permission: true
          },
          where: {
            granted: true,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          }
        },
        courseAccess: true,
        toolAccess: true
      }
    })

    if (!user || !user.isActive || user.status !== UserStatus.ACTIVE) {
      await this.destroySession(token)
      return null
    }

    // Build permission check object
    const permissions: PermissionCheck = {
      userId: user.id,
      role: user.role,
      permissions: [
        // Role-based permissions
        ...PermissionManager.getUserPermissions(user.role),
        // Individual user permissions
        ...user.permissions.map(p => p.permission.name)
      ],
      courseAccess: user.courseAccess.map(ca => ({
        courseId: ca.courseId,
        canView: ca.canView,
        canEdit: ca.canEdit
      })),
      toolAccess: user.toolAccess
        .filter(ta => ta.canAccess && (!ta.expiresAt || ta.expiresAt > new Date()))
        .map(ta => ({
          toolName: ta.toolName,
          canAccess: ta.canAccess
        }))
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        isActive: user.isActive,
        isSuperUser: user.isSuperUser
      },
      permissions,
      expires: session.expiresAt
    }
  }

  static async destroySession(token?: string): Promise<void> {
    if (!token) {
      const cookieStore = cookies()
      token = cookieStore.get(this.SESSION_COOKIE)?.value
    }

    if (token) {
      await prisma.session.deleteMany({
        where: { token }
      })
    }
  }

  static async requireAuth(): Promise<AuthSession> {
    const session = await this.getSession()
    if (!session) {
      throw new Error('Authentication required')
    }
    return session
  }

  static async requirePermission(permission: PermissionType): Promise<AuthSession> {
    const session = await this.requireAuth()
    
    if (!PermissionManager.hasPermission(session.permissions, permission)) {
      throw new Error(`Permission ${permission} required`)
    }

    return session
  }

  static async requireRole(role: Role): Promise<AuthSession> {
    const session = await this.requireAuth()
    
    if (session.user.role !== role) {
      throw new Error(`Role ${role} required`)
    }

    return session
  }

  static async requireAnyRole(roles: Role[]): Promise<AuthSession> {
    const session = await this.requireAuth()
    
    if (!roles.includes(session.user.role)) {
      throw new Error(`One of roles ${roles.join(', ')} required`)
    }

    return session
  }

  private static generateSecureToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  static async cleanExpiredSessions(): Promise<void> {
    await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    })
  }
}