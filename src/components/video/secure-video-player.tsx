'use client'

import { useState, useEffect, useRef } from 'react'
import MuxPlayer from '@mux/mux-player-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, Play } from 'lucide-react'
import { ProgressTracker } from '@/lib/progress/progress-tracker'
import { InteractionType } from '@prisma/client'

interface VideoPlayerProps {
  lessonId: string
  userId: string
  autoPlay?: boolean
  onProgress?: (progress: { currentTime: number; duration: number; percentWatched: number }) => void
  onCompleted?: () => void
}

interface VideoData {
  id: string
  status: 'UPLOADING' | 'PROCESSING' | 'READY' | 'ERROR'
  duration?: number
  playbackUrl?: string
  thumbnailUrl?: string
}

export default function SecureVideoPlayer({ 
  lessonId, 
  userId,
  autoPlay = false, 
  onProgress, 
  onCompleted 
}: VideoPlayerProps) {
  const [videoData, setVideoData] = useState<VideoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const progressUpdateInterval = useRef<NodeJS.Timeout | null>(null)
  const lastProgressUpdate = useRef<number>(0)

  useEffect(() => {
    fetchVideoData()
  }, [lessonId])

  useEffect(() => {
    if (videoData?.status === 'READY') {
      startLearningSession()
    }
    
    return () => {
      if (sessionId) {
        endLearningSession()
      }
      if (progressUpdateInterval.current) {
        clearInterval(progressUpdateInterval.current)
      }
    }
  }, [videoData])

  const startLearningSession = async () => {
    try {
      const response = await fetch('/api/progress/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          userId,
          lessonId
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setSessionId(data.session.sessionId)
      }
    } catch (error) {
      console.error('Error starting learning session:', error)
    }
  }

  const endLearningSession = async () => {
    if (!sessionId) return
    
    try {
      await fetch('/api/progress/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'end',
          sessionId
        })
      })
    } catch (error) {
      console.error('Error ending learning session:', error)
    }
  }

  const recordInteraction = async (type: InteractionType, position?: number, data?: any) => {
    if (!sessionId) return
    
    try {
      await fetch('/api/progress/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record-interaction',
          sessionId,
          type,
          timestamp: new Date().toISOString(),
          position,
          data
        })
      })
    } catch (error) {
      console.error('Error recording interaction:', error)
    }
  }

  const updateProgress = async (currentTime: number, duration: number, percentWatched: number) => {
    try {
      const response = await fetch('/api/progress/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-progress',
          userId,
          lessonId,
          currentTime,
          duration,
          percentWatched,
          completed: percentWatched >= 90
        })
      })
      
      if (response.ok && onProgress) {
        onProgress({ currentTime, duration, percentWatched })
      }
    } catch (error) {
      console.error('Error updating progress:', error)
    }
  }

  const fetchVideoData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/videos/upload?lessonId=${lessonId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch video')
      }

      if (data.success) {
        setVideoData(data.videoAsset)
      } else {
        throw new Error('No video data found')
      }
    } catch (err) {
      console.error('Error fetching video:', err)
      setError(err instanceof Error ? err.message : 'Failed to load video')
    } finally {
      setLoading(false)
    }
  }

  const handleTimeUpdate = (event: any) => {
    const video = event.target
    const currentTime = video.currentTime
    const duration = video.duration

    if (duration) {
      const percentWatched = Math.round((currentTime / duration) * 100)
      
      // Update progress every 10 seconds or at significant milestones
      const shouldUpdate = currentTime - lastProgressUpdate.current >= 10 || 
                          percentWatched >= 25 && lastProgressUpdate.current < duration * 0.25 ||
                          percentWatched >= 50 && lastProgressUpdate.current < duration * 0.50 ||
                          percentWatched >= 75 && lastProgressUpdate.current < duration * 0.75 ||
                          percentWatched >= 90 && lastProgressUpdate.current < duration * 0.90

      if (shouldUpdate) {
        updateProgress(currentTime, duration, percentWatched)
        lastProgressUpdate.current = currentTime
      }
    }
  }

  const handleEnded = () => {
    // Record lesson completion
    recordInteraction(InteractionType.LESSON_COMPLETE)
    
    // Mark as completed with 100% progress
    if (videoData?.duration) {
      updateProgress(videoData.duration, videoData.duration, 100)
    }
    
    if (onCompleted) {
      onCompleted()
    }
  }

  const handlePlay = () => {
    setIsPlaying(true)
    recordInteraction(InteractionType.LESSON_RESUME)
  }

  const handlePause = () => {
    setIsPlaying(false)
    recordInteraction(InteractionType.LESSON_PAUSE)
  }

  const handleSeeked = (event: any) => {
    const video = event.target
    recordInteraction(InteractionType.LESSON_SEEK, video.currentTime)
  }

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <Card className="w-full aspect-video bg-black">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-white">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading video...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full aspect-video bg-gray-100">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchVideoData} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!videoData) {
    return (
      <Card className="w-full aspect-video bg-gray-100">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <Play className="h-8 w-8 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No video available for this lesson</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (videoData.status === 'UPLOADING') {
    return (
      <Card className="w-full aspect-video bg-blue-50">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-blue-600">Video is uploading...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a few minutes</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (videoData.status === 'PROCESSING') {
    return (
      <Card className="w-full aspect-video bg-yellow-50">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-yellow-500 mx-auto mb-4" />
            <p className="text-yellow-600">Video is processing...</p>
            <p className="text-sm text-gray-500 mt-2">Almost ready!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (videoData.status === 'ERROR') {
    return (
      <Card className="w-full aspect-video bg-red-50">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">Video processing failed</p>
            <p className="text-sm text-gray-500 mt-2">Please try uploading again</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (videoData.status === 'READY' && videoData.playbackUrl) {
    return (
      <Card className="w-full overflow-hidden">
        <CardContent className="p-0">
          <div className="relative aspect-video bg-black">
            <MuxPlayer
              src={videoData.playbackUrl}
              poster={videoData.thumbnailUrl}
              autoPlay={autoPlay}
              controls
              style={{ 
                width: '100%', 
                height: '100%',
                '--controls': '#ffffff',
                '--secondary': '#000000',
              } as React.CSSProperties}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onPlay={handlePlay}
              onPause={handlePause}
              onSeeked={handleSeeked}
              metadata={{
                video_title: `Lesson Video`,
                viewer_user_id: userId,
              }}
            />
            
            {/* Video info overlay (optional) */}
            {videoData.duration && (
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                {formatDuration(videoData.duration)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full aspect-video bg-gray-100">
      <CardContent className="flex items-center justify-center h-full">
        <div className="text-center">
          <Play className="h-8 w-8 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Video not ready</p>
        </div>
      </CardContent>
    </Card>
  )
}