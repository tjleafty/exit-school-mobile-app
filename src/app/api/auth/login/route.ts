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
    console.log('Login API called - Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT_SET'
    })

    // Ensure database is set up in production
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      try {
        console.log('Setting up production database...')
        await setupProductionDatabase()
        console.log('Production database setup completed successfully')
      } catch (setupError) {
        console.error('Database setup error:', setupError)
        return NextResponse.json({ 
          error: 'Database initialization failed',
          details: setupError instanceof Error ? setupError.message : 'Unknown error'
        }, { status: 500 })
      }
    }

    const body = await request.json()
    console.log('Login request for email:', body.email)
    const validatedData = LoginSchema.parse(body)

    const result = await AuthService.login(validatedData)
    console.log('Login result:', { success: result.success, error: result.error })

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
      console.log('Session cookie set successfully')
    }

    return NextResponse.json({
      success: true,
      user: result.user
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.issues)
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 })
    }
    
    console.error('Login API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
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