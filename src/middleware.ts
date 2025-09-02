import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { authProvider } from '@/lib/auth/provider'

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session-token')?.value
  const pathname = request.nextUrl.pathname

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/api/auth/login', '/api/auth/magic-link']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Check authentication
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const session = await authProvider.getSession(token)
    
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Role-based access control
    const headers = new Headers(request.headers)
    headers.set('x-user-id', session.user.id)
    headers.set('x-user-role', session.user.role)

    // Admin routes
    if (pathname.startsWith('/admin') && session.user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Instructor routes
    if (pathname.startsWith('/instructor') && 
        !['ADMIN', 'INSTRUCTOR'].includes(session.user.role)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next({
      request: {
        headers: headers,
      },
    })
  } catch (error) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}