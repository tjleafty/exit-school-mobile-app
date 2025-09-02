import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session-token')?.value
  const userRole = request.cookies.get('user-role')?.value
  const pathname = request.nextUrl.pathname

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/courses', '/api/auth']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Check authentication (simplified for Edge Runtime compatibility)
  if (!token || !token.startsWith('demo-')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Role-based access control
  const headers = new Headers(request.headers)
  headers.set('x-user-role', userRole || 'STUDENT')

  // Admin routes
  if (pathname.startsWith('/admin') && userRole !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Instructor routes
  if (pathname.startsWith('/instructor') && 
      !['admin', 'instructor'].includes(userRole || '')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next({
    request: {
      headers: headers,
    },
  })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
}