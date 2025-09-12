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

    const courses = await prisma.course.findMany({
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
    const uniqueTags = [...new Set(allTags)].sort()
    
    return uniqueTags
  }

  static async getInstructors(): Promise<Array<{ id: string; name: string; courseCount: number }>> {
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
  }
}