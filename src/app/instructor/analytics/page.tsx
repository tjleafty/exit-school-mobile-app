'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Clock, 
  BookOpen, 
  Activity,
  AlertTriangle,
  CheckCircle2,
  PlayCircle,
  Eye,
  Download
} from 'lucide-react'
import { CourseMetrics, StudentMetrics, LessonMetrics } from '@/lib/analytics/student-analytics'
import { cn } from '@/lib/utils'

interface Course {
  id: string
  title: string
}

interface Lesson {
  id: string
  title: string
  order: number
}

export default function InstructorAnalyticsPage() {
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [selectedLesson, setSelectedLesson] = useState<string>('')
  const [courses, setCourses] = useState<Course[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [courseMetrics, setCourseMetrics] = useState<CourseMetrics | null>(null)
  const [lessonMetrics, setLessonMetrics] = useState<LessonMetrics | null>(null)
  const [studentMetrics, setStudentMetrics] = useState<StudentMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('course')

  const fetchCourseData = useCallback(async () => {
    if (!selectedCourse) return
    
    setLoading(true)
    try {
      // Get course metrics
      const courseResponse = await fetch(`/api/progress/analytics?type=course&courseId=${selectedCourse}`)
      if (courseResponse.ok) {
        const courseData = await courseResponse.json()
        setCourseMetrics(courseData.analytics)
      }

      // Get lessons for the course
      const lessonsResponse = await fetch(`/api/courses/${selectedCourse}/lessons`)
      if (lessonsResponse.ok) {
        const lessonsData = await lessonsResponse.json()
        setLessons(lessonsData.lessons || [])
        if (lessonsData.lessons?.length > 0) {
          setSelectedLesson(lessonsData.lessons[0].id)
        }
      }

      // Get enrolled students
      const enrollmentsResponse = await fetch(`/api/courses/${selectedCourse}/enrollments`)
      if (enrollmentsResponse.ok) {
        const enrollmentsData = await enrollmentsResponse.json()
        const students = enrollmentsData.enrollments || []
        
        // Fetch metrics for students (limited to 20 for performance)
        const studentMetricsPromises = students.slice(0, 20).map(async (enrollment: any) => {
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
      console.error('Error fetching course data:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedCourse])

  const fetchLessonMetrics = useCallback(async () => {
    if (!selectedLesson) return
    
    try {
      const response = await fetch(`/api/lessons/${selectedLesson}/analytics`)
      if (response.ok) {
        const data = await response.json()
        setLessonMetrics(data.metrics)
      }
    } catch (error) {
      console.error('Error fetching lesson metrics:', error)
    }
  }, [selectedLesson])

  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    if (selectedCourse) {
      fetchCourseData()
    }
  }, [selectedCourse, fetchCourseData])

  useEffect(() => {
    if (selectedLesson) {
      fetchLessonMetrics()
    }
  }, [selectedLesson, fetchLessonMetrics])

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses?instructorOnly=true')
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

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`
  }

  const exportAnalytics = async () => {
    try {
      const response = await fetch(`/api/courses/${selectedCourse}/analytics/export`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `course-analytics-${selectedCourse}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting analytics:', error)
    }
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
          <h1 className="text-3xl font-bold tracking-tight">Course Analytics</h1>
          <p className="text-muted-foreground">
            Monitor your students&apos; progress and course performance
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={exportAnalytics} disabled={!selectedCourse}>
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select your course" />
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
            <TabsTrigger value="course">Course Overview</TabsTrigger>
            <TabsTrigger value="students">Student Progress</TabsTrigger>
            <TabsTrigger value="lessons">Lesson Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="course" className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Enrolled Students</CardTitle>
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
                  <CardTitle className="text-sm font-medium">Avg. Study Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(courseMetrics.engagementMetrics.averageSessionLength)}m
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Per session
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Engagement</CardTitle>
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

            {/* Student Performance Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Student Performance Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="text-center p-4 border rounded-lg bg-green-50">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {courseMetrics.performanceDistribution.highPerformers}
                    </div>
                    <p className="font-medium">High Performers</p>
                    <p className="text-sm text-muted-foreground">Top 25% of students</p>
                    <Badge variant="secondary" className="mt-2">Excelling</Badge>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg bg-blue-50">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {courseMetrics.performanceDistribution.averagePerformers}
                    </div>
                    <p className="font-medium">Average Performers</p>
                    <p className="text-sm text-muted-foreground">Middle 50% of students</p>
                    <Badge variant="secondary" className="mt-2">On Track</Badge>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg bg-orange-50">
                    <div className="text-3xl font-bold text-orange-600 mb-2">
                      {courseMetrics.performanceDistribution.strugglingStudents}
                    </div>
                    <p className="font-medium">Struggling Students</p>
                    <p className="text-sm text-muted-foreground">Bottom 25% of students</p>
                    <Badge variant="destructive" className="mt-2">Need Support</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Critical Issues */}
            {courseMetrics.dropoffPoints.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Areas Needing Attention
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Lessons with high student dropoff rates
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {courseMetrics.dropoffPoints.map((dropoff, index) => (
                      <div key={dropoff.lessonId} className="flex items-center justify-between p-4 border rounded-lg bg-orange-50">
                        <div>
                          <p className="font-medium">{dropoff.lessonTitle}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatPercentage(dropoff.dropoffRate)} of students dropped off after this lesson
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="destructive">
                            High Dropoff
                          </Badge>
                          <Button variant="outline" size="sm" className="ml-2">
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
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
                <CardTitle>Individual Student Progress</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Detailed view of your students&apos; learning journey
                </p>
              </CardHeader>
              <CardContent>
                {studentMetrics.length > 0 ? (
                  <div className="space-y-4">
                    {studentMetrics.map((student) => (
                      <div key={student.studentId} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
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
                            {student.progressSummary.completionRate < 25 && (
                              <Badge variant="destructive">At Risk</Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Progress</p>
                            <div className="flex items-center gap-2 mt-1">
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
                            <p className="font-medium mt-1">
                              {student.progressSummary.completedLessons}/{student.progressSummary.totalLessons}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Study Time</p>
                            <p className="font-medium mt-1">
                              {formatTime(student.progressSummary.totalTimeSpent)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Sessions</p>
                            <p className="font-medium mt-1">
                              {student.progressSummary.totalSessions}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Last Active</p>
                            <p className="font-medium mt-1">
                              {student.lastActive ? 
                                new Date(student.lastActive).toLocaleDateString() : 
                                'Never'
                              }
                            </p>
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

          <TabsContent value="lessons" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Lesson Performance Analysis</h3>
              <Select value={selectedLesson} onValueChange={setSelectedLesson}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a lesson" />
                </SelectTrigger>
                <SelectContent>
                  {lessons.map(lesson => (
                    <SelectItem key={lesson.id} value={lesson.id}>
                      Lesson {lesson.order}: {lesson.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {lessonMetrics && (
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Lesson Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Average Watch Time</p>
                        <p className="text-2xl font-bold">{formatTime(lessonMetrics.averageWatchTime)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Completion Rate</p>
                        <p className="text-2xl font-bold">{formatPercentage(lessonMetrics.completionRate)}</p>
                        <Progress value={lessonMetrics.completionRate} className="mt-2" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Average Attempts</p>
                        <p className="text-2xl font-bold">{lessonMetrics.averageAttempts.toFixed(1)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Interaction Hotspots</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Points where students interact most
                    </p>
                  </CardHeader>
                  <CardContent>
                    {lessonMetrics.interactionHotspots.length > 0 ? (
                      <div className="space-y-2">
                        {lessonMetrics.interactionHotspots.slice(0, 5).map((hotspot, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <span className="text-sm">
                              {Math.floor(hotspot.position / 60)}:{(hotspot.position % 60).toString().padStart(2, '0')}
                            </span>
                            <span className="text-sm font-medium">
                              {hotspot.interactionCount} {hotspot.type.toLowerCase()}s
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No interaction data available</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}