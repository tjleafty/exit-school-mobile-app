import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  BookOpen, 
  Clock, 
  Award, 
  TrendingUp,
  PlayCircle,
  CheckCircle,
  Calendar,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'

// Mock data - replace with database fetch
const dashboardData = {
  user: {
    name: 'John Doe',
    role: 'STUDENT',
    joinDate: '2024-01-01',
  },
  stats: {
    coursesEnrolled: 3,
    coursesCompleted: 1,
    totalHoursWatched: 24.5,
    certificatesEarned: 1,
    currentStreak: 5,
  },
  recentActivity: [
    {
      id: '1',
      type: 'lesson_completed',
      title: 'Completed "Financial Analysis"',
      course: 'Business Acquisitions 101',
      timestamp: '2 hours ago',
    },
    {
      id: '2',
      type: 'course_started',
      title: 'Started "Advanced Business Valuation"',
      course: 'Advanced Business Valuation',
      timestamp: '1 day ago',
    },
    {
      id: '3',
      type: 'certificate_earned',
      title: 'Earned certificate',
      course: 'Due Diligence Masterclass',
      timestamp: '3 days ago',
    },
  ],
  continueLearning: [
    {
      id: 'business-acquisitions-101',
      title: 'Business Acquisitions 101',
      progress: 65,
      nextLesson: 'Legal Considerations',
      thumbnail: null,
    },
    {
      id: 'advanced-valuation',
      title: 'Advanced Business Valuation',
      progress: 20,
      nextLesson: 'DCF Modeling',
      thumbnail: null,
    },
  ],
  recommendedCourses: [
    {
      id: 'deal-structuring',
      title: 'Deal Structuring & Negotiation',
      instructor: 'Michael Chen',
      duration: '5 hours',
    },
    {
      id: 'financing-acquisitions',
      title: 'Financing Your Acquisition',
      instructor: 'Robert Wilson',
      duration: '4 hours',
    },
  ],
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {dashboardData.user.name}!
        </h1>
        <p className="text-muted-foreground mt-2">
          Track your progress and continue your learning journey
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Courses Enrolled</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.stats.coursesEnrolled}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.stats.coursesCompleted} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours Watched</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.stats.totalHoursWatched}</div>
            <p className="text-xs text-muted-foreground">
              Total video time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certificates</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.stats.certificatesEarned}</div>
            <p className="text-xs text-muted-foreground">
              Earned so far
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Streak</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.stats.currentStreak} days</div>
            <p className="text-xs text-muted-foreground">
              Keep it going!
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Continue Learning */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Continue Learning</CardTitle>
              <CardDescription>Pick up where you left off</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.continueLearning.map((course) => (
                  <div key={course.id} className="flex items-center gap-4">
                    <div className="w-24 h-16 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                      <PlayCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-medium">{course.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Next: {course.nextLesson}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary rounded-full h-2 transition-all"
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{course.progress}%</span>
                      </div>
                    </div>
                    <Link href={`/courses/${course.id}`}>
                      <Button size="sm">
                        Continue
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your learning milestones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="mt-1">
                      {activity.type === 'lesson_completed' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {activity.type === 'course_started' && (
                        <PlayCircle className="h-4 w-4 text-blue-500" />
                      )}
                      {activity.type === 'certificate_earned' && (
                        <Award className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.course} • {activity.timestamp}
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
          {/* Recommended Courses */}
          <Card>
            <CardHeader>
              <CardTitle>Recommended for You</CardTitle>
              <CardDescription>Based on your progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.recommendedCourses.map((course) => (
                  <div key={course.id} className="space-y-2">
                    <p className="font-medium text-sm">{course.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{course.instructor}</span>
                      <span>•</span>
                      <span>{course.duration}</span>
                    </div>
                    <Link href={`/courses/${course.id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        View Course
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Schedule */}
          <Card>
            <CardHeader>
              <CardTitle>Learning Schedule</CardTitle>
              <CardDescription>Stay on track</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Today</p>
                    <p className="text-xs text-muted-foreground">
                      Complete 2 lessons to maintain streak
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">This Week</p>
                    <p className="text-xs text-muted-foreground">
                      Finish Module 2 of Business Acquisitions 101
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}