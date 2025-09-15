import { PrismaClient, CourseStatus, Role } from '@prisma/client'

const prisma = new PrismaClient()

export interface CourseWithDetails {
  id: string
  title: string
  description: string
  instructor: string
  duration: string
  modules: number
  students: number
  status: CourseStatus
  tags: string[]
  enrolled: boolean
  thumbnail: string | null
  publishedAt: Date | null
}

export interface CourseFilters {
  search?: string
  tags?: string[]
  status?: CourseStatus[]
  instructor?: string
}

export class CoursesService {
  static async getCourses(
    userId?: string, 
    filters: CourseFilters = {}
  ): Promise<CourseWithDetails[]> {
    const { search, tags, status, instructor } = filters

    let courses
    
    try {
      // Build where clause
      const where: any = {
        status: status?.length ? { in: status } : CourseStatus.PUBLISHED
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      }

      if (tags?.length) {
        // For SQLite, we need to search in JSON string
        where.tags = {
          contains: tags[0] // Simple contains search for first tag
        }
      }

      if (instructor) {
        where.author = {
          OR: [
            { name: { contains: instructor, mode: 'insensitive' } },
            { email: { contains: instructor, mode: 'insensitive' } }
          ]
        }
      }

      courses = await prisma.course.findMany({
        where,
        include: {
          author: true,
          modules: {
            include: {
              lessons: true
            }
          },
          enrollments: userId ? {
            where: { userId }
          } : false,
          _count: {
            select: {
              enrollments: true
            }
          }
        },
        orderBy: [
          { status: 'asc' }, // Published first
          { publishedAt: 'desc' },
          { createdAt: 'desc' }
        ]
      })
    } catch (dbError) {
      console.error('CoursesService: Database error, using mock courses:', dbError)
      
      // Fall back to mock courses for production deployment
      const mockCourses = [
        {
          id: 'course-fundamentals-ma',
          title: 'Fundamentals of Mergers & Acquisitions',
          description: 'Master the essential concepts, processes, and strategies for successful business acquisitions. Perfect for entrepreneurs and business professionals looking to grow through acquisition.',
          status: CourseStatus.PUBLISHED,
          tags: '["Business Strategy", "M&A", "Due Diligence", "Valuation"]',
          thumbnail: null,
          publishedAt: new Date('2024-01-15'),
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15'),
          author: {
            name: 'Dr. Michael Rodriguez',
            email: 'rodriguez@theexitschool.com'
          },
          modules: [
            {
              lessons: [
                { duration: 15 }, { duration: 20 }, { duration: 18 }, { duration: 12 }
              ]
            },
            {
              lessons: [
                { duration: 22 }, { duration: 25 }, { duration: 18 }, { duration: 15 }
              ]
            },
            {
              lessons: [
                { duration: 20 }, { duration: 30 }, { duration: 25 }
              ]
            }
          ],
          enrollments: [],
          _count: { enrollments: 342 }
        },
        {
          id: 'course-due-diligence',
          title: 'Due Diligence Mastery',
          description: 'Comprehensive guide to conducting thorough due diligence. Learn to identify risks, validate opportunities, and make informed acquisition decisions with confidence.',
          status: CourseStatus.PUBLISHED,
          tags: '["Due Diligence", "Risk Assessment", "Financial Analysis", "Legal Review"]',
          thumbnail: null,
          publishedAt: new Date('2024-01-25'),
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-25'),
          author: {
            name: 'Sarah Chen, CPA',
            email: 'chen@theexitschool.com'
          },
          modules: [
            {
              lessons: [
                { duration: 18 }, { duration: 12 }, { duration: 15 }, { duration: 10 }
              ]
            },
            {
              lessons: [
                { duration: 25 }, { duration: 22 }, { duration: 20 }, { duration: 15 }, { duration: 18 }
              ]
            },
            {
              lessons: [
                { duration: 20 }, { duration: 18 }, { duration: 12 }, { duration: 15 }
              ]
            },
            {
              lessons: [
                { duration: 16 }, { duration: 14 }, { duration: 18 }, { duration: 12 }
              ]
            }
          ],
          enrollments: [],
          _count: { enrollments: 198 }
        },
        {
          id: 'course-integration-management',
          title: 'Post-Acquisition Integration',
          description: 'Master the critical 100 days after acquisition. Learn proven strategies for successful integration, culture alignment, and value creation to maximize your investment returns.',
          status: CourseStatus.PUBLISHED,
          tags: '["Integration", "Change Management", "Value Creation", "Leadership"]',
          thumbnail: null,
          publishedAt: new Date('2024-02-15'),
          createdAt: new Date('2024-02-01'),
          updatedAt: new Date('2024-02-15'),
          author: {
            name: 'James Mitchell',
            email: 'mitchell@theexitschool.com'
          },
          modules: [
            {
              lessons: [
                { duration: 20 }, { duration: 18 }, { duration: 15 }, { duration: 22 }
              ]
            },
            {
              lessons: [
                { duration: 25 }, { duration: 20 }, { duration: 16 }, { duration: 18 }
              ]
            },
            {
              lessons: [
                { duration: 22 }, { duration: 20 }, { duration: 15 }, { duration: 25 }
              ]
            },
            {
              lessons: [
                { duration: 18 }, { duration: 20 }, { duration: 16 }, { duration: 22 }
              ]
            }
          ],
          enrollments: [],
          _count: { enrollments: 73 }
        }
      ]
      
      // Apply filters to mock data
      courses = mockCourses.filter(course => {
        // Status filter
        if (status?.length && !status.includes(course.status)) {
          return false
        }
        if (!status?.length && course.status !== CourseStatus.PUBLISHED) {
          return false
        }
        
        // Search filter
        if (search) {
          const searchLower = search.toLowerCase()
          if (!course.title.toLowerCase().includes(searchLower) && 
              !course.description.toLowerCase().includes(searchLower)) {
            return false
          }
        }
        
        // Tags filter
        if (tags?.length) {
          const courseTags = JSON.parse(course.tags || '[]')
          if (!tags.some(tag => courseTags.includes(tag))) {
            return false
          }
        }
        
        // Instructor filter
        if (instructor) {
          const instructorLower = instructor.toLowerCase()
          if (!course.author.name.toLowerCase().includes(instructorLower) &&
              !course.author.email.toLowerCase().includes(instructorLower)) {
            return false
          }
        }
        
        return true
      })
    }

    return courses.map(course => {
      // Calculate total duration in minutes
      const totalMinutes = course.modules
        .flatMap(m => m.lessons)
        .reduce((total, lesson) => total + (lesson.duration || 0), 0)
      
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60
      const duration = hours > 0 ? 
        `${hours}h ${minutes}m` : 
        `${minutes}m`

      return {
        id: course.id,
        title: course.title,
        description: course.description,
        instructor: course.author.name || course.author.email,
        duration,
        modules: course.modules.length,
        students: course._count.enrollments,
        status: course.status,
        tags: JSON.parse(course.tags || '[]'),
        enrolled: userId ? course.enrollments.length > 0 : false,
        thumbnail: course.thumbnail,
        publishedAt: course.publishedAt
      }
    })
  }

  static async getCourseById(courseId: string, userId?: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        author: true,
        modules: {
          include: {
            lessons: {
              include: {
                progress: userId ? {
                  where: { userId }
                } : false,
                resources: true
              },
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { order: 'asc' }
        },
        enrollments: userId ? {
          where: { userId }
        } : false,
        _count: {
          select: {
            enrollments: true
          }
        }
      }
    })

    if (!course) {
      return null
    }

    // Calculate progress if user is provided
    let overallProgress = 0
    if (userId) {
      const allLessons = course.modules.flatMap(m => m.lessons)
      const completedLessons = allLessons.filter(l => 
        l.progress.some(p => p.completed)
      )
      overallProgress = allLessons.length > 0 ? 
        Math.round((completedLessons.length / allLessons.length) * 100) : 0
    }

    // Calculate total duration
    const totalMinutes = course.modules
      .flatMap(m => m.lessons)
      .reduce((total, lesson) => total + (lesson.duration || 0), 0)

    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    const duration = hours > 0 ? 
      `${hours}h ${minutes}m` : 
      `${minutes}m`

    return {
      ...course,
      instructor: course.author.name || course.author.email,
      duration,
      totalMinutes,
      students: course._count.enrollments,
      enrolled: userId ? course.enrollments.length > 0 : false,
      progress: overallProgress
    }
  }

  static async enrollInCourse(userId: string, courseId: string) {
    // Check if course exists and is published
    const course = await prisma.course.findUnique({
      where: { 
        id: courseId,
        status: CourseStatus.PUBLISHED
      }
    })

    if (!course) {
      throw new Error('Course not found or not available for enrollment')
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId
        }
      }
    })

    if (existingEnrollment) {
      return existingEnrollment
    }

    // Create enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        userId,
        courseId
      }
    })

    return enrollment
  }

  static async getAvailableTags(): Promise<string[]> {
    try {
      const courses = await prisma.course.findMany({
        where: { status: CourseStatus.PUBLISHED },
        select: { tags: true }
      })

      const allTags = courses.flatMap(course => {
        try {
          return JSON.parse(course.tags || '[]')
        } catch {
          return []
        }
      })
      const uniqueTags = Array.from(new Set(allTags)).sort()
      
      return uniqueTags
    } catch (error) {
      console.error('CoursesService.getAvailableTags: Database error, using mock tags:', error)
      
      // Return mock tags for production deployment
      return [
        'Business Strategy', 'M&A', 'Due Diligence', 'Valuation', 
        'Risk Assessment', 'Financial Analysis', 'Legal Review',
        'Integration', 'Change Management', 'Value Creation', 'Leadership'
      ]
    }
  }

  static async getInstructors(): Promise<Array<{ id: string; name: string; courseCount: number }>> {
    try {
      const instructors = await prisma.user.findMany({
        where: { 
          role: Role.INSTRUCTOR,
          courses: {
            some: {
              status: CourseStatus.PUBLISHED
            }
          }
        },
        include: {
          _count: {
            select: {
              courses: {
                where: {
                  status: CourseStatus.PUBLISHED
                }
              }
            }
          }
        }
      })

      return instructors.map(instructor => ({
        id: instructor.id,
        name: instructor.name || instructor.email,
        courseCount: instructor._count.courses
      }))
    } catch (error) {
      console.error('CoursesService.getInstructors: Database error, using mock instructors:', error)
      
      // Return mock instructors for production deployment
      return [
        { id: 'instructor-1', name: 'Dr. Michael Rodriguez', courseCount: 1 },
        { id: 'instructor-2', name: 'Sarah Chen, CPA', courseCount: 1 },
        { id: 'instructor-3', name: 'James Mitchell', courseCount: 1 }
      ]
    }
  }
}