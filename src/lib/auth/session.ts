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
    try {
      const cookieStore = cookies()
      const token = cookieStore.get(this.SESSION_COOKIE)?.value
      const allCookies = cookieStore.getAll()

      if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
        console.log('SessionManager.getSession: Cookie debug info:', {
          sessionCookieName: this.SESSION_COOKIE,
          tokenExists: !!token,
          tokenLength: token?.length || 0,
          tokenPreview: token ? `${token.substring(0, 8)}...` : 'none',
          allCookieNames: allCookies.map(c => c.name),
          totalCookies: allCookies.length
        })
      }

      if (!token) {
        if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
          console.log('SessionManager.getSession: No token found in cookies')
        }
        return null
      }

      if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
        console.log('SessionManager.getSession: Token found, calling getSessionByToken')
      }
      
      return await this.getSessionByToken(token)
    } catch (error) {
      console.error('SessionManager.getSession: Error accessing cookies or session:', error)
      return null
    }
  }

  static async getSessionByToken(token: string): Promise<AuthSession | null> {
    try {
      if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
        console.log('SessionManager.getSessionByToken: Looking up session for token:', {
          tokenLength: token.length,
          tokenPreview: `${token.substring(0, 8)}...`,
          databaseUrl: process.env.DATABASE_URL ? 'set' : 'missing',
          nodeEnv: process.env.NODE_ENV
        })
      }

      // First, let's check if we can connect to the database at all
      try {
        const sessionCount = await prisma.session.count()
        if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
          console.log('SessionManager.getSessionByToken: Database connection test:', {
            totalSessions: sessionCount
          })
        }
      } catch (dbError) {
        console.error('SessionManager.getSessionByToken: Database connection failed:', dbError)
        return null
      }
      
      const session = await prisma.session.findUnique({
        where: { token }
      })

      if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
        console.log('SessionManager.getSessionByToken: Database lookup result:', {
          sessionFound: !!session,
          sessionId: session?.id,
          userId: session?.userId,
          expiresAt: session?.expiresAt,
          isExpired: session ? session.expiresAt < new Date() : 'N/A',
          currentTime: new Date().toISOString()
        })
      }

      if (!session || session.expiresAt < new Date()) {
        if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
          console.log('SessionManager.getSessionByToken: Session expired or not found - cleaning up')
        }
        if (session) {
          await prisma.session.delete({ where: { token } })
        }
        return null
      }

      if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
        console.log('SessionManager.getSessionByToken: Valid session found, fetching user data')
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
        if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
          console.log('SessionManager.getSessionByToken: User not found, inactive, or not active status')
        }
        await this.destroySession(token)
        return null
      }

      // Build permission check object
      const rolePermissions = PermissionManager.getUserPermissions(user.role)
      const userPermissions = user.permissions.map(p => p.permission.name)
      
      if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
        console.log('SessionManager: Building permissions for user:', {
          userId: user.id,
          email: user.email,
          role: user.role,
          rolePermissions,
          userPermissions,
          totalPermissions: [...rolePermissions, ...userPermissions],
          hasAdminPanelAccess: rolePermissions.includes('ADMIN_PANEL_ACCESS') || userPermissions.includes('ADMIN_PANEL_ACCESS'),
          hasUserView: rolePermissions.includes('USER_VIEW') || userPermissions.includes('USER_VIEW')
        })
      }

      const permissions: PermissionCheck = {
        userId: user.id,
        role: user.role,
        permissions: [
          // Role-based permissions
          ...rolePermissions,
          // Individual user permissions
          ...userPermissions
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
    } catch (error) {
      console.error('SessionManager.getSessionByToken: Database error:', error)
      return null
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
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
      console.log('SessionManager.requireAuth: Starting...')
    }
    const session = await this.getSession()
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
      console.log('SessionManager.requireAuth: Session result:', session ? 'found' : 'not found')
    }
    if (!session) {
      if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
        console.log('SessionManager.requireAuth: No session found, throwing error')
      }
      throw new Error('Authentication required')
    }
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
      console.log('SessionManager.requireAuth: Returning session for user:', session.user.email)
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