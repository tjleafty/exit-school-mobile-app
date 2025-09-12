import { PrismaClient, Role, UserStatus } from '@prisma/client'
import { PasswordManager } from './password'
import { SessionManager } from './session'

const prisma = new PrismaClient()

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResult {
  success: boolean
  user?: {
    id: string
    email: string
    name: string | null
    role: Role
    isSuperUser: boolean
  }
  sessionToken?: string
  error?: string
}

export class AuthService {
  static async login(credentials: LoginCredentials): Promise<LoginResult> {
    try {
      const { email, password } = credentials

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
          id: true,
          email: true,
          name: true,
          password: true,
          role: true,
          status: true,
          isActive: true,
          isSuperUser: true,
          lastLoginAt: true
        }
      })

      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password'
        }
      }

      // Check if user is active
      if (!user.isActive || user.status !== UserStatus.ACTIVE) {
        return {
          success: false,
          error: 'Account is inactive or suspended'
        }
      }

      // Check password
      if (!user.password) {
        return {
          success: false,
          error: 'Password not set for this account'
        }
      }

      const isPasswordValid = await PasswordManager.verifyPassword(password, user.password)
      if (!isPasswordValid) {
        return {
          success: false,
          error: 'Invalid email or password'
        }
      }

      // Create session
      const sessionToken = await SessionManager.createSession(user.id)

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      })

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isSuperUser: user.isSuperUser
        },
        sessionToken
      }

    } catch (error) {
      console.error('Login error:', error)
      return {
        success: false,
        error: 'An error occurred during login'
      }
    }
  }

  static async logout(sessionToken?: string): Promise<void> {
    if (sessionToken) {
      await SessionManager.destroySession(sessionToken)
    }
  }

  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true, isSuperUser: true }
      })

      if (!user) {
        return { success: false, error: 'User not found' }
      }

      // Verify current password
      if (user.password) {
        const isCurrentPasswordValid = await PasswordManager.verifyPassword(currentPassword, user.password)
        if (!isCurrentPasswordValid) {
          return { success: false, error: 'Current password is incorrect' }
        }
      }

      // Validate new password strength
      const passwordValidation = PasswordManager.validatePasswordStrength(newPassword)
      if (!passwordValidation.isValid) {
        return { success: false, error: passwordValidation.errors.join(', ') }
      }

      // Hash new password
      const hashedPassword = await PasswordManager.hashPassword(newPassword)

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      })

      return { success: true }

    } catch (error) {
      console.error('Change password error:', error)
      return { success: false, error: 'An error occurred while changing password' }
    }
  }

  static async resetPassword(email: string): Promise<{ success: boolean; error?: string; temporaryPassword?: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      })

      if (!user) {
        return { success: false, error: 'User not found' }
      }

      // Generate temporary password
      const temporaryPassword = PasswordManager.generateRandomPassword(12)
      const hashedPassword = await PasswordManager.hashPassword(temporaryPassword)

      // Update user with temporary password
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      })

      // Log the action
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'PASSWORD_RESET',
          entityType: 'USER',
          entityId: user.id,
          metadata: {
            resetMethod: 'admin_generated',
            timestamp: new Date()
          }
        }
      })

      return { 
        success: true, 
        temporaryPassword 
      }

    } catch (error) {
      console.error('Reset password error:', error)
      return { success: false, error: 'An error occurred while resetting password' }
    }
  }
}