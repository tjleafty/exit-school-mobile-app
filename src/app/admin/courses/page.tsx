import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  BookOpen, 
  Users, 
  Eye,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  MoreHorizontal
} from 'lucide-react'
import Link from 'next/link'
import { PrismaClient, CourseStatus } from '@prisma/client'
import { SessionManager } from '@/lib/auth/session'
import { PermissionManager } from '@/lib/auth/permissions'
import { PermissionType } from '@prisma/client'
import { redirect } from 'next/navigation'

const prisma = new PrismaClient()

export default async function AdminCoursesPage() {
  // Check authentication and permissions
  try {
    const session = await SessionManager.requireAuth()
    
    if (!PermissionManager.canAccessAdminPanel(session.permissions)) {
      redirect('/dashboard?error=unauthorized')
    }

    if (!PermissionManager.hasPermission(session.permissions, PermissionType.COURSE_VIEW)) {
      redirect('/admin?error=insufficient-permissions')
    }

    // Fetch all courses with details
    const courses = await prisma.course.findMany({
      include: {
        author: {
          select: {
            name: true,
            email: true
          }
        },
        modules: {
          include: {
            lessons: true
          }
        },
        _count: {
          select: {
            enrollments: true
          }
        }
      },
      orderBy: [
        { status: 'asc' },
        { updatedAt: 'desc' }
      ]
    })

    // Calculate stats
    const stats = {
      total: courses.length,
      published: courses.filter(c => c.status === CourseStatus.PUBLISHED).length,
      pending: courses.filter(c => c.status === CourseStatus.DRAFT).length,
      totalStudents: courses.reduce((sum, course) => sum + course._count.enrollments, 0)
    }

    return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Course Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage all courses across the platform
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/instructor/courses/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Course
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search courses..."
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            All Status
          </Button>
          <Button variant="outline" size="sm">
            All Instructors
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{stats.published} published</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.published}</div>
            <p className="text-xs text-muted-foreground">Live courses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">Across all courses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Course List */}
      <Card>
        <CardHeader>
          <CardTitle>All Courses</CardTitle>
          <CardDescription>
            Complete overview of all platform courses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {courses.map((course) => {
              const totalLessons = course.modules.reduce((sum, module) => sum + module.lessons.length, 0)
              
              return (
                <div key={course.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{course.title}</h3>
                        <Badge 
                          variant={
                            course.status === CourseStatus.PUBLISHED ? 'default' : 
                            course.status === CourseStatus.DRAFT ? 'secondary' : 
                            'outline'
                          }
                        >
                          {course.status.toLowerCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>By {course.author.name || course.author.email}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          <span>{course.modules.length} modules, {totalLessons} lessons</span>
                        </div>
                        <div>
                          {course._count.enrollments.toLocaleString()} students
                        </div>
                        <div>
                          Updated {new Date(course.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Link href={`/courses/${course.id}`}>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/instructor/courses/${course.id}/edit`}>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button size="sm" variant="outline">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
  } catch (error) {
    console.error('Error in AdminCoursesPage:', error)
    redirect('/login')
  }
}