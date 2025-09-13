'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  Clock, 
  BookOpen, 
  Award,
  Calendar,
  BarChart3,
  Target,
  Flame,
  Activity
} from 'lucide-react'
import ProgressCard from './progress-card'
import { cn } from '@/lib/utils'

interface Course {
  id: string
  title: string
}

interface ProgressSummary {
  totalLessons: number
  completedLessons: number
  totalTimeSpent: number
  averageCompletionTime: number
  completionRate: number
  lastAccessedAt?: Date
  currentStreak: number
  totalSessions: number
}

interface StudentProgressDashboardProps {
  userId: string
  className?: string
}

export default function StudentProgressDashboard({ 
  userId, 
  className 
}: StudentProgressDashboardProps) {
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [courses, setCourses] = useState<Course[]>([])
  const [overallProgress, setOverallProgress] = useState<ProgressSummary | null>(null)
  const [courseProgress, setCourseProgress] = useState<Record<string, ProgressSummary>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserCourses()
    fetchOverallProgress()
  }, [userId])

  useEffect(() => {
    if (selectedCourse !== 'all') {
      fetchCourseProgress(selectedCourse)
    }
  }, [selectedCourse])

  const fetchUserCourses = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/courses`)
      if (response.ok) {
        const data = await response.json()
        setCourses(data.courses || [])
      }
    } catch (error) {
      console.error('Error fetching user courses:', error)
    }
  }

  const fetchOverallProgress = async () => {
    try {
      const response = await fetch(`/api/progress/summary?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setOverallProgress(data.summary)
      }
    } catch (error) {
      console.error('Error fetching overall progress:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCourseProgress = async (courseId: string) => {
    try {
      const response = await fetch(`/api/progress/summary?userId=${userId}&courseId=${courseId}`)
      if (response.ok) {
        const data = await response.json()
        setCourseProgress(prev => ({
          ...prev,
          [courseId]: data.summary
        }))
      }
    } catch (error) {
      console.error('Error fetching course progress:', error)
    }
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const getStreakMessage = (streak: number) => {
    if (streak === 0) return "Start your learning streak today!"
    if (streak === 1) return "Great start! Keep it up!"
    if (streak < 7) return `You're on fire! ${streak} days strong!`
    if (streak < 30) return `Amazing streak! ${streak} days of consistent learning!`
    return `Incredible! ${streak} days of dedication!`
  }

  const getMotivationalMessage = (progress: ProgressSummary) => {
    const rate = progress.completionRate
    if (rate >= 100) return "🎉 Congratulations! You've completed this course!"
    if (rate >= 80) return "🚀 You're almost there! Just a little more to go!"
    if (rate >= 50) return "💪 Great progress! You're halfway there!"
    if (rate >= 25) return "📚 Nice work! You're making steady progress!"
    return "🌟 Ready to start your learning journey?"
  }

  const currentProgress = selectedCourse === 'all' 
    ? overallProgress 
    : courseProgress[selectedCourse]

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Your Learning Progress</h2>
          <p className="text-muted-foreground">
            Track your journey and celebrate your achievements
          </p>
        </div>
        
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {courses.map(course => (
              <SelectItem key={course.id} value={course.id}>
                {course.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {currentProgress && (
            <>
              {/* Main Progress Card */}
              <ProgressCard
                title={selectedCourse === 'all' ? 'Overall Progress' : courses.find(c => c.id === selectedCourse)?.title || 'Course Progress'}
                progress={currentProgress}
                showDetailedStats={true}
                className="border-2"
              />

              {/* Quick Stats Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{Math.round(currentProgress.completionRate)}%</div>
                    <p className="text-xs text-muted-foreground">
                      {currentProgress.completedLessons} of {currentProgress.totalLessons} lessons
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Study Time</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatTime(currentProgress.totalTimeSpent)}</div>
                    <p className="text-xs text-muted-foreground">
                      Across {currentProgress.totalSessions} sessions
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
                    <Flame className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{currentProgress.currentStreak}</div>
                    <p className="text-xs text-muted-foreground">
                      {currentProgress.currentStreak > 0 ? 'days in a row' : 'Start learning today!'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Session</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatTime(currentProgress.averageCompletionTime)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Per lesson completed
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Motivational Message */}
              <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <p className="text-lg font-medium">{getMotivationalMessage(currentProgress)}</p>
                    {currentProgress.currentStreak > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {getStreakMessage(currentProgress.currentStreak)}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Learning Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentProgress ? (
                <div className="space-y-6">
                  {/* Session Statistics */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {currentProgress.totalSessions}
                      </div>
                      <p className="text-sm text-muted-foreground">Total Sessions</p>
                    </div>
                    
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {formatTime(currentProgress.totalTimeSpent)}
                      </div>
                      <p className="text-sm text-muted-foreground">Total Study Time</p>
                    </div>
                    
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {formatTime(currentProgress.averageCompletionTime)}
                      </div>
                      <p className="text-sm text-muted-foreground">Avg. per Lesson</p>
                    </div>
                  </div>

                  {/* Last Activity */}
                  {currentProgress.lastAccessedAt && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Last activity: {new Date(currentProgress.lastAccessedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No activity data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Your Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentProgress ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Completion Achievements */}
                  {currentProgress.completionRate >= 100 && (
                    <div className="flex items-center gap-3 p-4 border rounded-lg bg-green-50">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <Award className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Course Completed!</p>
                        <p className="text-sm text-muted-foreground">
                          Finished all {currentProgress.totalLessons} lessons
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Streak Achievements */}
                  {currentProgress.currentStreak >= 7 && (
                    <div className="flex items-center gap-3 p-4 border rounded-lg bg-orange-50">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                        <Flame className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium">Week Warrior!</p>
                        <p className="text-sm text-muted-foreground">
                          {currentProgress.currentStreak} days learning streak
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Time Achievements */}
                  {currentProgress.totalTimeSpent >= 3600 && (
                    <div className="flex items-center gap-3 p-4 border rounded-lg bg-blue-50">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Clock className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Dedicated Learner!</p>
                        <p className="text-sm text-muted-foreground">
                          Over 1 hour of study time
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Progress Achievements */}
                  {currentProgress.completionRate >= 50 && currentProgress.completionRate < 100 && (
                    <div className="flex items-center gap-3 p-4 border rounded-lg bg-purple-50">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">Halfway Hero!</p>
                        <p className="text-sm text-muted-foreground">
                          Completed 50% of the course
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Start learning to unlock achievements!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}