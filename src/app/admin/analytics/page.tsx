'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  BookOpen, 
  Activity,
  AlertTriangle,
  CheckCircle2,
  PlayCircle,
  Pause
} from 'lucide-react'
import { StudentAnalyticsService, CourseMetrics, StudentMetrics } from '@/lib/analytics/student-analytics'
import { cn } from '@/lib/utils'

interface Course {
  id: string
  title: string
}

export default function AnalyticsPage() {
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [courses, setCourses] = useState<Course[]>([])
  const [courseMetrics, setCourseMetrics] = useState<CourseMetrics | null>(null)
  const [studentMetrics, setStudentMetrics] = useState<StudentMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    if (selectedCourse) {
      fetchCourseAnalytics()
    }
  }, [selectedCourse])

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses')
      if (response.ok) {
        const data = await response.json()
        setCourses(data.courses || [])
        if (data.courses?.length > 0) {
          setSelectedCourse(data.courses[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const fetchCourseAnalytics = async () => {
    if (!selectedCourse) return
    
    setLoading(true)
    try {
      // Get course metrics
      const courseResponse = await fetch(`/api/progress/analytics?type=course&courseId=${selectedCourse}`)
      if (courseResponse.ok) {
        const courseData = await courseResponse.json()
        setCourseMetrics(courseData.analytics)
      }

      // Get enrolled students and their metrics
      const enrollmentsResponse = await fetch(`/api/courses/${selectedCourse}/enrollments`)
      if (enrollmentsResponse.ok) {
        const enrollmentsData = await enrollmentsResponse.json()
        const students = enrollmentsData.enrollments || []
        
        // Fetch metrics for each student
        const studentMetricsPromises = students.slice(0, 10).map(async (enrollment: any) => {
          try {
            const response = await fetch('/api/progress/analytics', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                type: 'user', 
                userId: enrollment.userId,
                courseId: selectedCourse 
              })
            })
            if (response.ok) {
              const data = await response.json()
              return data.progress
            }
          } catch (error) {
            console.error('Error fetching student metrics:', error)
          }
          return null
        })

        const results = await Promise.all(studentMetricsPromises)
        setStudentMetrics(results.filter(Boolean))
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`
  }

  if (loading && !courseMetrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Track student progress and course performance metrics
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map(course => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {courseMetrics && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Course Overview</TabsTrigger>
            <TabsTrigger value="students">Student Performance</TabsTrigger>
            <TabsTrigger value="engagement">Engagement Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{courseMetrics.totalStudents}</div>
                  <p className="text-xs text-muted-foreground">
                    {courseMetrics.activeStudents} active this week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatPercentage(courseMetrics.completionRate)}</div>
                  <Progress value={courseMetrics.completionRate} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Completion Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(courseMetrics.averageCompletionTime)}h
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total course duration
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(courseMetrics.engagementMetrics.interactionRate)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Interactions per session
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Performance Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Student Performance Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {courseMetrics.performanceDistribution.highPerformers}
                    </div>
                    <p className="text-sm text-muted-foreground">High Performers</p>
                    <Badge variant="secondary" className="mt-1">Top 25%</Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {courseMetrics.performanceDistribution.averagePerformers}
                    </div>
                    <p className="text-sm text-muted-foreground">Average Performers</p>
                    <Badge variant="secondary" className="mt-1">Middle 50%</Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {courseMetrics.performanceDistribution.strugglingStudents}
                    </div>
                    <p className="text-sm text-muted-foreground">Struggling Students</p>
                    <Badge variant="secondary" className="mt-1">Bottom 25%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dropoff Points */}
            {courseMetrics.dropoffPoints.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Critical Dropoff Points
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {courseMetrics.dropoffPoints.map((dropoff, index) => (
                      <div key={dropoff.lessonId} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{dropoff.lessonTitle}</p>
                          <p className="text-sm text-muted-foreground">Lesson {index + 1}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-orange-600">
                            {formatPercentage(dropoff.dropoffRate)} dropoff
                          </p>
                          <Badge variant="destructive">Needs attention</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="students" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Student Performance Overview</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Showing top 10 enrolled students
                </p>
              </CardHeader>
              <CardContent>
                {studentMetrics.length > 0 ? (
                  <div className="space-y-4">
                    {studentMetrics.map((student) => (
                      <div key={student.studentId} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-medium">{student.studentName}</p>
                              <p className="text-sm text-muted-foreground">{student.studentEmail}</p>
                            </div>
                            <div className="flex gap-2">
                              {student.progressSummary.currentStreak > 0 && (
                                <Badge variant="secondary">
                                  🔥 {student.progressSummary.currentStreak} day streak
                                </Badge>
                              )}
                              {student.progressSummary.completionRate >= 100 && (
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Completed
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Progress</p>
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={student.progressSummary.completionRate} 
                                  className="flex-1 h-2" 
                                />
                                <span className="font-medium">
                                  {formatPercentage(student.progressSummary.completionRate)}
                                </span>
                              </div>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Lessons</p>
                              <p className="font-medium">
                                {student.progressSummary.completedLessons}/{student.progressSummary.totalLessons}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Time Spent</p>
                              <p className="font-medium">
                                {formatTime(student.progressSummary.totalTimeSpent)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Last Active</p>
                              <p className="font-medium">
                                {student.lastActive ? 
                                  new Date(student.lastActive).toLocaleDateString() : 
                                  'Never'
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No student data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="engagement" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PlayCircle className="h-5 w-5" />
                    Session Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Average Session Length</p>
                      <p className="text-2xl font-bold">
                        {Math.round(courseMetrics.engagementMetrics.averageSessionLength)} min
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total View Time</p>
                      <p className="text-2xl font-bold">
                        {Math.round(courseMetrics.engagementMetrics.totalViewTime)} min
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Interaction Rate</p>
                      <p className="text-2xl font-bold">
                        {Math.round(courseMetrics.engagementMetrics.interactionRate)}
                      </p>
                      <p className="text-xs text-muted-foreground">interactions per session</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Engagement Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Active Students (7 days)</span>
                      <Badge variant={courseMetrics.activeStudents > courseMetrics.totalStudents * 0.7 ? "default" : "secondary"}>
                        {courseMetrics.activeStudents}/{courseMetrics.totalStudents}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Completion Rate</span>
                      <Badge variant={courseMetrics.completionRate > 70 ? "default" : "secondary"}>
                        {formatPercentage(courseMetrics.completionRate)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">High Performers</span>
                      <Badge variant="default">
                        {courseMetrics.performanceDistribution.highPerformers} students
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}