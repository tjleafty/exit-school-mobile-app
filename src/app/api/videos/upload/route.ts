import { NextRequest, NextResponse } from 'next/server'
import { SessionManager } from '@/lib/auth/session'
import { PermissionManager } from '@/lib/auth/permissions'
import { PermissionType } from '@prisma/client'
import { MuxService } from '@/lib/mux/mux-service'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

const VideoUploadSchema = z.object({
  lessonId: z.string().cuid(),
  title: z.string().min(1, 'Title is required'),
  corsOrigin: z.string().url().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await SessionManager.requireAuth()

    // Check if user can create/edit courses (instructors and admins)
    const canEditCourses = PermissionManager.hasPermission(session.permissions, PermissionType.COURSE_EDIT)
    const isAdmin = PermissionManager.hasPermission(session.permissions, PermissionType.ADMIN_PANEL_ACCESS)
    
    if (!canEditCourses && !isAdmin) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to upload videos. Must be an instructor or admin.' 
      }, { status: 403 })
    }

    const body = await request.json()
    const { lessonId, title, corsOrigin } = VideoUploadSchema.parse(body)

    // Verify the lesson exists and user has access
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: {
              include: {
                author: true
              }
            }
          }
        }
      }
    })

    if (!lesson) {
      return NextResponse.json({ 
        error: 'Lesson not found' 
      }, { status: 404 })
    }

    // Check if user is the course author, has admin permissions, or can edit courses
    const isAuthor = lesson.module.course.authorId === session.user.id
    const isAdminUser = PermissionManager.hasPermission(session.permissions, PermissionType.ADMIN_PANEL_ACCESS)
    const canEditAnyCourse = PermissionManager.hasPermission(session.permissions, PermissionType.COURSE_EDIT) && isAdminUser
    
    if (!isAuthor && !isAdminUser && !canEditAnyCourse) {
      return NextResponse.json({ 
        error: 'You can only upload videos to your own courses or you must be an admin' 
      }, { status: 403 })
    }

    // Check if lesson already has a video
    const existingVideo = await prisma.videoAsset.findUnique({
      where: { lessonId }
    })

    if (existingVideo) {
      return NextResponse.json({ 
        error: 'Lesson already has a video. Delete the existing video first.' 
      }, { status: 409 })
    }

    // Create Mux upload
    const origin = corsOrigin || request.headers.get('origin') || 'http://localhost:3000'
    const uploadResult = await MuxService.createDirectUpload({
      corsOrigin: origin,
      test: process.env.NODE_ENV !== 'production',
    })

    // Create video asset record in database
    const videoAsset = await prisma.videoAsset.create({
      data: {
        lessonId,
        muxAssetId: uploadResult.assetId,
        status: 'UPLOADING',
      }
    })

    // Update lesson to video type
    await prisma.lesson.update({
      where: { id: lessonId },
      data: { 
        type: 'VIDEO',
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      uploadUrl: uploadResult.uploadUrl,
      uploadId: uploadResult.uploadId,
      assetId: uploadResult.assetId,
      videoAssetId: videoAsset.id,
    })

  } catch (error) {
    console.error('Video upload API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to create video upload' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await SessionManager.requireAuth()
    const searchParams = request.nextUrl.searchParams
    const lessonId = searchParams.get('lessonId')

    if (!lessonId) {
      return NextResponse.json({ 
        error: 'Lesson ID is required' 
      }, { status: 400 })
    }

    // Get video asset info
    const videoAsset = await prisma.videoAsset.findUnique({
      where: { lessonId },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: true
              }
            }
          }
        }
      }
    })

    if (!videoAsset) {
      return NextResponse.json({ 
        error: 'Video not found' 
      }, { status: 404 })
    }

    // Check access permissions
    const canView = PermissionManager.canAccessCourse(
      session.permissions, 
      videoAsset.lesson.module.courseId, 
      'view'
    )

    if (!canView) {
      return NextResponse.json({ 
        error: 'Access denied' 
      }, { status: 403 })
    }

    // Get latest info from Mux if asset is ready
    if (videoAsset.muxAssetId && videoAsset.status === 'READY') {
      const muxAsset = await MuxService.getAsset(videoAsset.muxAssetId)
      
      if (muxAsset && muxAsset.playbackId) {
        // Generate signed playback URL for security
        const signedUrl = MuxService.generateSignedPlaybackUrl(muxAsset.playbackId, {
          expiresIn: 7200, // 2 hours
        })

        return NextResponse.json({
          success: true,
          videoAsset: {
            id: videoAsset.id,
            status: videoAsset.status,
            duration: muxAsset.duration,
            playbackUrl: signedUrl,
            thumbnailUrl: videoAsset.thumbnailUrl,
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      videoAsset: {
        id: videoAsset.id,
        status: videoAsset.status,
        duration: videoAsset.duration,
        thumbnailUrl: videoAsset.thumbnailUrl,
      }
    })

  } catch (error) {
    console.error('Video fetch API error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch video information' 
    }, { status: 500 })
  }
}