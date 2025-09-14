'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, X, CheckCircle, AlertCircle, File, Video, FileText } from 'lucide-react'

export interface UploadedFile {
  id: string
  name: string
  size: number
  type: 'video' | 'document'
  status: 'uploading' | 'processing' | 'ready' | 'error'
  progress: number
  url?: string
  muxAssetId?: string
  r2Key?: string
  error?: string
}

interface FileUploadProps {
  acceptedTypes: string[]
  maxSizeMB: number
  multiple?: boolean
  onFilesUploaded: (files: UploadedFile[]) => void
  onFileRemove: (fileId: string) => void
  uploadedFiles: UploadedFile[]
  disabled?: boolean
}

export default function FileUpload({
  acceptedTypes,
  maxSizeMB,
  multiple = false,
  onFilesUploaded,
  onFileRemove,
  uploadedFiles,
  disabled = false
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension || !acceptedTypes.includes(extension)) {
      return `File type .${extension} not supported. Allowed: ${acceptedTypes.join(', ')}`
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds limit of ${maxSizeMB}MB`
    }

    return null
  }

  const getFileType = (fileName: string): 'video' | 'document' => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v']
    return extension && videoExtensions.includes(extension) ? 'video' : 'document'
  }

  const uploadFile = async (file: File): Promise<UploadedFile> => {
    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const fileType = getFileType(file.name)
    
    const uploadedFile: UploadedFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: fileType,
      status: 'uploading',
      progress: 0
    }

    try {
      if (fileType === 'video') {
        // Video upload to Mux
        const muxResponse = await fetch('/api/upload/video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            corsOrigin: window.location.origin
          })
        })

        if (!muxResponse.ok) {
          throw new Error('Failed to create video upload')
        }

        const { uploadUrl, assetId } = await muxResponse.json()
        uploadedFile.muxAssetId = assetId

        // Upload to Mux
        const xhr = new XMLHttpRequest()
        
        return new Promise((resolve, reject) => {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const progress = Math.round((e.loaded / e.total) * 100)
              uploadedFile.progress = progress
              onFilesUploaded([...uploadedFiles.filter(f => f.id !== fileId), uploadedFile])
            }
          })

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              uploadedFile.status = 'processing'
              uploadedFile.progress = 100
              resolve(uploadedFile)
            } else {
              uploadedFile.status = 'error'
              uploadedFile.error = 'Upload failed'
              reject(new Error('Upload failed'))
            }
          })

          xhr.addEventListener('error', () => {
            uploadedFile.status = 'error'
            uploadedFile.error = 'Upload failed'
            reject(new Error('Upload failed'))
          })

          xhr.open('PUT', uploadUrl)
          xhr.send(file)
        })

      } else {
        // Document upload to Cloudflare R2
        const r2Response = await fetch('/api/upload/document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type || 'application/octet-stream'
          })
        })

        if (!r2Response.ok) {
          throw new Error('Failed to create document upload')
        }

        const { uploadUrl, key, publicUrl } = await r2Response.json()
        uploadedFile.r2Key = key
        uploadedFile.url = publicUrl

        // Upload to R2
        const xhr = new XMLHttpRequest()
        
        return new Promise((resolve, reject) => {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const progress = Math.round((e.loaded / e.total) * 100)
              uploadedFile.progress = progress
              onFilesUploaded([...uploadedFiles.filter(f => f.id !== fileId), uploadedFile])
            }
          })

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              uploadedFile.status = 'ready'
              uploadedFile.progress = 100
              resolve(uploadedFile)
            } else {
              uploadedFile.status = 'error'
              uploadedFile.error = 'Upload failed'
              reject(new Error('Upload failed'))
            }
          })

          xhr.addEventListener('error', () => {
            uploadedFile.status = 'error'
            uploadedFile.error = 'Upload failed'
            reject(new Error('Upload failed'))
          })

          xhr.open('PUT', uploadUrl)
          xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
          xhr.send(file)
        })
      }
    } catch (error) {
      uploadedFile.status = 'error'
      uploadedFile.error = error instanceof Error ? error.message : 'Upload failed'
      throw error
    }
  }

  const handleFiles = async (files: FileList) => {
    setError(null)
    const fileArray = Array.from(files)

    if (!multiple && fileArray.length > 1) {
      setError('Only one file allowed')
      return
    }

    const validFiles: File[] = []
    
    for (const file of fileArray) {
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }
      validFiles.push(file)
    }

    // Start uploads
    const uploadPromises = validFiles.map(uploadFile)
    
    try {
      const results = await Promise.allSettled(uploadPromises)
      const successfulUploads: UploadedFile[] = []
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulUploads.push(result.value)
        } else {
          console.error(`Upload failed for ${validFiles[index].name}:`, result.reason)
        }
      })

      if (successfulUploads.length > 0) {
        onFilesUploaded([...uploadedFiles, ...successfulUploads])
      }
    } catch (error) {
      setError('Some uploads failed')
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (!disabled && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (file: UploadedFile) => {
    if (file.type === 'video') {
      return <Video className="h-5 w-5" />
    }
    return <FileText className="h-5 w-5" />
  }

  const getStatusIcon = (file: UploadedFile) => {
    switch (file.status) {
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <Upload className={`h-10 w-10 mx-auto mb-2 ${disabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`} />
        <p className="text-sm font-medium mb-1">
          {disabled ? 'Upload disabled' : 'Drop files here or click to browse'}
        </p>
        <p className="text-xs text-muted-foreground">
          Accepted: {acceptedTypes.join(', ')} • Max size: {maxSizeMB}MB
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={acceptedTypes.map(ext => `.${ext}`).join(',')}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Uploaded Files</h4>
          {uploadedFiles.map((file) => (
            <div key={file.id} className="flex items-center gap-3 p-3 border rounded-md">
              <div className="text-primary">
                {getFileIcon(file)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)} • {file.status}
                  {file.type === 'video' && file.status === 'processing' && ' (Mux processing...)'}
                </p>
                {(file.status === 'uploading' || file.status === 'processing') && (
                  <Progress value={file.progress} className="mt-1 h-1" />
                )}
                {file.error && (
                  <p className="text-xs text-red-500 mt-1">{file.error}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(file)}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFileRemove(file.id)}
                  disabled={file.status === 'uploading'}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}