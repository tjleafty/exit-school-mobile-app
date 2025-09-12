import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SessionManager } from '@/lib/auth/session'
import { PermissionManager, getRequiredPermissions } from '@/lib/auth/permissions'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for public paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password') ||
    pathname === '/' ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next()
  }

  try {
    // Get session from cookie
    const sessionToken = request.cookies.get('session-token')?.value
    
    if (!sessionToken) {
      return redirectToLogin(request)
    }

    const session = await SessionManager.getSessionByToken(sessionToken)
    
    if (!session) {
      return redirectToLogin(request)
    }

    // Check route-specific permissions
    const requiredPermissions = getRequiredPermissions(pathname)
    
    if (requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every(permission =>
        PermissionManager.hasPermission(session.permissions, permission)
      )
      
      if (!hasAllPermissions) {
        // Redirect to unauthorized page or back to dashboard
        return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url))
      }
    }

    // Add session info to headers for use in components
    const response = NextResponse.next()
    response.headers.set('x-user-id', session.user.id)
    response.headers.set('x-user-role', session.user.role)
    
    return response

  } catch (error) {
    console.error('Middleware error:', error)
    return redirectToLogin(request)
  }
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('returnUrl', request.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|api/auth).*)',
  ],
}