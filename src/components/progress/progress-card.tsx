'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Clock, 
  BookOpen, 
  TrendingUp, 
  Award,
  CheckCircle2,
  PlayCircle,
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProgressSummary {
  totalLessons: number
  completedLessons: number
  totalTimeSpent: number // in seconds
  averageCompletionTime: number
  completionRate: number // percentage
  lastAccessedAt?: Date
  currentStreak: number // consecutive days of activity
  totalSessions: number
}

interface ProgressCardProps {
  title: string
  progress: ProgressSummary
  courseId?: string
  showDetailedStats?: boolean
  className?: string
  onViewDetails?: () => void
}

export default function ProgressCard({
  title,
  progress,
  courseId,
  showDetailedStats = true,
  className,
  onViewDetails
}: ProgressCardProps) {
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const getProgressStatus = (rate: number) => {
    if (rate >= 100) return { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle2 }
    if (rate >= 75) return { label: 'Almost Done', color: 'bg-blue-100 text-blue-800', icon: TrendingUp }
    if (rate >= 50) return { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800', icon: PlayCircle }
    if (rate >= 25) return { label: 'Getting Started', color: 'bg-orange-100 text-orange-800', icon: BookOpen }
    return { label: 'Not Started', color: 'bg-gray-100 text-gray-800', icon: Clock }
  }

  const status = getProgressStatus(progress.completionRate)
  const StatusIcon = status.icon

  const formatLastAccessed = (date?: Date) => {
    if (!date) return 'Never'
    
    const now = new Date()
    const diffMs = now.getTime() - new Date(date).getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return new Date(date).toLocaleDateString()
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <Badge className={status.color}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{Math.round(progress.completionRate)}%</span>
          </div>
          <Progress value={progress.completionRate} className="h-3" />
        </div>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="w-4 h-4" />
              Lessons
            </div>
            <p className="text-lg font-semibold">
              {progress.completedLessons}/{progress.totalLessons}
            </p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              Time Spent
            </div>
            <p className="text-lg font-semibold">
              {formatTime(progress.totalTimeSpent)}
            </p>
          </div>
        </div>

        {showDetailedStats && (
          <>
            {/* Additional Stats */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <PlayCircle className="w-4 h-4" />
                  Sessions
                </div>
                <p className="text-sm font-medium">{progress.totalSessions}</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  Last Active
                </div>
                <p className="text-sm font-medium">
                  {formatLastAccessed(progress.lastAccessedAt)}
                </p>
              </div>
            </div>

            {/* Streak Badge */}
            {progress.currentStreak > 0 && (
              <div className="flex items-center justify-center p-3 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800">
                    🔥 {progress.currentStreak} day streak!
                  </span>
                </div>
              </div>
            )}

            {/* Average Time */}
            {progress.averageCompletionTime > 0 && (
              <div className="text-center text-sm text-muted-foreground">
                Avg. time per lesson: {formatTime(progress.averageCompletionTime)}
              </div>
            )}
          </>
        )}

        {/* View Details Button */}
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="w-full mt-4 px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
          >
            View Detailed Progress
          </button>
        )}
      </CardContent>
    </Card>
  )
}