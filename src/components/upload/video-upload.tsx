'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Upload, Video, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VideoUploadProps {
  lessonId: string
  onUploadComplete?: (videoData: UploadedVideo) => void
  onUploadError?: (error: string) => void
  className?: string
}

interface UploadedVideo {
  uploadUrl: string
  uploadId: string
  assetId?: string
  videoAssetId: string
}

interface UploadState {
  file: File | null
  uploading: boolean
  progress: number
  error: string | null
  success: boolean
  uploadedVideo: UploadedVideo | null
  processingStatus: 'idle' | 'uploading' | 'processing' | 'ready' | 'error'
}

export default function VideoUpload({
  lessonId,
  onUploadComplete,
  onUploadError,
  className
}: VideoUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    file: null,
    uploading: false,
    progress: 0,
    error: null,
    success: false,
    uploadedVideo: null,
    processingStatus: 'idle'
  })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setUploadState(prev => ({
        ...prev,
        error: 'Please select a video file'
      }))
      return
    }

    // Validate file size (500MB limit)
    const maxSize = 500 * 1024 * 1024 // 500MB
    if (file.size > maxSize) {
      setUploadState(prev => ({
        ...prev,
        error: 'Video file must be less than 500MB'
      }))
      return
    }

    setUploadState(prev => ({
      ...prev,
      file,
      error: null,
      success: false,
      uploadedVideo: null,
      processingStatus: 'idle'
    }))
  }

  const uploadVideo = async () => {
    if (!uploadState.file) return

    setUploadState(prev => ({
      ...prev,
      uploading: true,
      progress: 0,
      error: null,
      processingStatus: 'uploading'
    }))

    try {
      // Step 1: Get Mux upload URL
      const uploadResponse = await fetch('/api/videos/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonId,
          title: uploadState.file.name,
          corsOrigin: window.location.origin,
        }),
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.error || 'Failed to get upload URL')
      }

      const uploadData = await uploadResponse.json()

      // Step 2: Upload video to Mux
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
        if (xhr.status === 201) {
          setUploadState(prev => ({
            ...prev,
            uploading: false,
            success: true,
            uploadedVideo: uploadData,
            processingStatus: 'processing'
          }))

          if (onUploadComplete) {
            onUploadComplete(uploadData)
          }

          // Start checking processing status
          checkProcessingStatus(uploadData.videoAssetId)
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
      xhr.send(uploadState.file)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      
      setUploadState(prev => ({
        ...prev,
        uploading: false,
        error: errorMessage,
        processingStatus: 'error'
      }))

      if (onUploadError) {
        onUploadError(errorMessage)
      }
    }
  }

  const checkProcessingStatus = async (videoAssetId: string) => {
    try {
      const response = await fetch(`/api/videos/upload?lessonId=${lessonId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.videoAsset) {
          const status = data.videoAsset.status.toLowerCase()
          
          setUploadState(prev => ({
            ...prev,
            processingStatus: status as any
          }))

          // Continue checking if still processing
          if (status === 'uploading' || status === 'processing') {
            setTimeout(() => checkProcessingStatus(videoAssetId), 5000)
          } else if (status === 'ready') {
            setUploadState(prev => ({
              ...prev,
              processingStatus: 'ready'
            }))
          } else if (status === 'error') {
            setUploadState(prev => ({
              ...prev,
              processingStatus: 'error',
              error: 'Video processing failed'
            }))
          }
        }
      }
    } catch (error) {
      console.error('Error checking processing status:', error)
    }
  }

  const resetUpload = () => {
    setUploadState({
      file: null,
      uploading: false,
      progress: 0,
      error: null,
      success: false,
      uploadedVideo: null,
      processingStatus: 'idle'
    })
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusMessage = () => {
    switch (uploadState.processingStatus) {
      case 'uploading':
        return 'Uploading video...'
      case 'processing':
        return 'Processing video... This may take a few minutes.'
      case 'ready':
        return 'Video is ready!'
      case 'error':
        return 'Processing failed. Please try again.'
      default:
        return ''
    }
  }

  const getStatusIcon = () => {
    switch (uploadState.processingStatus) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      case 'ready':
        return <CheckCircle className="h-6 w-6 text-green-500" />
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-500" />
      default:
        return <Video className="h-6 w-6 text-gray-400" />
    }
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Upload Video
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!uploadState.file && !uploadState.success && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Select a video file
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Supported formats: MP4, MOV, AVI, WMV<br/>
                Maximum file size: 500MB
              </p>
              
              <Label htmlFor="video-input">
                <Button variant="outline" className="cursor-pointer">
                  Choose Video File
                </Button>
              </Label>
              
              <Input
                id="video-input"
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>
        )}

        {uploadState.file && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Video className="h-8 w-8 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">{uploadState.file.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(uploadState.file.size)}</p>
                </div>
              </div>
            </div>

            {uploadState.uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading to Mux...</span>
                  <span>{uploadState.progress}%</span>
                </div>
                <Progress value={uploadState.progress} className="h-2" />
              </div>
            )}

            {(uploadState.success || uploadState.processingStatus !== 'idle') && (
              <div className="flex items-center justify-center space-x-3 p-4 bg-blue-50 rounded-lg">
                {getStatusIcon()}
                <span className="text-sm font-medium">{getStatusMessage()}</span>
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
                {uploadState.processingStatus === 'ready' ? 'Upload Another' : 'Cancel'}
              </Button>
              {!uploadState.success && (
                <Button onClick={uploadVideo} disabled={uploadState.uploading}>
                  {uploadState.uploading ? 'Uploading...' : 'Upload Video'}
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}