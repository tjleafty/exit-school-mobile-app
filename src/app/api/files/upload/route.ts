import { NextRequest, NextResponse } from 'next/server'
import { SessionManager } from '@/lib/auth/session'
import { PermissionManager } from '@/lib/auth/permissions'
import { PermissionType } from '@prisma/client'
import { R2Service } from '@/lib/cloudflare/r2-service'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

const FileUploadSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.number().positive('File size must be positive'),
  fileType: z.enum(['lesson-resource', 'course-thumbnail', 'user-avatar', 'document']),
  courseId: z.string().cuid().optional(),
  lessonId: z.string().cuid().optional(),
  contentType: z.string().min(1, 'Content type is required'),
})

export async function POST(request: NextRequest) {
  try {
    const session = await SessionManager.requireAuth()
    const body = await request.json()
    const { fileName, fileSize, fileType, courseId, lessonId, contentType } = FileUploadSchema.parse(body)

    // Validate file type and size based on category
    const validation = validateFileUpload(fileName, fileSize, fileType)
    if (!validation.valid) {
      return NextResponse.json({ 
        error: validation.error 
      }, { status: 400 })
    }

    // Check permissions based on file type
    const permissionCheck = await checkUploadPermissions(session, fileType, courseId, lessonId)
    if (!permissionCheck.allowed) {
      return NextResponse.json({ 
        error: permissionCheck.error 
      }, { status: 403 })
    }

    // Generate unique key for the file
    const key = R2Service.generateKey({
      type: fileType,
      courseId,
      lessonId,
      userId: session.user.id,
      fileName,
    })

    // Generate presigned upload URL
    const uploadResult = await R2Service.generatePresignedUploadUrl({
      key,
      contentType,
      maxSize: validation.maxSize,
      expiresIn: 3600, // 1 hour
    })

    // Create file record in database
    const resourceFile = await prisma.resourceFile.create({
      data: {
        lessonId: lessonId || undefined,
        fileName,
        fileUrl: uploadResult.publicUrl,
        fileSize,
        mimeType: contentType,
      }
    })

    return NextResponse.json({
      success: true,
      uploadUrl: uploadResult.uploadUrl,
      key: uploadResult.key,
      publicUrl: uploadResult.publicUrl,
      resourceFileId: resourceFile.id,
    })

  } catch (error) {
    console.error('File upload API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to create file upload' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await SessionManager.requireAuth()
    const searchParams = request.nextUrl.searchParams
    const fileId = searchParams.get('fileId')
    const key = searchParams.get('key')

    if (!fileId && !key) {
      return NextResponse.json({ 
        error: 'File ID or key is required' 
      }, { status: 400 })
    }

    let resourceFile
    
    if (fileId) {
      resourceFile = await prisma.resourceFile.findUnique({
        where: { id: fileId },
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
    } else if (key) {
      resourceFile = await prisma.resourceFile.findFirst({
        where: { fileUrl: { contains: key } },
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
    }

    if (!resourceFile) {
      return NextResponse.json({ 
        error: 'File not found' 
      }, { status: 404 })
    }

    // Check access permissions
    if (resourceFile.lesson) {
      const canView = PermissionManager.canAccessCourse(
        session.permissions, 
        resourceFile.lesson.module.courseId, 
        'view'
      )

      if (!canView) {
        return NextResponse.json({ 
          error: 'Access denied' 
        }, { status: 403 })
      }
    }

    // Extract key from URL for R2 operations
    const urlParts = resourceFile.fileUrl.split('/')
    const fileKey = urlParts.slice(-4).join('/') // Assuming our key structure

    // Generate signed download URL
    const downloadUrl = await R2Service.generatePresignedDownloadUrl({
      key: fileKey,
      expiresIn: 3600, // 1 hour
      fileName: resourceFile.fileName,
    })

    return NextResponse.json({
      success: true,
      file: {
        id: resourceFile.id,
        fileName: resourceFile.fileName,
        fileSize: resourceFile.fileSize,
        mimeType: resourceFile.mimeType,
        downloadUrl,
      }
    })

  } catch (error) {
    console.error('File fetch API error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch file information' 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await SessionManager.requireAuth()
    const searchParams = request.nextUrl.searchParams
    const fileId = searchParams.get('fileId')

    if (!fileId) {
      return NextResponse.json({ 
        error: 'File ID is required' 
      }, { status: 400 })
    }

    const resourceFile = await prisma.resourceFile.findUnique({
      where: { id: fileId },
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

    if (!resourceFile) {
      return NextResponse.json({ 
        error: 'File not found' 
      }, { status: 404 })
    }

    // Check delete permissions
    const isAdmin = PermissionManager.hasPermission(session.permissions, PermissionType.ADMIN_PANEL_ACCESS)
    let canDelete = false
    
    if (resourceFile.lesson) {
      // Check if user is course author, admin, or has course edit permissions
      const isAuthor = resourceFile.lesson.module.course.authorId === session.user.id
      const canEditCourses = PermissionManager.hasPermission(session.permissions, PermissionType.COURSE_EDIT)
      canDelete = isAuthor || isAdmin || canEditCourses
    } else {
      // For non-lesson files, require admin or course edit permissions
      const canEditCourses = PermissionManager.hasPermission(session.permissions, PermissionType.COURSE_EDIT)
      canDelete = isAdmin || canEditCourses
    }

    if (!canDelete) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to delete this file. Must be instructor or admin.' 
      }, { status: 403 })
    }

    // Extract key from URL for R2 deletion
    const urlParts = resourceFile.fileUrl.split('/')
    const fileKey = urlParts.slice(-4).join('/')

    // Delete from R2
    const deleted = await R2Service.deleteFile(fileKey)
    
    if (deleted) {
      // Delete from database
      await prisma.resourceFile.delete({
        where: { id: fileId }
      })

      return NextResponse.json({
        success: true,
        message: 'File deleted successfully'
      })
    } else {
      return NextResponse.json({ 
        error: 'Failed to delete file from storage' 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('File delete API error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete file' 
    }, { status: 500 })
  }
}

function validateFileUpload(fileName: string, fileSize: number, fileType: string) {
  const allowedTypes: Record<string, { extensions: string[], maxSizeMB: number }> = {
    'lesson-resource': {
      extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar', '7z'],
      maxSizeMB: 100
    },
    'course-thumbnail': {
      extensions: ['jpg', 'jpeg', 'png', 'webp'],
      maxSizeMB: 5
    },
    'user-avatar': {
      extensions: ['jpg', 'jpeg', 'png', 'webp'],
      maxSizeMB: 2
    },
    'document': {
      extensions: ['pdf', 'doc', 'docx', 'txt'],
      maxSizeMB: 50
    }
  }

  const config = allowedTypes[fileType]
  if (!config) {
    return { valid: false, error: 'Invalid file type' }
  }

  if (!R2Service.validateFileType(fileName, config.extensions)) {
    return { 
      valid: false, 
      error: `File type not allowed. Allowed types: ${config.extensions.join(', ')}` 
    }
  }

  if (!R2Service.validateFileSize(fileSize, config.maxSizeMB)) {
    return { 
      valid: false, 
      error: `File size too large. Maximum size: ${config.maxSizeMB}MB` 
    }
  }

  return { valid: true, maxSize: config.maxSizeMB * 1024 * 1024 }
}

async function checkUploadPermissions(session: any, fileType: string, courseId?: string, lessonId?: string) {
  // Check if user is admin (admins can upload anything)
  const isAdmin = PermissionManager.hasPermission(session.permissions, PermissionType.ADMIN_PANEL_ACCESS)
  
  switch (fileType) {
    case 'lesson-resource':
      if (!courseId || !lessonId) {
        return { allowed: false, error: 'Course ID and Lesson ID required for lesson resources' }
      }
      
      // Admins can upload to any course, otherwise check course edit permissions
      if (isAdmin) {
        return { allowed: true }
      }
      
      const canEdit = PermissionManager.canAccessCourse(session.permissions, courseId, 'edit')
      const canEditCoursesForResource = PermissionManager.hasPermission(session.permissions, PermissionType.COURSE_EDIT)
      
      if (!canEdit && !canEditCoursesForResource) {
        return { allowed: false, error: 'Insufficient permissions to add resources to this course. Must be instructor or admin.' }
      }
      break

    case 'course-thumbnail':
      if (!courseId) {
        return { allowed: false, error: 'Course ID required for course thumbnails' }
      }
      
      // Admins can upload to any course
      if (isAdmin) {
        return { allowed: true }
      }
      
      const canEditCourse = PermissionManager.canAccessCourse(session.permissions, courseId, 'edit')
      const canEditCoursesForThumbnail = PermissionManager.hasPermission(session.permissions, PermissionType.COURSE_EDIT)
      
      if (!canEditCourse && !canEditCoursesForThumbnail) {
        return { allowed: false, error: 'Insufficient permissions to edit this course. Must be instructor or admin.' }
      }
      break

    case 'user-avatar':
      // Users can upload their own avatars, admins can upload any avatar
      break

    case 'document':
      // Admins can upload any document, instructors can upload course-related documents
      const canCreateCoursesForDoc = PermissionManager.hasPermission(session.permissions, PermissionType.COURSE_CREATE)
      const canEditCoursesForDoc = PermissionManager.hasPermission(session.permissions, PermissionType.COURSE_EDIT)
      
      if (!isAdmin && !canCreateCoursesForDoc && !canEditCoursesForDoc) {
        return { allowed: false, error: 'Insufficient permissions to upload documents. Must be instructor or admin.' }
      }
      break

    default:
      return { allowed: false, error: 'Invalid file type' }
  }

  return { allowed: true }
}