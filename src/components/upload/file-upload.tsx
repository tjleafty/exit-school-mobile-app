'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Upload, File, X, AlertCircle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  fileType: 'lesson-resource' | 'course-thumbnail' | 'user-avatar' | 'document'
  courseId?: string
  lessonId?: string
  onUploadComplete?: (file: UploadedFile) => void
  onUploadError?: (error: string) => void
  className?: string
  accept?: string
  maxSize?: number // in MB
  multiple?: boolean
}

interface UploadedFile {
  id: string
  fileName: string
  fileSize: number
  publicUrl: string
  resourceFileId: string
}

interface UploadState {
  file: File | null
  uploading: boolean
  progress: number
  error: string | null
  success: boolean
  uploadedFile: UploadedFile | null
}

export default function FileUpload({
  fileType,
  courseId,
  lessonId,
  onUploadComplete,
  onUploadError,
  className,
  accept,
  maxSize = 100,
  multiple = false
}: FileUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    file: null,
    uploading: false,
    progress: 0,
    error: null,
    success: false,
    uploadedFile: null
  })

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setUploadState(prev => ({
        ...prev,
        error: `File size must be less than ${maxSize}MB`
      }))
      return
    }

    setUploadState(prev => ({
      ...prev,
      file,
      error: null,
      success: false,
      uploadedFile: null
    }))
  }, [maxSize])

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    
    const file = event.dataTransfer.files?.[0]
    if (!file) return

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setUploadState(prev => ({
        ...prev,
        error: `File size must be less than ${maxSize}MB`
      }))
      return
    }

    setUploadState(prev => ({
      ...prev,
      file,
      error: null,
      success: false,
      uploadedFile: null
    }))
  }, [maxSize])

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }, [])

  const uploadFile = async () => {
    if (!uploadState.file) return

    setUploadState(prev => ({
      ...prev,
      uploading: true,
      progress: 0,
      error: null
    }))

    try {
      // Step 1: Get presigned upload URL
      const uploadResponse = await fetch('/api/files/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: uploadState.file.name,
          fileSize: uploadState.file.size,
          fileType,
          courseId,
          lessonId,
          contentType: uploadState.file.type,
        }),
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.error || 'Failed to get upload URL')
      }

      const uploadData = await uploadResponse.json()

      // Step 2: Upload file to R2 using presigned URL
      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          setUploadState(prev => ({ ...prev, progress }))
        }
      })

      // Handle upload completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const uploadedFile: UploadedFile = {
            id: uploadData.key,
            fileName: uploadState.file!.name,
            fileSize: uploadState.file!.size,
            publicUrl: uploadData.publicUrl,
            resourceFileId: uploadData.resourceFileId,
          }

          setUploadState(prev => ({
            ...prev,
            uploading: false,
            success: true,
            uploadedFile
          }))

          if (onUploadComplete) {
            onUploadComplete(uploadedFile)
          }
        } else {
          throw new Error('Upload failed')
        }
      })

      // Handle upload error
      xhr.addEventListener('error', () => {
        throw new Error('Upload failed')
      })

      // Start upload
      xhr.open('PUT', uploadData.uploadUrl)
      xhr.setRequestHeader('Content-Type', uploadState.file.type)
      xhr.send(uploadState.file)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      
      setUploadState(prev => ({
        ...prev,
        uploading: false,
        error: errorMessage
      }))

      if (onUploadError) {
        onUploadError(errorMessage)
      }
    }
  }

  const resetUpload = () => {
    setUploadState({
      file: null,
      uploading: false,
      progress: 0,
      error: null,
      success: false,
      uploadedFile: null
    })
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-6">
        {!uploadState.file && !uploadState.success && (
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Maximum file size: {maxSize}MB
            </p>
            
            <Input
              id="file-input"
              type="file"
              accept={accept}
              multiple={multiple}
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <Button variant="outline">
              Choose File
            </Button>
          </div>
        )}

        {uploadState.file && !uploadState.success && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <File className="h-8 w-8 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">{uploadState.file.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(uploadState.file.size)}</p>
                </div>
              </div>
              
              {!uploadState.uploading && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetUpload}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {uploadState.uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadState.progress}%</span>
                </div>
                <Progress value={uploadState.progress} className="h-2" />
              </div>
            )}

            {uploadState.error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">{uploadState.error}</span>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={resetUpload} disabled={uploadState.uploading}>
                Cancel
              </Button>
              <Button onClick={uploadFile} disabled={uploadState.uploading}>
                {uploadState.uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        )}

        {uploadState.success && uploadState.uploadedFile && (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            
            <div>
              <p className="font-medium text-gray-900">Upload successful!</p>
              <p className="text-sm text-gray-500">{uploadState.uploadedFile.fileName}</p>
            </div>

            <Button variant="outline" onClick={resetUpload}>
              Upload Another File
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}