import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

if (!process.env.CLOUDFLARE_ACCOUNT_ID || 
    !process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || 
    !process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
    !process.env.CLOUDFLARE_R2_BUCKET_NAME) {
  throw new Error('Cloudflare R2 environment variables are required')
}

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
})

export interface UploadPresignedUrlResult {
  uploadUrl: string
  key: string
  publicUrl: string
}

export interface FileMetadata {
  key: string
  fileName: string
  fileSize: number
  mimeType: string
  uploadedBy: string
  uploadedAt: Date
}

export class R2Service {
  private static bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME!

  static async generatePresignedUploadUrl(options: {
    key: string
    contentType: string
    maxSize?: number
    expiresIn?: number // seconds, default 1 hour
  }): Promise<UploadPresignedUrlResult> {
    const { key, contentType, expiresIn = 3600 } = options

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      })

      const uploadUrl = await getSignedUrl(r2Client, command, {
        expiresIn,
      })

      const publicUrl = this.getPublicUrl(key)

      return {
        uploadUrl,
        key,
        publicUrl,
      }
    } catch (error) {
      console.error('Failed to generate presigned upload URL:', error)
      throw new Error('Failed to generate upload URL')
    }
  }

  static async generatePresignedDownloadUrl(options: {
    key: string
    expiresIn?: number // seconds, default 1 hour
    fileName?: string // For download with custom filename
  }): Promise<string> {
    const { key, expiresIn = 3600, fileName } = options

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ResponseContentDisposition: fileName 
          ? `attachment; filename="${fileName}"` 
          : undefined,
      })

      return await getSignedUrl(r2Client, command, {
        expiresIn,
      })
    } catch (error) {
      console.error('Failed to generate presigned download URL:', error)
      throw new Error('Failed to generate download URL')
    }
  }

  static async deleteFile(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })

      await r2Client.send(command)
      return true
    } catch (error) {
      console.error('Failed to delete file from R2:', error)
      return false
    }
  }

  static getPublicUrl(key: string): string {
    // If you have a custom domain configured for your R2 bucket, use that instead
    // For now, using the default R2 public URL format
    return `https://${this.bucketName}.${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`
  }

  static generateKey(options: {
    type: 'lesson-resource' | 'course-thumbnail' | 'user-avatar' | 'document'
    courseId?: string
    lessonId?: string
    userId?: string
    fileName: string
  }): string {
    const { type, courseId, lessonId, userId, fileName } = options
    const timestamp = Date.now()
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')

    switch (type) {
      case 'lesson-resource':
        if (!courseId || !lessonId) {
          throw new Error('Course ID and Lesson ID required for lesson resources')
        }
        return `courses/${courseId}/lessons/${lessonId}/resources/${timestamp}_${sanitizedFileName}`
      
      case 'course-thumbnail':
        if (!courseId) {
          throw new Error('Course ID required for course thumbnails')
        }
        return `courses/${courseId}/thumbnail/${timestamp}_${sanitizedFileName}`
      
      case 'user-avatar':
        if (!userId) {
          throw new Error('User ID required for user avatars')
        }
        return `users/${userId}/avatar/${timestamp}_${sanitizedFileName}`
      
      case 'document':
        return `documents/${timestamp}_${sanitizedFileName}`
      
      default:
        throw new Error('Invalid file type')
    }
  }

  static validateFileType(fileName: string, allowedTypes: string[]): boolean {
    const extension = fileName.split('.').pop()?.toLowerCase()
    return extension ? allowedTypes.includes(extension) : false
  }

  static validateFileSize(fileSize: number, maxSizeMB: number): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    return fileSize <= maxSizeBytes
  }

  static getContentType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase()
    
    const mimeTypes: Record<string, string> = {
      // Documents
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'txt': 'text/plain',
      
      // Images
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      
      // Audio
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      
      // Archives
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
    }

    return extension ? mimeTypes[extension] || 'application/octet-stream' : 'application/octet-stream'
  }
}