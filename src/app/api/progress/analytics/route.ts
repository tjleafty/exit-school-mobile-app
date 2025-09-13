import { NextRequest, NextResponse } from 'next/server'
import { SessionManager } from '@/lib/auth/session'
import { PermissionManager } from '@/lib/auth/permissions'
import { PermissionType } from '@prisma/client'
import { ProgressTracker } from '@/lib/progress/progress-tracker'
import { z } from 'zod'

const GetCourseAnalyticsSchema = z.object({
  courseId: z.string().cuid(),
})

const GetUserProgressSchema = z.object({
  userId: z.string().cuid(),
  courseId: z.string().cuid().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await SessionManager.requireAuth()
    const searchParams = request.nextUrl.searchParams
    
    const type = searchParams.get('type')
    const courseId = searchParams.get('courseId')
    const userId = searchParams.get('userId')

    switch (type) {
      case 'course': {
        if (!courseId) {
          return NextResponse.json({ 
            error: 'Course ID is required for course analytics' 
          }, { status: 400 })
        }

        // Check if user can view course analytics (admin/instructor only)
        const canViewAnalytics = PermissionManager.hasPermission(session.permissions, PermissionType.USER_VIEW) ||
                                PermissionManager.hasPermission(session.permissions, PermissionType.ADMIN_PANEL_ACCESS)
        
        if (!canViewAnalytics) {
          return NextResponse.json({ 
            error: 'Insufficient permissions to view course analytics' 
          }, { status: 403 })
        }

        // Check course access
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

        const analytics = await ProgressTracker.getCourseAnalytics(courseId)
        
        return NextResponse.json({
          success: true,
          analytics
        })
      }

      case 'user': {
        if (!userId) {
          return NextResponse.json({ 
            error: 'User ID is required for user progress' 
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

        const progress = await ProgressTracker.getUserProgress(userId, courseId || undefined)
        
        return NextResponse.json({
          success: true,
          progress
        })
      }

      default:
        return NextResponse.json({ 
          error: 'Invalid analytics type. Use "course" or "user"' 
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Progress analytics API error:', error)
    return NextResponse.json({ 
      error: 'Failed to get analytics data' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await SessionManager.requireAuth()
    const body = await request.json()
    const type = body.type

    switch (type) {
      case 'course': {
        const { courseId } = GetCourseAnalyticsSchema.parse(body)

        // Check if user can view course analytics (admin/instructor only)
        const canViewAnalytics = PermissionManager.hasPermission(session.permissions, PermissionType.USER_VIEW) ||
                                PermissionManager.hasPermission(session.permissions, PermissionType.ADMIN_PANEL_ACCESS)
        
        if (!canViewAnalytics) {
          return NextResponse.json({ 
            error: 'Insufficient permissions to view course analytics' 
          }, { status: 403 })
        }

        // Check course access
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

        const analytics = await ProgressTracker.getCourseAnalytics(courseId)
        
        return NextResponse.json({
          success: true,
          analytics
        })
      }

      case 'user': {
        const { userId, courseId } = GetUserProgressSchema.parse(body)

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

        const progress = await ProgressTracker.getUserProgress(userId, courseId)
        
        return NextResponse.json({
          success: true,
          progress
        })
      }

      default:
        return NextResponse.json({ 
          error: 'Invalid analytics type. Use "course" or "user"' 
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Progress analytics API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to get analytics data' 
    }, { status: 500 })
  }
}