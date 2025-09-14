import { NextRequest, NextResponse } from 'next/server'
import { SessionManager } from '@/lib/auth/session'
import { PermissionManager } from '@/lib/auth/permissions'
import { PermissionType } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    console.log('=== DEBUG AUTH ENDPOINT ===')
    
    const session = await SessionManager.getSession()
    
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'No session found',
        debug: {
          message: 'SessionManager.getSession() returned null',
          cookieExists: request.cookies.has('session-token'),
          cookieValue: request.cookies.get('session-token')?.value ? 'exists' : 'missing'
        }
      })
    }

    console.log('Session found for user:', session.user.email)
    
    const canAccessAdmin = PermissionManager.canAccessAdminPanel(session.permissions)
    const hasUserView = PermissionManager.hasPermission(session.permissions, PermissionType.USER_VIEW)
    
    return NextResponse.json({
      success: true,
      user: {
        email: session.user.email,
        role: session.user.role,
        isActive: session.user.isActive,
        isSuperUser: session.user.isSuperUser,
        status: session.user.status
      },
      permissions: {
        total: session.permissions.permissions.length,
        list: session.permissions.permissions,
        canAccessAdmin,
        hasUserView
      },
      checks: {
        adminPanelAccess: canAccessAdmin,
        userViewPermission: hasUserView,
        bothRequired: canAccessAdmin && hasUserView
      }
    })
    
  } catch (error) {
    console.error('Debug auth error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        type: error?.constructor?.name || 'Unknown',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      }
    })
  }
}