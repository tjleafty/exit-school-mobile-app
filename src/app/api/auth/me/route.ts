import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SessionManager } from '@/lib/auth/session'
import { MockAuthService } from '@/lib/auth/mock-auth'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const sessionToken = cookieStore.get('session-token')?.value

    if (!sessionToken) {
      return NextResponse.json({ 
        error: 'Not authenticated' 
      }, { status: 401 })
    }

    let user = null

    // Try real authentication first
    try {
      const session = await SessionManager.getSession()
      user = session?.user || null
    } catch (error) {
      console.error('Database session validation failed, trying mock auth:', error)
      user = await MockAuthService.validateSession(sessionToken)
    }

    if (!user) {
      return NextResponse.json({ 
        error: 'Invalid or expired session' 
      }, { status: 401 })
    }

    return NextResponse.json({
      user,
      permissions: [], // Mock empty permissions for now
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    })

  } catch (error) {
    console.error('Auth me API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}