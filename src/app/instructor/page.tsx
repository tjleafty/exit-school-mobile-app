import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  BookOpen, 
  Users, 
  Play, 
  BarChart3,
  Plus,
  Eye,
  Edit,
  Upload,
  Clock,
  Wrench
} from 'lucide-react'
import Link from 'next/link'

// Mock data - replace with database fetch
const instructorData = {
  instructor: {
    name: 'John Smith',
    email: 'john.smith@exitschool.com',
    totalCourses: 3,
    totalStudents: 2156,
    totalHours: 18.5,
  },
  stats: {
    coursesPublished: 3,
    totalEnrollments: 2156,
    averageRating: 4.7,
    monthlyEarnings: 8420,
  },
  myCourses: [
    {
      id: 'business-acquisitions-101',
      title: 'Business Acquisitions 101',
      status: 'PUBLISHED',
      students: 1234,
      rating: 4.8,
      lastUpdated: '2024-01-15',
      totalLessons: 12,
      completedLessons: 12,
    },
    {
      id: 'advanced-valuation',
      title: 'Advanced Business Valuation',
      status: 'PUBLISHED',
      students: 567,
      rating: 4.6,
      lastUpdated: '2024-01-10',
      totalLessons: 10,
      completedLessons: 10,
    },
    {
      id: 'ma-legal-framework',
      title: 'M&A Legal Framework',
      status: 'DRAFT',
      students: 0,
      rating: 0,
      lastUpdated: '2024-01-05',
      totalLessons: 8,
      completedLessons: 3,
    },
  ],
  recentActivity: [
    {
      id: '1',
      type: 'student_enrolled',
      message: '5 new students enrolled in Business Acquisitions 101',
      timestamp: '2 hours ago',
    },
    {
      id: '2',
      type: 'lesson_completed',
      message: 'Student completed "Financial Analysis" lesson',
      timestamp: '4 hours ago',
    },
    {
      id: '3',
      type: 'course_updated',
      message: 'Updated M&A Legal Framework course content',
      timestamp: '1 day ago',
    },
  ],
  analytics: {
    thisMonth: {
      enrollments: 89,
      completions: 34,
      revenue: 4210,
    },
    lastMonth: {
      enrollments: 67,
      completions: 28,
      revenue: 3890,
    },
  },
}

export default function InstructorDashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Instructor Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back, {instructorData.instructor.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/instructor/courses/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Course
            </Button>
          </Link>
          <Link href="/instructor/analytics">
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </Link>
          <Link href="/instructor/tools">
            <Button variant="outline">
              <Wrench className="h-4 w-4 mr-2" />
              Tools
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{instructorData.stats.coursesPublished}</div>
            <p className="text-xs text-muted-foreground">
              1 draft in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {instructorData.stats.totalEnrollments.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              +89 this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{instructorData.stats.averageRating}</div>
            <p className="text-xs text-muted-foreground">
              Based on 324 reviews
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Earnings</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${instructorData.stats.monthlyEarnings.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              +8.3% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* My Courses */}
          <Card>
            <CardHeader>
              <CardTitle>My Courses</CardTitle>
              <CardDescription>Manage and track your course content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {instructorData.myCourses.map((course) => (
                  <div key={course.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold">{course.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant={course.status === 'PUBLISHED' ? 'default' : 'secondary'}
                          >
                            {course.status.toLowerCase()}
                          </Badge>
                          {course.status === 'PUBLISHED' && course.rating > 0 && (
                            <div className="text-sm text-muted-foreground">
                              ★ {course.rating} • {course.students.toLocaleString()} students
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Link href={`/instructor/courses/${course.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/instructor/courses/${course.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        {course.completedLessons}/{course.totalLessons} lessons • 
                        Updated {course.lastUpdated}
                      </span>
                      <div className="flex items-center gap-2">
                        {course.status === 'DRAFT' && (
                          <Button size="sm" variant="outline">
                            <Upload className="h-4 w-4 mr-1" />
                            Publish
                          </Button>
                        )}
                        {course.status === 'PUBLISHED' && (
                          <Link href={`/instructor/courses/${course.id}/analytics`}>
                            <Button size="sm" variant="outline">
                              <BarChart3 className="h-4 w-4 mr-1" />
                              Analytics
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates from your courses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {instructorData.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="mt-1">
                      {activity.type === 'student_enrolled' && (
                        <Users className="h-4 w-4 text-blue-500" />
                      )}
                      {activity.type === 'lesson_completed' && (
                        <Play className="h-4 w-4 text-green-500" />
                      )}
                      {activity.type === 'course_updated' && (
                        <Edit className="h-4 w-4 text-orange-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>This Month</CardTitle>
              <CardDescription>Performance summary</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">New Enrollments</span>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {instructorData.analytics.thisMonth.enrollments}
                    </div>
                    <div className="text-xs text-green-600">
                      +{instructorData.analytics.thisMonth.enrollments - instructorData.analytics.lastMonth.enrollments}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Completions</span>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {instructorData.analytics.thisMonth.completions}
                    </div>
                    <div className="text-xs text-green-600">
                      +{instructorData.analytics.thisMonth.completions - instructorData.analytics.lastMonth.completions}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Revenue</span>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      ${instructorData.analytics.thisMonth.revenue.toLocaleString()}
                    </div>
                    <div className="text-xs text-green-600">
                      +${(instructorData.analytics.thisMonth.revenue - instructorData.analytics.lastMonth.revenue).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common instructor tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link href="/instructor/courses/new">
                  <Button variant="outline" className="w-full justify-start">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Course
                  </Button>
                </Link>
                <Link href="/instructor/upload">
                  <Button variant="outline" className="w-full justify-start">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Video
                  </Button>
                </Link>
                <Link href="/instructor/students">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    View Students
                  </Button>
                </Link>
                <Link href="/instructor/tools">
                  <Button variant="outline" className="w-full justify-start">
                    <Wrench className="h-4 w-4 mr-2" />
                    Manage Tools
                  </Button>
                </Link>
                <Link href="/instructor/schedule">
                  <Button variant="outline" className="w-full justify-start">
                    <Clock className="h-4 w-4 mr-2" />
                    Schedule Content
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}