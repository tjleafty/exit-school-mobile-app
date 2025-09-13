import { NextRequest, NextResponse } from 'next/server'
import { SessionManager } from '@/lib/auth/session'
import { PermissionManager } from '@/lib/auth/permissions'
import { PermissionType } from '@prisma/client'
import { ProgressTracker } from '@/lib/progress/progress-tracker'
import { z } from 'zod'

const StartSessionSchema = z.object({
  userId: z.string().cuid(),
  lessonId: z.string().cuid(),
})

const EndSessionSchema = z.object({
  sessionId: z.string().cuid(),
})

const UpdateProgressSchema = z.object({
  userId: z.string().cuid(),
  lessonId: z.string().cuid(),
  currentTime: z.number().min(0),
  duration: z.number().min(0),
  percentWatched: z.number().min(0).max(100),
  completed: z.boolean().optional(),
})

const RecordInteractionSchema = z.object({
  sessionId: z.string().cuid(),
  type: z.enum([
    'LESSON_START',
    'LESSON_PAUSE', 
    'LESSON_RESUME',
    'LESSON_SEEK',
    'LESSON_COMPLETE',
    'RESOURCE_DOWNLOAD',
    'QUIZ_START',
    'QUIZ_SUBMIT',
    'NOTE_CREATE',
    'BOOKMARK_ADD'
  ]),
  timestamp: z.string().transform(str => new Date(str)),
  position: z.number().optional(),
  data: z.any().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await SessionManager.requireAuth()
    const body = await request.json()
    const action = body.action

    switch (action) {
      case 'start': {
        const { userId, lessonId } = StartSessionSchema.parse(body)
        
        // Check if user can start session (must be the same user or admin/instructor)
        if (userId !== session.user.id && 
            !PermissionManager.hasPermission(session.permissions, PermissionType.USER_VIEW)) {
          return NextResponse.json({ 
            error: 'Access denied' 
          }, { status: 403 })
        }

        const result = await ProgressTracker.startLearningSession(userId, lessonId)
        
        return NextResponse.json({
          success: true,
          session: result
        })
      }

      case 'end': {
        const { sessionId } = EndSessionSchema.parse(body)
        
        const result = await ProgressTracker.endLearningSession(sessionId)
        
        return NextResponse.json({
          success: true,
          session: result
        })
      }

      case 'update-progress': {
        const { userId, lessonId, currentTime, duration, percentWatched, completed } = UpdateProgressSchema.parse(body)
        
        // Check if user can update progress (must be the same user or admin/instructor)
        if (userId !== session.user.id && 
            !PermissionManager.hasPermission(session.permissions, PermissionType.USER_VIEW)) {
          return NextResponse.json({ 
            error: 'Access denied' 
          }, { status: 403 })
        }

        const result = await ProgressTracker.updateProgress(userId, lessonId, {
          lessonId,
          currentTime,
          duration,
          percentWatched,
          completed
        })
        
        return NextResponse.json({
          success: true,
          progress: result
        })
      }

      case 'record-interaction': {
        const { sessionId, type, timestamp, position, data } = RecordInteractionSchema.parse(body)
        
        const result = await ProgressTracker.recordInteraction(sessionId, {
          type,
          timestamp,
          position,
          data
        })
        
        return NextResponse.json({
          success: true,
          interaction: result
        })
      }

      default:
        return NextResponse.json({ 
          error: 'Invalid action' 
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Progress session API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to process progress session request' 
    }, { status: 500 })
  }
}