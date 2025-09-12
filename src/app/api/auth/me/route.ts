import { NextRequest, NextResponse } from 'next/server'
import { SessionManager } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  try {
    const session = await SessionManager.getSession()

    if (!session) {
      return NextResponse.json({ 
        error: 'Not authenticated' 
      }, { status: 401 })
    }

    return NextResponse.json({
      user: session.user,
      permissions: session.permissions,
      expires: session.expires
    })

  } catch (error) {
    console.error('Auth me API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}