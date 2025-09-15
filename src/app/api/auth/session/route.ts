import { NextRequest, NextResponse } from 'next/server'
import { SessionManager } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  try {
    const session = await SessionManager.getSession()
    
    if (!session) {
      return NextResponse.json({ 
        authenticated: false 
      })
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        isSuperUser: session.user.isSuperUser,
        isActive: session.user.isActive
      }
    })

  } catch (error) {
    console.error('Session API error:', error)
    return NextResponse.json({ 
      authenticated: false 
    })
  }
}