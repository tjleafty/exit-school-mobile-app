import { CourseCard } from '@/components/courses/course-card'
import { Button } from '@/components/ui/button'
import { Search, Filter } from 'lucide-react'

// Mock data - replace with database fetch
const mockCourses = [
  {
    id: 'business-acquisitions-101',
    title: 'Business Acquisitions 101',
    description: 'Learn the fundamentals of finding, evaluating, and acquiring profitable businesses.',
    instructor: 'John Smith',
    duration: '6 hours',
    modules: 12,
    students: 1234,
    status: 'PUBLISHED' as const,
    tags: ['Beginner', 'Fundamentals', 'Due Diligence'],
    enrolled: false,
  },
  {
    id: 'advanced-valuation',
    title: 'Advanced Business Valuation',
    description: 'Master complex valuation methods and financial modeling for acquisitions.',
    instructor: 'Sarah Johnson',
    duration: '8 hours',
    modules: 10,
    students: 567,
    status: 'PUBLISHED' as const,
    tags: ['Advanced', 'Finance', 'Valuation'],
    enrolled: true,
  },
  {
    id: 'deal-structuring',
    title: 'Deal Structuring & Negotiation',
    description: 'Learn how to structure deals and negotiate effectively with sellers.',
    instructor: 'Michael Chen',
    duration: '5 hours',
    modules: 8,
    students: 890,
    status: 'PUBLISHED' as const,
    tags: ['Intermediate', 'Negotiation', 'Legal'],
    enrolled: false,
  },
  {
    id: 'due-diligence-masterclass',
    title: 'Due Diligence Masterclass',
    description: 'Comprehensive guide to conducting thorough due diligence on target companies.',
    instructor: 'Emily Davis',
    duration: '7 hours',
    modules: 15,
    students: 432,
    status: 'PUBLISHED' as const,
    tags: ['Intermediate', 'Due Diligence', 'Risk Management'],
    enrolled: false,
  },
  {
    id: 'financing-acquisitions',
    title: 'Financing Your Acquisition',
    description: 'Explore different financing options and strategies for business acquisitions.',
    instructor: 'Robert Wilson',
    duration: '4 hours',
    modules: 6,
    students: 321,
    status: 'PUBLISHED' as const,
    tags: ['Finance', 'Banking', 'SBA Loans'],
    enrolled: false,
  },
  {
    id: 'post-acquisition-integration',
    title: 'Post-Acquisition Integration',
    description: 'Successfully integrate and operate your newly acquired business.',
    instructor: 'Lisa Anderson',
    duration: '6 hours',
    modules: 9,
    students: 234,
    status: 'DRAFT' as const,
    tags: ['Advanced', 'Operations', 'Management'],
    enrolled: false,
  },
]

export default function CoursesPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Course Catalog</h1>
        <p className="text-muted-foreground mt-2">
          Explore our comprehensive curriculum on business acquisitions
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search courses..."
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Course Categories */}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm">All Courses</Button>
        <Button variant="outline" size="sm">Beginner</Button>
        <Button variant="outline" size="sm">Intermediate</Button>
        <Button variant="outline" size="sm">Advanced</Button>
        <Button variant="outline" size="sm">Finance</Button>
        <Button variant="outline" size="sm">Legal</Button>
        <Button variant="outline" size="sm">Operations</Button>
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockCourses.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    </div>
  )
}