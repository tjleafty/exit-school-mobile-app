import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { AuthService } from '@/lib/auth/auth-service'
import { setupProductionDatabase } from '@/lib/db/production-setup'
import { z } from 'zod'

const LoginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required')
})

export async function POST(request: NextRequest) {
  try {
    // Ensure database is set up in production
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      try {
        await setupProductionDatabase()
      } catch (setupError) {
        console.log('Database already initialized or setup error:', setupError)
      }
    }

    const body = await request.json()
    const validatedData = LoginSchema.parse(body)

    const result = await AuthService.login(validatedData)

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error 
      }, { status: 401 })
    }

    // Set session cookie
    if (result.sessionToken) {
      const cookieStore = cookies()
      cookieStore.set('session-token', result.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60, // 24 hours
        path: '/'
      })
    }

    return NextResponse.json({
      success: true,
      user: result.user
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 })
    }
    
    console.error('Login API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const sessionToken = cookieStore.get('session-token')?.value

    if (sessionToken) {
      await AuthService.logout(sessionToken)
    }

    // Clear session cookie
    cookieStore.delete('session-token')

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Logout API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}