import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'

// Mock user data for demo purposes - let's generate the hashes at runtime
const MOCK_USERS_CONFIG = [
  {
    id: 'admin-user-id',
    email: 'admin@theexitschool.com',
    name: 'Exit School Admin',
    password: 'password',
    role: Role.ADMIN,
    isSuperUser: true,
    isActive: true
  },
  {
    id: 'instructor-user-id', 
    email: 'instructor@theexitschool.com',
    name: 'John Smith',
    password: 'password123',
    role: Role.INSTRUCTOR,
    isSuperUser: false,
    isActive: true
  },
  {
    id: 'student-user-id',
    email: 'student@theexitschool.com', 
    name: 'Jane Doe',
    password: 'password123',
    role: Role.STUDENT,
    isSuperUser: false,
    isActive: true
  }
]

// Cache for hashed passwords (will be generated on first use)
let MOCK_USERS: any[] | null = null

// Simple in-memory session storage for demo
const sessions = new Map<string, { userId: string; expiresAt: Date }>()

async function initializeMockUsers() {
  if (MOCK_USERS) return MOCK_USERS
  
  console.log('Initializing mock users with hashed passwords...')
  MOCK_USERS = []
  
  for (const config of MOCK_USERS_CONFIG) {
    const hashedPassword = await bcrypt.hash(config.password, 12)
    MOCK_USERS.push({
      ...config,
      password: hashedPassword
    })
  }
  
  console.log('Mock users initialized successfully')
  return MOCK_USERS
}

export class MockAuthService {
  static async login(email: string, password: string) {
    console.log('MockAuth: Login attempt for', email)
    
    // Initialize users if not done yet
    await initializeMockUsers()
    
    // Find user
    const user = MOCK_USERS!.find(u => u.email.toLowerCase() === email.toLowerCase())
    if (!user) {
      console.log('MockAuth: User not found')
      return { success: false, error: 'Invalid email or password' }
    }

    console.log('MockAuth: Found user, checking password...')
    
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

    // Initialize users if not done yet
    await initializeMockUsers()

    const user = MOCK_USERS!.find(u => u.id === session.userId)
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