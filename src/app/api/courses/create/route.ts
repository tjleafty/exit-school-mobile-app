import { NextRequest, NextResponse } from 'next/server'
import { SessionManager } from '@/lib/auth/session'
import { PermissionManager } from '@/lib/auth/permissions'
import { PermissionType, CourseStatus } from '@prisma/client'

// Mock course saving for Vercel deployment (since we don't have persistent database)
export async function POST(request: NextRequest) {
  try {
    // Check authentication and permissions
    const session = await SessionManager.requireAuth()
    
    if (!PermissionManager.hasPermission(session.permissions, PermissionType.COURSE_CREATE)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create courses' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, description, tags, modules, status } = body

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Course title and description are required' },
        { status: 400 }
      )
    }

    // Validate modules and lessons
    for (const module of modules) {
      if (!module.title) {
        return NextResponse.json(
          { error: 'All modules must have a title' },
          { status: 400 }
        )
      }

      for (const lesson of module.lessons) {
        if (!lesson.title) {
          return NextResponse.json(
            { error: 'All lessons must have a title' },
            { status: 400 }
          )
        }

        if (lesson.type === 'VIDEO' && !lesson.videoFile) {
          return NextResponse.json(
            { error: 'Video lessons must have a video file uploaded' },
            { status: 400 }
          )
        }
      }
    }

    console.log('Creating course:', {
      title,
      description,
      author: session.user.email,
      modulesCount: modules.length,
      totalLessons: modules.reduce((sum: number, m: any) => sum + m.lessons.length, 0),
      status
    })

    // In a real app, this would save to database with Prisma
    // For now, we'll simulate the response for the Vercel demo environment
    const courseId = `course_${Date.now()}`
    
    // Process the uploaded files and create database records
    const processedModules = modules.map((module: any) => ({
      ...module,
      lessons: module.lessons.map((lesson: any) => ({
        ...lesson,
        // Store the video and resource file metadata
        videoUrl: lesson.videoFile?.url,
        videoMuxAssetId: lesson.videoFile?.muxAssetId,
        resources: lesson.resources.map((resource: any) => ({
          name: resource.name,
          url: resource.url,
          size: resource.size,
          r2Key: resource.r2Key
        }))
      }))
    }))

    console.log('Course created successfully:', courseId)

    return NextResponse.json({
      success: true,
      courseId,
      message: 'Course created successfully',
      course: {
        id: courseId,
        title,
        description,
        status: status as CourseStatus,
        authorId: session.user.id,
        modules: processedModules,
        createdAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Course creation failed:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to create course',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}