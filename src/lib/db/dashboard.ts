import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface DashboardStats {
  coursesEnrolled: number
  coursesCompleted: number
  totalHoursWatched: number
  certificatesEarned: number
  currentStreak: number
}

export interface DashboardActivity {
  id: string
  type: 'lesson_completed' | 'course_started' | 'certificate_earned' | 'course_completed'
  title: string
  course: string
  timestamp: string
}

export interface ContinueLearningCourse {
  id: string
  title: string
  progress: number
  nextLesson: string
  thumbnail: string | null
  moduleId: string
  lessonId: string
}

export interface RecommendedCourse {
  id: string
  title: string
  instructor: string
  duration: string
  description: string
  tags: string[]
}

export class DashboardService {
  static async getDashboardStats(userId: string): Promise<DashboardStats> {
    // Get enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: true
              }
            }
          }
        }
      }
    })

    // Get completed courses (enrollments with completedAt)
    const completedCourses = enrollments.filter(e => e.completedAt)

    // Get user progress
    const userProgress = await prisma.progress.findMany({
      where: { userId },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: true
              }
            }
          }
        }
      }
    })

    // Calculate total hours watched
    const totalMinutesWatched = userProgress
      .filter(p => p.completed)
      .reduce((total, progress) => {
        return total + (progress.lesson.duration || 0)
      }, 0)
    const totalHoursWatched = Math.round((totalMinutesWatched / 60) * 10) / 10

    // Calculate learning streak (simplified - count consecutive days with completed lessons)
    const recentProgress = userProgress
      .filter(p => p.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())

    let currentStreak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Simple streak calculation - consecutive days with activity
    const completionDates = recentProgress
      .map(p => {
        const date = new Date(p.completedAt!)
        date.setHours(0, 0, 0, 0)
        return date.getTime()
      })
      .filter((date, index, arr) => arr.indexOf(date) === index) // Remove duplicates
      .sort((a, b) => b - a)

    for (let i = 0; i < completionDates.length; i++) {
      const daysDiff = Math.floor((today.getTime() - completionDates[i]) / (1000 * 60 * 60 * 24))
      if (daysDiff === i) {
        currentStreak++
      } else {
        break
      }
    }

    return {
      coursesEnrolled: enrollments.length,
      coursesCompleted: completedCourses.length,
      totalHoursWatched,
      certificatesEarned: completedCourses.length, // For now, assume certificate per completed course
      currentStreak
    }
  }

  static async getRecentActivity(userId: string, limit: number = 10): Promise<DashboardActivity[]> {
    const activities: DashboardActivity[] = []

    // Get recent lesson completions
    const recentProgress = await prisma.progress.findMany({
      where: {
        userId,
        completed: true,
        completedAt: { not: null }
      },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: true
              }
            }
          }
        }
      },
      orderBy: { completedAt: 'desc' },
      take: limit
    })

    // Add lesson completions to activities
    for (const progress of recentProgress) {
      activities.push({
        id: progress.id,
        type: 'lesson_completed',
        title: `Completed "${progress.lesson.title}"`,
        course: progress.lesson.module.course.title,
        timestamp: formatTimestamp(progress.completedAt!)
      })
    }

    // Get recent enrollments
    const recentEnrollments = await prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    // Add course starts to activities
    for (const enrollment of recentEnrollments) {
      activities.push({
        id: enrollment.id,
        type: 'course_started',
        title: `Started "${enrollment.course.title}"`,
        course: enrollment.course.title,
        timestamp: formatTimestamp(enrollment.createdAt)
      })
    }

    // Get completed courses (certificates)
    const completedCourses = recentEnrollments.filter(e => e.completedAt)
    for (const enrollment of completedCourses) {
      activities.push({
        id: `cert-${enrollment.id}`,
        type: 'certificate_earned',
        title: 'Earned certificate',
        course: enrollment.course.title,
        timestamp: formatTimestamp(enrollment.completedAt!)
      })
    }

    // Sort by timestamp and limit
    return activities
      .sort((a, b) => parseTimestamp(b.timestamp) - parseTimestamp(a.timestamp))
      .slice(0, limit)
  }

  static async getContinueLearning(userId: string): Promise<ContinueLearningCourse[]> {
    // Get user's enrollments with progress
    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId,
        completedAt: null // Only ongoing courses
      },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: {
                  include: {
                    progress: {
                      where: { userId }
                    }
                  },
                  orderBy: { order: 'asc' }
                }
              },
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    })

    const continueLearning: ContinueLearningCourse[] = []

    for (const enrollment of enrollments) {
      const course = enrollment.course
      
      // Calculate overall progress
      const allLessons = course.modules.flatMap(m => m.lessons)
      const completedLessons = allLessons.filter(l => 
        l.progress.some(p => p.completed)
      )
      const progress = allLessons.length > 0 ? 
        Math.round((completedLessons.length / allLessons.length) * 100) : 0

      // Find next lesson to complete
      let nextLesson = null
      let nextModuleId = null
      let nextLessonId = null

      for (const module of course.modules) {
        for (const lesson of module.lessons) {
          const isCompleted = lesson.progress.some(p => p.completed)
          if (!isCompleted) {
            nextLesson = lesson.title
            nextModuleId = module.id
            nextLessonId = lesson.id
            break
          }
        }
        if (nextLesson) break
      }

      if (nextLesson) {
        continueLearning.push({
          id: course.id,
          title: course.title,
          progress,
          nextLesson,
          thumbnail: course.thumbnail,
          moduleId: nextModuleId!,
          lessonId: nextLessonId!
        })
      }
    }

    return continueLearning
  }

  static async getRecommendedCourses(userId: string, limit: number = 3): Promise<RecommendedCourse[]> {
    // Get user's current enrollments
    const userEnrollments = await prisma.enrollment.findMany({
      where: { userId },
      select: { courseId: true }
    })
    
    const enrolledCourseIds = userEnrollments.map(e => e.courseId)

    // Get recommended courses (not enrolled, published)
    const recommendedCourses = await prisma.course.findMany({
      where: {
        status: 'PUBLISHED',
        id: { notIn: enrolledCourseIds }
      },
      include: {
        author: true,
        modules: {
          include: {
            lessons: true
          }
        }
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    })

    return recommendedCourses.map(course => {
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
        id: course.id,
        title: course.title,
        instructor: course.author.name || course.author.email,
        duration,
        description: course.description,
        tags: course.tags
      }
    })
  }
}

// Helper functions
function formatTimestamp(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 60) {
    return minutes <= 1 ? '1 minute ago' : `${minutes} minutes ago`
  } else if (hours < 24) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  } else {
    return days === 1 ? '1 day ago' : `${days} days ago`
  }
}

function parseTimestamp(timestamp: string): number {
  // Simple parsing for sorting - convert back to approximate time
  if (timestamp.includes('minute')) {
    const minutes = parseInt(timestamp.match(/\d+/)?.[0] || '0')
    return Date.now() - (minutes * 60 * 1000)
  } else if (timestamp.includes('hour')) {
    const hours = parseInt(timestamp.match(/\d+/)?.[0] || '0')
    return Date.now() - (hours * 60 * 60 * 1000)
  } else if (timestamp.includes('day')) {
    const days = parseInt(timestamp.match(/\d+/)?.[0] || '0')
    return Date.now() - (days * 24 * 60 * 60 * 1000)
  }
  return Date.now()
}