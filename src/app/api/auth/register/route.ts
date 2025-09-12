import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, Role, UserStatus } from '@prisma/client'
import { PasswordManager } from '@/lib/auth/password'
import { z } from 'zod'

const prisma = new PrismaClient()

const RegisterSchema = z.object({
  email: z.string().email('Valid email is required'),
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['STUDENT', 'INSTRUCTOR']).default('STUDENT')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = RegisterSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json({ 
        error: 'User with this email already exists' 
      }, { status: 409 })
    }

    // Validate password strength
    const passwordValidation = PasswordManager.validatePasswordStrength(validatedData.password)
    if (!passwordValidation.isValid) {
      return NextResponse.json({ 
        error: 'Password does not meet requirements', 
        details: passwordValidation.errors 
      }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await PasswordManager.hashPassword(validatedData.password)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedData.email.toLowerCase(),
        name: validatedData.name,
        password: hashedPassword,
        role: validatedData.role as Role,
        status: UserStatus.ACTIVE,
        isActive: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true
      }
    })

    // Log the registration
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_REGISTERED',
        entityType: 'USER',
        entityId: user.id,
        metadata: {
          registrationMethod: 'email_password',
          role: user.role,
          timestamp: new Date()
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 })
    }
    
    console.error('Registration API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}