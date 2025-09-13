'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle2, 
  Clock, 
  Play,
  Lock,
  BookOpen,
  ArrowRight,
  RotateCcw
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface LessonProgressData {
  lessonId: string
  title: string
  order: number
  type: 'VIDEO' | 'ARTICLE'
  duration?: number
  completed: boolean
  percentWatched: number
  lastPosition: number
  timeSpent: number
  attempts: number
  lastAccessedAt?: Date
  locked: boolean
}

interface LessonProgressProps {
  lessons: LessonProgressData[]
  currentLessonId?: string
  onLessonSelect?: (lessonId: string) => void
  showProgress?: boolean
  className?: string
}

export default function LessonProgress({
  lessons,
  currentLessonId,
  onLessonSelect,
  showProgress = true,
  className
}: LessonProgressProps) {
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return ''
    const minutes = Math.floor(seconds / 60)
    return minutes > 0 ? `${minutes} min` : '< 1 min'
  }

  const getLessonStatus = (lesson: LessonProgressData) => {
    if (lesson.locked) {
      return { 
        icon: Lock, 
        color: 'text-gray-400', 
        bgColor: 'bg-gray-50',
        label: 'Locked' 
      }
    }
    
    if (lesson.completed) {
      return { 
        icon: CheckCircle2, 
        color: 'text-green-600', 
        bgColor: 'bg-green-50',
        label: 'Completed' 
      }
    }
    
    if (lesson.percentWatched > 0) {
      return { 
        icon: Play, 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-50',
        label: 'In Progress' 
      }
    }
    
    return { 
      icon: BookOpen, 
      color: 'text-gray-600', 
      bgColor: 'bg-gray-50',
      label: 'Not Started' 
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'VIDEO':
        return Play
      case 'ARTICLE':
        return BookOpen
      default:
        return BookOpen
    }
  }

  const getResumeLabel = (lesson: LessonProgressData) => {
    if (lesson.completed) return 'Review'
    if (lesson.percentWatched > 0) return 'Continue'
    return 'Start'
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Course Progress
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-2">
        {lessons.map((lesson, index) => {
          const status = getLessonStatus(lesson)
          const StatusIcon = status.icon
          const TypeIcon = getTypeIcon(lesson.type)
          const isCurrentLesson = lesson.lessonId === currentLessonId
          
          return (
            <div
              key={lesson.lessonId}
              className={cn(
                "relative p-4 border rounded-lg transition-all duration-200",
                isCurrentLesson ? "border-primary bg-primary/5" : "border-gray-200",
                lesson.locked ? "opacity-60" : "hover:border-gray-300 hover:shadow-sm",
                !lesson.locked && onLessonSelect && "cursor-pointer"
              )}
              onClick={() => !lesson.locked && onLessonSelect?.(lesson.lessonId)}
            >
              {/* Lesson Number Badge */}
              <div className="absolute -left-3 -top-3 w-6 h-6 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center text-xs font-medium">
                {lesson.order}
              </div>
              
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  {/* Title and Type */}
                  <div className="flex items-center gap-2">
                    <TypeIcon className="w-4 h-4 text-muted-foreground" />
                    <h4 className="font-medium text-sm leading-tight">
                      {lesson.title}
                    </h4>
                    {lesson.duration && (
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(lesson.duration)}
                      </span>
                    )}
                  </div>

                  {/* Progress Bar (only show if progress exists and showProgress is true) */}
                  {showProgress && lesson.percentWatched > 0 && !lesson.locked && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {lesson.percentWatched}% complete
                        </span>
                        {lesson.timeSpent > 0 && (
                          <span className="text-muted-foreground">
                            {formatTime(lesson.timeSpent)}
                          </span>
                        )}
                      </div>
                      <Progress value={lesson.percentWatched} className="h-1.5" />
                    </div>
                  )}

                  {/* Last accessed info */}
                  {lesson.lastAccessedAt && !lesson.locked && (
                    <p className="text-xs text-muted-foreground">
                      Last accessed: {new Date(lesson.lastAccessedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Status and Action */}
                <div className="flex items-center gap-2 ml-4">
                  {/* Status Badge */}
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-xs",
                    status.bgColor
                  )}>
                    <StatusIcon className={cn("w-3 h-3", status.color)} />
                    <span className={status.color}>{status.label}</span>
                  </div>

                  {/* Action Button */}
                  {!lesson.locked && onLessonSelect && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        onLessonSelect(lesson.lessonId)
                      }}
                    >
                      {lesson.completed ? (
                        <RotateCcw className="w-3 h-3" />
                      ) : (
                        <ArrowRight className="w-3 h-3" />
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Attempts indicator (show if more than 1 attempt) */}
              {lesson.attempts > 1 && !lesson.locked && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Attempt #{lesson.attempts}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        
        {lessons.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No lessons available</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}