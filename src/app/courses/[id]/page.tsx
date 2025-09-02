import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Clock, 
  BookOpen, 
  Users, 
  Award, 
  PlayCircle, 
  FileText,
  Download,
  CheckCircle,
  Lock
} from 'lucide-react'

// Mock data - replace with database fetch
const courseData = {
  id: 'business-acquisitions-101',
  title: 'Business Acquisitions 101',
  description: 'Start your journey into business acquisitions with this comprehensive introductory course. Learn the fundamentals of finding, evaluating, and acquiring profitable businesses.',
  instructor: {
    name: 'John Smith',
    bio: 'Serial entrepreneur with 15+ years of experience in M&A',
    avatar: null,
  },
  duration: '6 hours',
  students: 1234,
  rating: 4.8,
  lastUpdated: '2024-01-15',
  tags: ['Beginner', 'Fundamentals', 'Due Diligence'],
  modules: [
    {
      id: '1',
      title: 'Finding Opportunities',
      description: 'Learn how to identify and evaluate potential acquisition targets',
      lessons: [
        {
          id: '1-1',
          title: 'Market Research Fundamentals',
          type: 'VIDEO',
          duration: 720, // seconds
          completed: true,
        },
        {
          id: '1-2',
          title: 'Identifying Target Companies',
          type: 'VIDEO',
          duration: 1080,
          completed: true,
        },
        {
          id: '1-3',
          title: 'Initial Outreach Strategies',
          type: 'ARTICLE',
          duration: 600,
          completed: false,
        },
      ],
    },
    {
      id: '2',
      title: 'Due Diligence Process',
      description: 'Master the art of thorough business evaluation',
      lessons: [
        {
          id: '2-1',
          title: 'Financial Analysis',
          type: 'VIDEO',
          duration: 1500,
          completed: false,
          locked: false,
        },
        {
          id: '2-2',
          title: 'Legal Considerations',
          type: 'VIDEO',
          duration: 1200,
          completed: false,
          locked: true,
        },
        {
          id: '2-3',
          title: 'Operational Assessment',
          type: 'VIDEO',
          duration: 900,
          completed: false,
          locked: true,
        },
        {
          id: '2-4',
          title: 'Risk Evaluation Checklist',
          type: 'ARTICLE',
          duration: 450,
          completed: false,
          locked: true,
        },
        {
          id: '2-5',
          title: 'Valuation Methods',
          type: 'VIDEO',
          duration: 1800,
          completed: false,
          locked: true,
        },
      ],
    },
    {
      id: '3',
      title: 'Deal Structuring',
      description: 'Learn how to structure and close deals effectively',
      lessons: [
        {
          id: '3-1',
          title: 'Negotiation Tactics',
          type: 'VIDEO',
          duration: 1320,
          completed: false,
          locked: true,
        },
        {
          id: '3-2',
          title: 'Financing Options',
          type: 'VIDEO',
          duration: 1680,
          completed: false,
          locked: true,
        },
        {
          id: '3-3',
          title: 'Legal Documentation',
          type: 'ARTICLE',
          duration: 900,
          completed: false,
          locked: true,
        },
        {
          id: '3-4',
          title: 'Closing Process',
          type: 'VIDEO',
          duration: 900,
          completed: false,
          locked: true,
        },
      ],
    },
  ],
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  const totalLessons = courseData.modules.reduce((acc, module) => acc + module.lessons.length, 0)
  const completedLessons = courseData.modules.reduce((acc, module) => 
    acc + module.lessons.filter(lesson => lesson.completed).length, 0
  )
  const progress = Math.round((completedLessons / totalLessons) * 100)

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Course Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-4">{courseData.title}</h1>
            <p className="text-muted-foreground mb-4">{courseData.description}</p>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {courseData.tags.map((tag) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{courseData.students.toLocaleString()} students</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{courseData.duration}</span>
              </div>
              <div className="flex items-center gap-1">
                <Award className="h-4 w-4" />
                <span>Certificate included</span>
              </div>
            </div>
          </div>

          {/* Course Modules */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Course Content</h2>
            <div className="space-y-4">
              {courseData.modules.map((module, moduleIndex) => (
                <Card key={module.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          Module {moduleIndex + 1}: {module.title}
                        </CardTitle>
                        <CardDescription>{module.description}</CardDescription>
                      </div>
                      <Badge variant="outline">
                        {module.lessons.filter(l => l.completed).length}/{module.lessons.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {module.lessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className={`flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors ${
                            lesson.locked ? 'opacity-50' : 'cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {lesson.completed ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : lesson.locked ? (
                              <Lock className="h-5 w-5 text-muted-foreground" />
                            ) : lesson.type === 'VIDEO' ? (
                              <PlayCircle className="h-5 w-5 text-primary" />
                            ) : (
                              <FileText className="h-5 w-5 text-primary" />
                            )}
                            <div>
                              <p className="font-medium">{lesson.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {lesson.type === 'VIDEO' ? 'Video' : 'Article'} • {formatDuration(lesson.duration)}
                              </p>
                            </div>
                          </div>
                          {!lesson.locked && (
                            <Button variant="ghost" size="sm">
                              {lesson.completed ? 'Review' : 'Start'}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Instructor Info */}
          <Card>
            <CardHeader>
              <CardTitle>Your Instructor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">{courseData.instructor.name}</h3>
                  <p className="text-muted-foreground">{courseData.instructor.bio}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle>Your Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>{completedLessons} of {totalLessons} lessons</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <Button className="w-full">
                  {progress > 0 ? 'Continue Learning' : 'Start Course'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Resources Card */}
          <Card>
            <CardHeader>
              <CardTitle>Course Resources</CardTitle>
              <CardDescription>
                Downloadable materials to support your learning
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Due Diligence Checklist.pdf
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Valuation Template.xlsx
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  LOI Template.docx
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Certificate Card */}
          <Card>
            <CardHeader>
              <CardTitle>Certificate</CardTitle>
              <CardDescription>
                Complete all modules to earn your certificate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  {progress < 100 
                    ? `Complete ${totalLessons - completedLessons} more lessons to unlock`
                    : 'Certificate available!'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}