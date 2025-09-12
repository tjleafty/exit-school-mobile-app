import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'

// Mock user data for demo purposes
const MOCK_USERS = [
  {
    id: 'admin-user-id',
    email: 'admin@theexitschool.com',
    name: 'Exit School Admin',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LvKKpzGKYRIoXT1Ry', // hashed 'password'
    role: Role.ADMIN,
    isSuperUser: true,
    isActive: true
  },
  {
    id: 'instructor-user-id', 
    email: 'instructor@theexitschool.com',
    name: 'John Smith',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LvKKpzGKYRIoXTf2e', // hashed 'password123'
    role: Role.INSTRUCTOR,
    isSuperUser: false,
    isActive: true
  },
  {
    id: 'student-user-id',
    email: 'student@theexitschool.com', 
    name: 'Jane Doe',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LvKKpzGKYRIoXTf2e', // hashed 'password123'
    role: Role.STUDENT,
    isSuperUser: false,
    isActive: true
  }
]

// Simple in-memory session storage for demo
const sessions = new Map<string, { userId: string; expiresAt: Date }>()

export class MockAuthService {
  static async login(email: string, password: string) {
    console.log('MockAuth: Login attempt for', email)
    
    // Find user
    const user = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase())
    if (!user) {
      console.log('MockAuth: User not found')
      return { success: false, error: 'Invalid email or password' }
    }

    // Check password
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      console.log('MockAuth: Invalid password')
      return { success: false, error: 'Invalid email or password' }
    }

    // Create session token
    const sessionToken = this.generateSessionToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    
    sessions.set(sessionToken, {
      userId: user.id,
      expiresAt
    })

    console.log('MockAuth: Login successful for', user.email)
    
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
  }

  static async validateSession(sessionToken: string) {
    const session = sessions.get(sessionToken)
    if (!session) {
      return null
    }

    if (session.expiresAt < new Date()) {
      sessions.delete(sessionToken)
      return null
    }

    const user = MOCK_USERS.find(u => u.id === session.userId)
    if (!user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isSuperUser: user.isSuperUser
    }
  }

  static logout(sessionToken: string) {
    sessions.delete(sessionToken)
  }

  private static generateSessionToken(): string {
    return 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }
}