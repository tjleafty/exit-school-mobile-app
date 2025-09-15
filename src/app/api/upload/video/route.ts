import { NextRequest, NextResponse } from 'next/server'
import { SessionManager } from '@/lib/auth/session'
import { PermissionManager } from '@/lib/auth/permissions'
import { PermissionType } from '@prisma/client'

// Check if we're in demo mode (when real credentials aren't configured)
const isDemoMode = !process.env.MUX_TOKEN_ID || 
                   process.env.MUX_TOKEN_ID === 'your_mux_token_id_here' ||
                   !process.env.MUX_TOKEN_SECRET || 
                   process.env.MUX_TOKEN_SECRET === 'your_mux_token_secret_here'

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

    console.log(`Creating video upload for: ${fileName} by user: ${session.user.email}`)

    if (isDemoMode) {
      // Demo mode: simulate Mux upload without real API calls
      console.log('Demo mode: Simulating Mux video upload')
      
      const mockAssetId = `demo_asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const mockUploadId = `demo_upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Create a mock upload URL that will accept the video file
      const mockUploadUrl = `/api/demo/upload-receiver?type=video&assetId=${mockAssetId}`
      
      return NextResponse.json({
        success: true,
        uploadUrl: mockUploadUrl,
        uploadId: mockUploadId,
        assetId: mockAssetId,
        fileName,
        demo: true,
        message: 'Demo mode: Video upload simulated. In production, this would upload to Mux.'
      })
    } else {
      // Production mode: Use real Mux API
      const { MuxService } = await import('@/lib/mux/mux-service')
      
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
    }

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