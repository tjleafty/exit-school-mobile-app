import { NextRequest, NextResponse } from 'next/server'
import { SessionManager } from '@/lib/auth/session'
import { PermissionManager } from '@/lib/auth/permissions'
import { PermissionType } from '@prisma/client'

// Check if we're in demo mode (when real credentials aren't configured)
const isDemoMode = !process.env.CLOUDFLARE_ACCOUNT_ID || 
                   process.env.CLOUDFLARE_ACCOUNT_ID === 'your_cloudflare_account_id_here' ||
                   !process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || 
                   process.env.CLOUDFLARE_R2_ACCESS_KEY_ID === 'your_r2_access_key_id_here'

export async function POST(request: NextRequest) {
  try {
    // Check authentication and permissions
    const session = await SessionManager.requireAuth()
    
    if (!PermissionManager.hasPermission(session.permissions, PermissionType.COURSE_CREATE) &&
        !PermissionManager.hasPermission(session.permissions, PermissionType.COURSE_EDIT)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to upload documents' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { fileName, fileSize, contentType } = body

    if (!fileName || !fileSize) {
      return NextResponse.json(
        { error: 'fileName and fileSize are required' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar', '7z']
    const extension = fileName.split('.').pop()?.toLowerCase()
    
    if (!extension || !allowedExtensions.includes(extension)) {
      return NextResponse.json(
        { error: `Unsupported document format. Allowed: ${allowedExtensions.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate file size (max 100MB for documents)
    const maxSizeBytes = 100 * 1024 * 1024 // 100MB
    if (fileSize > maxSizeBytes) {
      return NextResponse.json(
        { error: 'File size exceeds 100MB limit' },
        { status: 400 }
      )
    }

    console.log(`Creating document upload for: ${fileName} by user: ${session.user.email}`)

    if (isDemoMode) {
      // Demo mode: simulate R2 upload without real API calls
      console.log('Demo mode: Simulating Cloudflare R2 document upload')
      
      const mockKey = `demo/documents/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const mockPublicUrl = `/api/demo/files/${mockKey}`
      
      // Create a mock upload URL that will accept the document file
      const mockUploadUrl = `/api/demo/upload-receiver?type=document&key=${encodeURIComponent(mockKey)}`
      
      return NextResponse.json({
        success: true,
        uploadUrl: mockUploadUrl,
        key: mockKey,
        publicUrl: mockPublicUrl,
        fileName,
        demo: true,
        message: 'Demo mode: Document upload simulated. In production, this would upload to Cloudflare R2.'
      })
    } else {
      // Production mode: Use real R2 API
      const { R2Service } = await import('@/lib/cloudflare/r2-service')
      
      // Generate R2 key
      const key = R2Service.generateKey({
        type: 'document',
        fileName
      })

      // Create presigned upload URL
      const uploadResult = await R2Service.generatePresignedUploadUrl({
        key,
        contentType: contentType || R2Service.getContentType(fileName),
        expiresIn: 3600 // 1 hour
      })

      console.log(`R2 upload URL created successfully for key: ${key}`)

      return NextResponse.json({
        success: true,
        uploadUrl: uploadResult.uploadUrl,
        key: uploadResult.key,
        publicUrl: uploadResult.publicUrl,
        fileName
      })
    }

  } catch (error) {
    console.error('Document upload creation failed:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to create document upload',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}