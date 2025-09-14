import { NextRequest, NextResponse } from 'next/server'
import { SessionManager } from '@/lib/auth/session'
import { PermissionManager } from '@/lib/auth/permissions'
import { PermissionType } from '@prisma/client'
import { MuxService } from '@/lib/mux/mux-service'

export async function POST(request: NextRequest) {
  try {
    // Check authentication and permissions
    const session = await SessionManager.requireAuth()
    
    if (!PermissionManager.hasPermission(session.permissions, PermissionType.COURSE_CREATE) &&
        !PermissionManager.hasPermission(session.permissions, PermissionType.COURSE_EDIT)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to upload videos' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { fileName, corsOrigin } = body

    if (!fileName || !corsOrigin) {
      return NextResponse.json(
        { error: 'fileName and corsOrigin are required' },
        { status: 400 }
      )
    }

    // Validate file type
    const extension = fileName.split('.').pop()?.toLowerCase()
    const allowedExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v']
    
    if (!extension || !allowedExtensions.includes(extension)) {
      return NextResponse.json(
        { error: `Unsupported video format. Allowed: ${allowedExtensions.join(', ')}` },
        { status: 400 }
      )
    }

    console.log(`Creating Mux upload for video: ${fileName} by user: ${session.user.email}`)

    // Create Mux direct upload
    const uploadResult = await MuxService.createDirectUpload({
      corsOrigin,
      test: process.env.NODE_ENV === 'development'
    })

    console.log(`Mux upload created successfully:`, {
      uploadId: uploadResult.uploadId,
      assetId: uploadResult.assetId
    })

    return NextResponse.json({
      success: true,
      uploadUrl: uploadResult.uploadUrl,
      uploadId: uploadResult.uploadId,
      assetId: uploadResult.assetId,
      fileName
    })

  } catch (error) {
    console.error('Video upload creation failed:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to create video upload',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}