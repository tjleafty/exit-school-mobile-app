import { NextRequest, NextResponse } from 'next/server'
import { SessionManager } from '@/lib/auth/session'
import { PermissionManager } from '@/lib/auth/permissions'
import { PermissionType } from '@prisma/client'
import { ProgressTracker } from '@/lib/progress/progress-tracker'
import { z } from 'zod'

const GetProgressSummarySchema = z.object({
  userId: z.string().cuid(),
  courseId: z.string().cuid().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await SessionManager.requireAuth()
    const searchParams = request.nextUrl.searchParams
    
    const userId = searchParams.get('userId')
    const courseId = searchParams.get('courseId')

    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required' 
      }, { status: 400 })
    }

    // Check permissions - users can view their own progress, admin/instructors can view any
    const canViewAnyUser = PermissionManager.hasPermission(session.permissions, PermissionType.USER_VIEW)
    
    if (userId !== session.user.id && !canViewAnyUser) {
      return NextResponse.json({ 
        error: 'Access denied' 
      }, { status: 403 })
    }

    // If courseId is provided, check course access
    if (courseId) {
      const canViewCourse = PermissionManager.canAccessCourse(
        session.permissions, 
        courseId, 
        'view'
      )
      
      if (!canViewCourse) {
        return NextResponse.json({ 
          error: 'Access denied to course' 
        }, { status: 403 })
      }
    }

    const summary = await ProgressTracker.getProgressSummary(userId, courseId || undefined)
    
    return NextResponse.json({
      success: true,
      summary
    })

  } catch (error) {
    console.error('Progress summary API error:', error)
    return NextResponse.json({ 
      error: 'Failed to get progress summary' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await SessionManager.requireAuth()
    const body = await request.json()
    const { userId, courseId } = GetProgressSummarySchema.parse(body)

    // Check permissions - users can view their own progress, admin/instructors can view any
    const canViewAnyUser = PermissionManager.hasPermission(session.permissions, PermissionType.USER_VIEW)
    
    if (userId !== session.user.id && !canViewAnyUser) {
      return NextResponse.json({ 
        error: 'Access denied' 
      }, { status: 403 })
    }

    // If courseId is provided, check course access
    if (courseId) {
      const canViewCourse = PermissionManager.canAccessCourse(
        session.permissions, 
        courseId, 
        'view'
      )
      
      if (!canViewCourse) {
        return NextResponse.json({ 
          error: 'Access denied to course' 
        }, { status: 403 })
      }
    }

    const summary = await ProgressTracker.getProgressSummary(userId, courseId)
    
    return NextResponse.json({
      success: true,
      summary
    })

  } catch (error) {
    console.error('Progress summary API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to get progress summary' 
    }, { status: 500 })
  }
}