import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  BookOpen, 
  Users, 
  Clock,
  Play,
  FileText,
  Video,
  Download,
  ArrowLeft,
  CheckCircle,
  Lock
} from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Lesson {
  id: string
  title: string
  type: 'VIDEO' | 'ARTICLE'
  description: string
  duration?: string
  completed?: boolean
}

interface Module {
  id: string
  title: string
  description: string
  lessons: Lesson[]
}

interface Course {
  id: string
  title: string
  description: string
  status: string
  modules: Module[]
  tags: string[]
  instructor: {
    name: string
    bio: string
  }
  stats: {
    totalLessons: number
    totalDuration: string
    enrollments: number
  }
}

// Mock course data
const getCourseData = (courseId: string): Course | null => {
  const courses = {
    'course-fundamentals-ma': {
      id: 'course-fundamentals-ma',
      title: 'Fundamentals of Mergers & Acquisitions',
      description: 'Master the essential concepts, processes, and strategies for successful business acquisitions. Perfect for entrepreneurs and business professionals looking to grow through acquisition.',
      status: 'PUBLISHED',
      tags: ['M&A', 'Strategy', 'Business Growth', 'Acquisitions'],
      instructor: {
        name: 'Dr. Michael Rodriguez',
        bio: 'Former investment banker with 15+ years in M&A advisory. Led over $2B in transactions across various industries.'
      },
      stats: {
        totalLessons: 11,
        totalDuration: '4h 30m',
        enrollments: 342
      },
      modules: [
        {
          id: 'module-foundations',
          title: 'M&A Foundations',
          description: 'Learn the fundamental concepts and strategic importance of mergers and acquisitions',
          lessons: [
            { id: 'lesson-intro-ma', title: 'Introduction to M&A Strategy', type: 'VIDEO' as const, description: 'Overview of M&A strategy and its role in business growth', duration: '25 min', completed: true },
            { id: 'lesson-types-deals', title: 'Types of Acquisition Deals', type: 'VIDEO' as const, description: 'Understanding different types of acquisition structures', duration: '30 min', completed: true },
            { id: 'lesson-market-analysis', title: 'Market Analysis & Opportunity Assessment', type: 'VIDEO' as const, description: 'How to analyze markets and identify acquisition opportunities', duration: '35 min', completed: false },
            { id: 'lesson-initial-screening', title: 'Initial Business Screening', type: 'ARTICLE' as const, description: 'Framework for initial evaluation of potential targets', duration: '15 min', completed: false }
          ]
        },
        {
          id: 'module-valuation',
          title: 'Business Valuation',
          description: 'Master the key valuation methods used in M&A transactions',
          lessons: [
            { id: 'lesson-valuation-methods', title: 'Valuation Methods Overview', type: 'VIDEO' as const, description: 'Introduction to different valuation approaches', duration: '28 min', completed: false },
            { id: 'lesson-dcf-analysis', title: 'Discounted Cash Flow Analysis', type: 'VIDEO' as const, description: 'Detailed DCF modeling for acquisitions', duration: '45 min', completed: false },
            { id: 'lesson-comparable-analysis', title: 'Comparable Company Analysis', type: 'VIDEO' as const, description: 'Using market comparables for valuation', duration: '32 min', completed: false },
            { id: 'lesson-valuation-tools', title: 'Valuation Tools & Templates', type: 'ARTICLE' as const, description: 'Practical tools and Excel templates for valuation', duration: '20 min', completed: false }
          ]
        },
        {
          id: 'module-deal-structure',
          title: 'Deal Structuring',
          description: 'Learn how to structure deals for optimal outcomes',
          lessons: [
            { id: 'lesson-deal-structures', title: 'Common Deal Structures', type: 'VIDEO' as const, description: 'Overview of asset vs stock deals, earnouts, and more', duration: '30 min', completed: false },
            { id: 'lesson-financing-options', title: 'Financing Your Acquisition', type: 'VIDEO' as const, description: 'Debt, equity, and creative financing strategies', duration: '38 min', completed: false },
            { id: 'lesson-terms-negotiation', title: 'Key Terms & Negotiation', type: 'VIDEO' as const, description: 'Essential terms and negotiation strategies', duration: '42 min', completed: false }
          ]
        }
      ]
    },
    'course-due-diligence': {
      id: 'course-due-diligence',
      title: 'Due Diligence Mastery',
      description: 'Comprehensive guide to conducting thorough due diligence. Learn to identify risks, validate opportunities, and make informed acquisition decisions with confidence.',
      status: 'PUBLISHED',
      tags: ['Due Diligence', 'Risk Assessment', 'Financial Analysis'],
      instructor: {
        name: 'Sarah Chen, CPA',
        bio: 'Senior Manager at Big 4 accounting firm specializing in M&A due diligence with 12+ years experience.'
      },
      stats: {
        totalLessons: 16,
        totalDuration: '6h 15m',
        enrollments: 198
      },
      modules: [
        {
          id: 'module-dd-framework',
          title: 'Due Diligence Framework',
          description: 'Establish a systematic approach to due diligence',
          lessons: [
            { id: 'lesson-dd-overview', title: 'Due Diligence Process Overview', type: 'VIDEO' as const, description: 'Complete overview of the due diligence process', duration: '30 min', completed: false },
            { id: 'lesson-dd-checklist', title: 'Complete Due Diligence Checklist', type: 'ARTICLE' as const, description: 'Comprehensive checklist for all DD areas', duration: '25 min', completed: false }
          ]
        }
      ]
    }
  }

  return courses[courseId as keyof typeof courses] || null
}

export default function CoursePage({ params }: { params: { courseId: string } }) {
  const course = getCourseData(params.courseId)

  if (!course) {
    notFound()
  }

  const completedLessons = course.modules.reduce((total, module) => 
    total + module.lessons.filter(lesson => lesson.completed).length, 0
  )
  const progressPercentage = (completedLessons / course.stats.totalLessons) * 100

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start gap-8">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/courses">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Courses
              </Button>
            </Link>
          </div>
          
          <h1 className="text-4xl font-bold tracking-tight mb-4">{course.title}</h1>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {course.tags.map((tag) => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
          
          <p className="text-lg text-muted-foreground mb-6">{course.description}</p>
          
          <div className="flex items-center gap-6 text-sm text-muted-foreground mb-6">
            <div className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              <span>{course.stats.totalLessons} lessons</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{course.stats.totalDuration}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{course.stats.enrollments.toLocaleString()} students</span>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Course Progress</span>
              <span className="text-sm text-muted-foreground">
                {completedLessons} of {course.stats.totalLessons} lessons completed
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          <div className="flex gap-3">
            <Button size="lg">
              <Play className="h-4 w-4 mr-2" />
              Continue Learning
            </Button>
            <Button variant="outline" size="lg">
              <Download className="h-4 w-4 mr-2" />
              Download Resources
            </Button>
          </div>
        </div>

        {/* Instructor Card */}
        <Card className="w-80">
          <CardHeader>
            <CardTitle>Your Instructor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <h3 className="font-semibold">{course.instructor.name}</h3>
              <p className="text-sm text-muted-foreground">{course.instructor.bio}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Content */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {course.modules.map((module, moduleIndex) => (
            <Card key={module.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">
                    {moduleIndex + 1}
                  </span>
                  {module.title}
                </CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {module.lessons.map((lesson, lessonIndex) => (
                    <div 
                      key={lesson.id} 
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          {lesson.completed ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : lesson.type === 'VIDEO' ? (
                            <Video className="h-4 w-4 text-primary" />
                          ) : (
                            <FileText className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{lesson.title}</h4>
                          <p className="text-sm text-muted-foreground">{lesson.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{lesson.duration}</span>
                        {!lesson.completed && lessonIndex > 0 && (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Course Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Course Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Lessons</span>
                <span className="font-medium">{course.stats.totalLessons}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Duration</span>
                <span className="font-medium">{course.stats.totalDuration}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Students</span>
                <span className="font-medium">{course.stats.enrollments.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Completed</span>
                <span className="font-medium">{Math.round(progressPercentage)}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Learning Tools */}
          <Card>
            <CardHeader>
              <CardTitle>Learning Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                Course Materials
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Notes & Transcripts
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <BookOpen className="h-4 w-4 mr-2" />
                Discussion Forum
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}