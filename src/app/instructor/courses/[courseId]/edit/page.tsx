'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Plus,
  Trash2,
  GripVertical,
  Save,
  Eye,
  Upload,
  FileText,
  Video,
  Paperclip,
  ArrowLeft
} from 'lucide-react'
import FileUpload, { UploadedFile } from '@/components/course/file-upload'
import Link from 'next/link'

interface Lesson {
  id: string
  title: string
  type: 'VIDEO' | 'ARTICLE'
  description: string
  videoFile?: UploadedFile
  resources: UploadedFile[]
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
  tags?: string[]
}

// Mock course data - this would come from the database
const getCourseData = (courseId: string): Course | null => {
  const courses = {
    'course-fundamentals-ma': {
      id: 'course-fundamentals-ma',
      title: 'Fundamentals of Mergers & Acquisitions',
      description: 'Master the essential concepts, processes, and strategies for successful business acquisitions. Perfect for entrepreneurs and business professionals looking to grow through acquisition.',
      status: 'PUBLISHED',
      tags: ['M&A', 'Strategy', 'Business Growth', 'Acquisitions'],
      modules: [
        {
          id: 'module-foundations',
          title: 'M&A Foundations',
          description: 'Learn the fundamental concepts and strategic importance of mergers and acquisitions',
          lessons: [
            { id: 'lesson-intro-ma', title: 'Introduction to M&A Strategy', type: 'VIDEO' as const, description: 'Overview of M&A strategy and its role in business growth', resources: [] },
            { id: 'lesson-types-deals', title: 'Types of Acquisition Deals', type: 'VIDEO' as const, description: 'Understanding different types of acquisition structures', resources: [] },
            { id: 'lesson-market-analysis', title: 'Market Analysis & Opportunity Assessment', type: 'VIDEO' as const, description: 'How to analyze markets and identify acquisition opportunities', resources: [] },
            { id: 'lesson-initial-screening', title: 'Initial Business Screening', type: 'ARTICLE' as const, description: 'Framework for initial evaluation of potential targets', resources: [] }
          ]
        },
        {
          id: 'module-valuation',
          title: 'Business Valuation',
          description: 'Master the key valuation methods used in M&A transactions',
          lessons: [
            { id: 'lesson-valuation-methods', title: 'Valuation Methods Overview', type: 'VIDEO' as const, description: 'Introduction to different valuation approaches', resources: [] },
            { id: 'lesson-dcf-analysis', title: 'Discounted Cash Flow Analysis', type: 'VIDEO' as const, description: 'Detailed DCF modeling for acquisitions', resources: [] },
            { id: 'lesson-comparable-analysis', title: 'Comparable Company Analysis', type: 'VIDEO' as const, description: 'Using market comparables for valuation', resources: [] },
            { id: 'lesson-valuation-tools', title: 'Valuation Tools & Templates', type: 'ARTICLE' as const, description: 'Practical tools and Excel templates for valuation', resources: [] }
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
      modules: [
        {
          id: 'module-dd-framework',
          title: 'Due Diligence Framework',
          description: 'Establish a systematic approach to due diligence',
          lessons: [
            { id: 'lesson-dd-overview', title: 'Due Diligence Process Overview', type: 'VIDEO' as const, description: 'Complete overview of the due diligence process', resources: [] },
            { id: 'lesson-dd-checklist', title: 'Complete Due Diligence Checklist', type: 'ARTICLE' as const, description: 'Comprehensive checklist for all DD areas', resources: [] }
          ]
        }
      ]
    },
    'course-integration-management': {
      id: 'course-integration-management',
      title: 'Post-Acquisition Integration',
      description: 'Master the critical 100 days after acquisition. Learn proven strategies for successful integration, culture alignment, and value creation to maximize your investment returns.',
      status: 'DRAFT',
      tags: ['Integration', 'Change Management', 'Value Creation'],
      modules: [
        {
          id: 'module-integration-planning',
          title: 'Integration Planning',
          description: 'Develop comprehensive integration strategies',
          lessons: [
            { id: 'lesson-integration-strategy', title: 'Developing Integration Strategy', type: 'VIDEO' as const, description: 'Strategic framework for successful integration', resources: [] }
          ]
        }
      ]
    }
  }

  return courses[courseId as keyof typeof courses] || null
}

export default function EditCoursePage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.courseId as string

  const [course, setCourse] = useState<Course | null>(null)
  const [courseTags, setCourseTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load course data
    const courseData = getCourseData(courseId)
    if (courseData) {
      setCourse(courseData)
      setCourseTags(courseData.tags || [])
    } else {
      setError('Course not found')
    }
    setLoading(false)
  }, [courseId])

  const updateCourse = (field: string, value: string) => {
    if (course) {
      setCourse({ ...course, [field]: value })
    }
  }

  const updateModule = (moduleId: string, field: string, value: string) => {
    if (course) {
      setCourse({
        ...course,
        modules: course.modules.map(m => 
          m.id === moduleId ? { ...m, [field]: value } : m
        )
      })
    }
  }

  const updateLesson = (moduleId: string, lessonId: string, field: string, value: string) => {
    if (course) {
      setCourse({
        ...course,
        modules: course.modules.map(m => 
          m.id === moduleId ? { 
            ...m, 
            lessons: m.lessons.map(l => 
              l.id === lessonId ? { ...l, [field]: value } : l
            )
          } : m
        )
      })
    }
  }

  const updateLessonVideo = (moduleId: string, lessonId: string, videoFile: UploadedFile) => {
    if (course) {
      setCourse({
        ...course,
        modules: course.modules.map(m => 
          m.id === moduleId ? { 
            ...m, 
            lessons: m.lessons.map(l => 
              l.id === lessonId ? { ...l, videoFile } : l
            )
          } : m
        )
      })
    }
  }

  const updateLessonResources = (moduleId: string, lessonId: string, resources: UploadedFile[]) => {
    if (course) {
      setCourse({
        ...course,
        modules: course.modules.map(m => 
          m.id === moduleId ? { 
            ...m, 
            lessons: m.lessons.map(l => 
              l.id === lessonId ? { ...l, resources } : l
            )
          } : m
        )
      })
    }
  }

  const removeLessonFile = (moduleId: string, lessonId: string, fileId: string, fileType: 'video' | 'resource') => {
    if (course) {
      setCourse({
        ...course,
        modules: course.modules.map(m => 
          m.id === moduleId ? { 
            ...m, 
            lessons: m.lessons.map(l => {
              if (l.id === lessonId) {
                if (fileType === 'video') {
                  return { ...l, videoFile: undefined }
                } else {
                  return { ...l, resources: l.resources.filter(r => r.id !== fileId) }
                }
              }
              return l
            })
          } : m
        )
      })
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !courseTags.includes(tagInput.trim())) {
      setCourseTags([...courseTags, tagInput.trim()])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setCourseTags(courseTags.filter(t => t !== tag))
  }

  const handleSave = async (asDraft = true) => {
    if (!course) return

    try {
      const updateData = {
        title: course.title,
        description: course.description,
        tags: courseTags,
        status: asDraft ? 'DRAFT' : 'PUBLISHED',
        modules: course.modules
      }

      console.log('Updating course...', updateData)

      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save course')
      }

      const result = await response.json()
      console.log('Course updated successfully:', result)
      alert(`Course ${asDraft ? 'saved as draft' : 'published'} successfully!`)
      
    } catch (error) {
      console.error('Failed to save course:', error)
      alert(`Failed to save course: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>
  }

  if (error || !course) {
    return (
      <div className="max-w-4xl mx-auto">
        <Alert>
          <AlertDescription>
            {error || 'Course not found'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/courses">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Course</h1>
            <p className="text-muted-foreground mt-2">
              Update course content and manage lessons
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave(true)}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button onClick={() => handleSave(false)}>
            <Eye className="h-4 w-4 mr-2" />
            Update & Publish
          </Button>
        </div>
      </div>

      {/* Course Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Course Information</CardTitle>
          <CardDescription>
            Basic details about your course
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Course Title</Label>
            <Input
              id="title"
              placeholder="Enter course title..."
              value={course.title}
              onChange={(e) => updateCourse('title', e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="description">Course Description</Label>
            <textarea
              id="description"
              placeholder="Describe what students will learn..."
              className="w-full min-h-[100px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              value={course.description}
              onChange={(e) => updateCourse('description', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2 mb-2">
              <Input
                id="tags"
                placeholder="Add a tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {courseTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                  {tag} ×
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Course Modules */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Course Content</CardTitle>
              <CardDescription>
                Manage your course modules and lessons
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {course.modules.map((module, moduleIndex) => (
              <div key={module.id} className="border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
                  <div className="flex-1 space-y-4">
                    <div className="flex-1 space-y-3">
                      <Input
                        placeholder="Module title..."
                        value={module.title}
                        onChange={(e) => updateModule(module.id, 'title', e.target.value)}
                      />
                      <Input
                        placeholder="Module description..."
                        value={module.description}
                        onChange={(e) => updateModule(module.id, 'description', e.target.value)}
                      />
                    </div>

                    {/* Lessons */}
                    <div className="space-y-3">
                      {module.lessons.map((lesson, lessonIndex) => (
                        <div key={lesson.id} className="bg-muted/50 rounded-md p-3">
                          <div className="flex items-start gap-3">
                            <div className="mt-2">
                              {lesson.type === 'VIDEO' ? (
                                <Video className="h-4 w-4 text-primary" />
                              ) : (
                                <FileText className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <div className="flex-1 space-y-3">
                              <Input
                                placeholder="Lesson title..."
                                value={lesson.title}
                                onChange={(e) => updateLesson(module.id, lesson.id, 'title', e.target.value)}
                              />
                              <Input
                                placeholder="Lesson description..."
                                value={lesson.description}
                                onChange={(e) => updateLesson(module.id, lesson.id, 'description', e.target.value)}
                              />
                              
                              {/* Video Upload for Video Lessons */}
                              {lesson.type === 'VIDEO' && (
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">Video File</Label>
                                  <FileUpload
                                    acceptedTypes={['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v']}
                                    maxSizeMB={500} // 500MB for videos
                                    multiple={false}
                                    onFilesUploaded={(files) => {
                                      if (files.length > 0) {
                                        updateLessonVideo(module.id, lesson.id, files[0])
                                      }
                                    }}
                                    onFileRemove={(fileId) => {
                                      removeLessonFile(module.id, lesson.id, fileId, 'video')
                                    }}
                                    uploadedFiles={lesson.videoFile ? [lesson.videoFile] : []}
                                  />
                                </div>
                              )}

                              {/* Resource Documents Upload */}
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">
                                  <Paperclip className="h-4 w-4 inline mr-1" />
                                  Lesson Resources (Optional)
                                </Label>
                                <FileUpload
                                  acceptedTypes={['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip']}
                                  maxSizeMB={100} // 100MB for documents
                                  multiple={true}
                                  onFilesUploaded={(files) => {
                                    updateLessonResources(module.id, lesson.id, [...lesson.resources, ...files])
                                  }}
                                  onFileRemove={(fileId) => {
                                    removeLessonFile(module.id, lesson.id, fileId, 'resource')
                                  }}
                                  uploadedFiles={lesson.resources}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
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