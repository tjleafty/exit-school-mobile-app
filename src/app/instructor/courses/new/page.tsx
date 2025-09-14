'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Plus,
  Trash2,
  GripVertical,
  Save,
  Eye,
  Upload,
  FileText,
  Video,
  Paperclip
} from 'lucide-react'
import FileUpload, { UploadedFile } from '@/components/course/file-upload'

interface Module {
  id: string
  title: string
  description: string
  lessons: Lesson[]
}

interface Lesson {
  id: string
  title: string
  type: 'VIDEO' | 'ARTICLE'
  description: string
  videoFile?: UploadedFile
  resources: UploadedFile[]
}

export default function NewCoursePage() {
  const router = useRouter()
  const [courseTitle, setCourseTitle] = useState('')
  const [courseDescription, setCourseDescription] = useState('')
  const [courseTags, setCourseTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [modules, setModules] = useState<Module[]>([
    {
      id: '1',
      title: '',
      description: '',
      lessons: []
    }
  ])

  const addModule = () => {
    const newModule: Module = {
      id: Date.now().toString(),
      title: '',
      description: '',
      lessons: []
    }
    setModules([...modules, newModule])
  }

  const removeModule = (moduleId: string) => {
    setModules(modules.filter(m => m.id !== moduleId))
  }

  const updateModule = (moduleId: string, field: string, value: string) => {
    setModules(modules.map(m => 
      m.id === moduleId ? { ...m, [field]: value } : m
    ))
  }

  const addLesson = (moduleId: string, type: 'VIDEO' | 'ARTICLE') => {
    const newLesson: Lesson = {
      id: Date.now().toString(),
      title: '',
      type,
      description: '',
      resources: []
    }
    setModules(modules.map(m => 
      m.id === moduleId 
        ? { ...m, lessons: [...m.lessons, newLesson] }
        : m
    ))
  }

  const removeLesson = (moduleId: string, lessonId: string) => {
    setModules(modules.map(m => 
      m.id === moduleId 
        ? { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) }
        : m
    ))
  }

  const updateLesson = (moduleId: string, lessonId: string, field: string, value: string) => {
    setModules(modules.map(m => 
      m.id === moduleId 
        ? { 
            ...m, 
            lessons: m.lessons.map(l => 
              l.id === lessonId ? { ...l, [field]: value } : l
            )
          }
        : m
    ))
  }

  const updateLessonVideo = (moduleId: string, lessonId: string, videoFile: UploadedFile) => {
    setModules(modules.map(m => 
      m.id === moduleId 
        ? { 
            ...m, 
            lessons: m.lessons.map(l => 
              l.id === lessonId ? { ...l, videoFile } : l
            )
          }
        : m
    ))
  }

  const updateLessonResources = (moduleId: string, lessonId: string, resources: UploadedFile[]) => {
    setModules(modules.map(m => 
      m.id === moduleId 
        ? { 
            ...m, 
            lessons: m.lessons.map(l => 
              l.id === lessonId ? { ...l, resources } : l
            )
          }
        : m
    ))
  }

  const removeLessonFile = (moduleId: string, lessonId: string, fileId: string, fileType: 'video' | 'resource') => {
    setModules(modules.map(m => 
      m.id === moduleId 
        ? { 
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
          }
        : m
    ))
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
    // Validate required fields
    if (!courseTitle.trim()) {
      alert('Course title is required')
      return
    }

    if (!courseDescription.trim()) {
      alert('Course description is required')
      return
    }

    // Validate that all modules have titles
    for (const module of modules) {
      if (!module.title.trim()) {
        alert('All modules must have a title')
        return
      }

      // Validate lessons
      for (const lesson of module.lessons) {
        if (!lesson.title.trim()) {
          alert('All lessons must have a title')
          return
        }

        if (lesson.type === 'VIDEO' && !lesson.videoFile) {
          alert(`Video lesson "${lesson.title}" must have a video file uploaded`)
          return
        }
      }
    }

    try {
      console.log('Saving course...', {
        title: courseTitle,
        description: courseDescription,
        tags: courseTags,
        modules,
        status: asDraft ? 'DRAFT' : 'PUBLISHED'
      })

      const response = await fetch('/api/courses/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: courseTitle,
          description: courseDescription,
          tags: courseTags,
          modules,
          status: asDraft ? 'DRAFT' : 'PUBLISHED'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save course')
      }

      console.log('Course saved successfully:', data.courseId)
      alert(`Course ${asDraft ? 'saved as draft' : 'published'} successfully!`)
      
      // Navigate back to instructor dashboard
      router.push('/instructor')

    } catch (error) {
      console.error('Failed to save course:', error)
      alert(`Failed to save course: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Course</h1>
          <p className="text-muted-foreground mt-2">
            Build your course structure and content
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave(true)}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button onClick={() => handleSave(false)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview & Publish
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
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="description">Course Description</Label>
            <textarea
              id="description"
              placeholder="Describe what students will learn..."
              className="w-full min-h-[100px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              value={courseDescription}
              onChange={(e) => setCourseDescription(e.target.value)}
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
              <CardTitle>Course Structure</CardTitle>
              <CardDescription>
                Organize your content into modules and lessons
              </CardDescription>
            </div>
            <Button onClick={addModule}>
              <Plus className="h-4 w-4 mr-2" />
              Add Module
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {modules.map((module, moduleIndex) => (
              <div key={module.id} className="border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
                  <div className="flex-1 space-y-4">
                    <div className="flex justify-between items-start">
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
                      {modules.length > 1 && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => removeModule(module.id)}
                          className="ml-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeLesson(module.id, lesson.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => addLesson(module.id, 'VIDEO')}
                        >
                          <Video className="h-4 w-4 mr-2" />
                          Add Video Lesson
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => addLesson(module.id, 'ARTICLE')}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Add Article Lesson
                        </Button>
                      </div>
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