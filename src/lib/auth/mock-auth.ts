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

// Simple in-memory session storage for demo (will be empty in serverless functions)
const sessions = new Map<string, { userId: string; expiresAt: Date }>()

// JWT-style session token encoding for serverless persistence
function encodeSessionToken(userId: string, expiresAt: Date): string {
  const payload = { userId, expiresAt: expiresAt.getTime() }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64')
  return `sess_${encoded}`
}

function decodeSessionToken(token: string): { userId: string; expiresAt: Date } | null {
  try {
    if (!token.startsWith('sess_')) return null
    const encoded = token.substring(5)
    const decoded = Buffer.from(encoded, 'base64').toString('utf8')
    const payload = JSON.parse(decoded)
    return {
      userId: payload.userId,
      expiresAt: new Date(payload.expiresAt)
    }
  } catch {
    return null
  }
}

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

    // Create session token with embedded data for serverless persistence
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    const sessionToken = encodeSessionToken(user.id, expiresAt)
    
    // Also store in memory for local development
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
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
      console.log('MockAuth: validateSession called with token:', {
        tokenLength: sessionToken.length,
        tokenPreview: sessionToken.substring(0, 10) + '...',
        totalSessions: sessions.size,
        allSessionKeys: Array.from(sessions.keys()).map(k => k.substring(0, 10) + '...')
      })
    }
    
    // First try in-memory session (for local development)
    let session = sessions.get(sessionToken)
    
    // If not found in memory, try to decode from token (for serverless)
    if (!session) {
      if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
        console.log('MockAuth: Session not found in memory, trying to decode from token')
      }
      
      const decoded = decodeSessionToken(sessionToken)
      if (decoded) {
        session = decoded
        if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
          console.log('MockAuth: Successfully decoded session from token for userId:', decoded.userId)
        }
      } else {
        if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
          console.log('MockAuth: Failed to decode session token')
        }
        return null
      }
    }

    if (session.expiresAt < new Date()) {
      sessions.delete(sessionToken)
      if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
        console.log('MockAuth: Session expired, deleted')
      }
      return null
    }

    // Initialize users if not done yet
    await initializeMockUsers()

    const user = MOCK_USERS!.find(u => u.id === session.userId)
    if (!user) {
      if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
        console.log('MockAuth: User not found for session')
      }
      return null
    }

    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
      console.log('MockAuth: Session validation successful for user:', user.email)
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