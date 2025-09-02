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

// Mock data for admin course management
const adminCourses = [
  {
    id: 'business-acquisitions-101',
    title: 'Business Acquisitions 101',
    instructor: 'John Smith',
    status: 'PUBLISHED',
    students: 1234,
    created: '2024-01-15',
    lastUpdated: '2024-01-20',
    modules: 3,
    lessons: 12,
  },
  {
    id: 'advanced-valuation',
    title: 'Advanced Business Valuation',
    instructor: 'Sarah Johnson',
    status: 'PUBLISHED',
    students: 567,
    created: '2024-01-10',
    lastUpdated: '2024-01-18',
    modules: 4,
    lessons: 10,
  },
  {
    id: 'deal-structuring',
    title: 'Deal Structuring & Negotiation',
    instructor: 'Michael Chen',
    status: 'PUBLISHED',
    students: 890,
    created: '2024-01-08',
    lastUpdated: '2024-01-16',
    modules: 3,
    lessons: 8,
  },
  {
    id: 'ma-legal-framework',
    title: 'M&A Legal Framework',
    instructor: 'Emily Davis',
    status: 'DRAFT',
    students: 0,
    created: '2024-01-05',
    lastUpdated: '2024-01-14',
    modules: 2,
    lessons: 5,
  },
  {
    id: 'post-acquisition-integration',
    title: 'Post-Acquisition Integration',
    instructor: 'Robert Wilson',
    status: 'PENDING_REVIEW',
    students: 0,
    created: '2024-01-03',
    lastUpdated: '2024-01-12',
    modules: 4,
    lessons: 11,
  },
]

export default function AdminCoursesPage() {
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
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">3 published</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Needs approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,691</div>
            <p className="text-xs text-muted-foreground">Across all courses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
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
            {adminCourses.map((course) => (
              <div key={course.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{course.title}</h3>
                      <Badge 
                        variant={
                          course.status === 'PUBLISHED' ? 'default' : 
                          course.status === 'PENDING_REVIEW' ? 'secondary' : 
                          'outline'
                        }
                      >
                        {course.status.replace('_', ' ').toLowerCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>By {course.instructor}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        <span>{course.modules} modules, {course.lessons} lessons</span>
                      </div>
                      <div>
                        {course.students.toLocaleString()} students
                      </div>
                      <div>
                        Updated {course.lastUpdated}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {course.status === 'PENDING_REVIEW' && (
                      <>
                        <Button size="sm" variant="outline" className="text-green-600">
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600">
                          Reject
                        </Button>
                      </>
                    )}
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
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}