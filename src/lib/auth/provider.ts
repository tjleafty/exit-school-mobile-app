import { AuthProvider, Session, SignInCredentials, Role } from '@/types/auth'
import { prisma } from '@/lib/db/prisma'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'default-secret-change-in-production'

export class EmailAuthProvider implements AuthProvider {
  async signIn(credentials: SignInCredentials): Promise<Session> {
    const { email, magicToken } = credentials

    if (magicToken) {
      return this.verifyMagicToken(magicToken)
    }

    // For demo purposes, auto-create user if doesn't exist
    let user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: email.split('@')[0],
          role: this.determineInitialRole(email)
        }
      })
    }

    const token = this.generateToken(user.id)
    const session = await this.createSession(user.id, token)

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as Role,
        organizationId: user.organizationId
      },
      expires: session.expiresAt.toISOString(),
      accessToken: token
    }
  }

  async signOut(session: Session): Promise<void> {
    await prisma.session.deleteMany({
      where: { userId: session.user.id }
    })
  }

  async getSession(token: string): Promise<Session | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
      
      const session = await prisma.session.findUnique({
        where: { token },
        include: { user: true }
      })

      if (!session || session.expiresAt < new Date()) {
        return null
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      })

      if (!user) return null

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as Role,
          organizationId: user.organizationId
        },
        expires: session.expiresAt.toISOString(),
        accessToken: token
      }
    } catch {
      return null
    }
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })
    
    return user ? [user.role as Role] : []
  }

  async refreshToken(token: string): Promise<Session> {
    const session = await this.getSession(token)
    if (!session) {
      throw new Error('Invalid session')
    }

    const newToken = this.generateToken(session.user.id)
    const newSession = await this.createSession(session.user.id, newToken)

    // Delete old session
    await prisma.session.delete({
      where: { token }
    })

    return {
      ...session,
      accessToken: newToken,
      expires: newSession.expiresAt.toISOString()
    }
  }

  async sendMagicLink(email: string): Promise<void> {
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    // In production, store this token in database and send via email
    // For demo, we'll log it
    console.log(`Magic link for ${email}: http://localhost:3000/api/auth/verify?token=${token}`)
    
    // Store token (in production, use a separate table for magic tokens)
    await prisma.session.create({
      data: {
        userId: email, // Temporary, will be replaced on verification
        token,
        expiresAt: expires
      }
    })
  }

  async verifyMagicToken(token: string): Promise<Session> {
    const magicSession = await prisma.session.findUnique({
      where: { token }
    })

    if (!magicSession || magicSession.expiresAt < new Date()) {
      throw new Error('Invalid or expired token')
    }

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { email: magicSession.userId }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: magicSession.userId,
          name: magicSession.userId.split('@')[0],
          role: this.determineInitialRole(magicSession.userId)
        }
      })
    }

    // Delete magic token and create real session
    await prisma.session.delete({
      where: { id: magicSession.id }
    })

    const sessionToken = this.generateToken(user.id)
    const session = await this.createSession(user.id, sessionToken)

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as Role,
        organizationId: user.organizationId
      },
      expires: session.expiresAt.toISOString(),
      accessToken: sessionToken
    }
  }

  private generateToken(userId: string): string {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
  }

  private async createSession(userId: string, token: string) {
    return prisma.session.create({
      data: {
        userId,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    })
  }

  private determineInitialRole(email: string): Role {
    // Demo logic: assign roles based on email patterns
    if (email.includes('admin')) return Role.ADMIN
    if (email.includes('instructor')) return Role.INSTRUCTOR
    return Role.STUDENT
  }
}

// Export singleton instance
export const authProvider = new EmailAuthProvider()