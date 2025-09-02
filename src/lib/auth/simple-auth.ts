// Simple auth utilities for demo purposes
// This avoids Node.js APIs in middleware for Edge Runtime compatibility

export function createDemoSession(role: string) {
  return {
    token: `demo-${role}-token`,
    role: role,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  }
}

export function validateDemoToken(token: string) {
  if (!token || !token.startsWith('demo-')) {
    return null
  }

  const parts = token.split('-')
  if (parts.length !== 3 || parts[2] !== 'token') {
    return null
  }

  const role = parts[1]
  const validRoles = ['student', 'instructor', 'admin']
  
  if (!validRoles.includes(role)) {
    return null
  }

  return {
    role: role,
    isValid: true
  }
}

export function getUserRole(token?: string): string {
  if (!token) return 'guest'
  
  const validation = validateDemoToken(token)
  return validation?.role || 'guest'
}