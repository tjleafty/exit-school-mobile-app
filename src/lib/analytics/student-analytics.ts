import { PrismaClient, Role } from '@prisma/client'
import { ProgressTracker, ProgressSummary } from '@/lib/progress/progress-tracker'

const prisma = new PrismaClient()

export interface StudentMetrics {
  studentId: string
  studentName: string
  studentEmail: string
  enrollmentDate: Date
  lastActive: Date | null
  progressSummary: ProgressSummary
  performanceMetrics: {
    averageSessionLength: number // in minutes
    totalEngagementTime: number // in minutes
    completionVelocity: number // lessons per week
    strugglingLessons: string[] // lesson IDs where user spent excessive time
    strongPerformance: string[] // lesson IDs completed quickly
  }
  streakData: {
    currentStreak: number
    longestStreak: number
    streakBreaks: number
  }
  interactionPatterns: {
    mostActiveTimeOfDay: string
    preferredLessonTypes: string[]
    avgPausesPerLesson: number
    avgSeeksPerLesson: number
  }
}

export interface CourseMetrics {
  courseId: string
  courseTitle: string
  totalStudents: number
  activeStudents: number // students active in last 7 days
  completionRate: number
  averageCompletionTime: number // in hours
  dropoffPoints: {
    lessonId: string
    lessonTitle: string
    dropoffRate: number
  }[]
  engagementMetrics: {
    averageSessionLength: number
    totalViewTime: number
    interactionRate: number
  }
  performanceDistribution: {
    highPerformers: number // top 25%
    averagePerformers: number // middle 50%
    strugglingStudents: number // bottom 25%
  }
}

export interface LessonMetrics {
  lessonId: string
  lessonTitle: string
  averageWatchTime: number
  completionRate: number
  averageAttempts: number
  commonDropoffPoints: number[] // timestamps where users commonly drop off
  interactionHotspots: {
    position: number
    interactionCount: number
    type: string
  }[]
}

export class StudentAnalyticsService {
  static async getStudentMetrics(studentId: string, courseId?: string): Promise<StudentMetrics> {
    try {
      // Get student basic info
      const student = await prisma.user.findUnique({
        where: { id: studentId },
        include: {
          enrollments: {
            where: courseId ? { courseId } : {},
            include: {
              course: true
            }
          }
        }
      })

      if (!student) {
        throw new Error('Student not found')
      }

      // Get progress summary
      const progressSummary = await ProgressTracker.getProgressSummary(studentId, courseId)

      // Get detailed performance metrics
      const performanceMetrics = await this.calculatePerformanceMetrics(studentId, courseId)
      
      // Get streak data
      const streakData = await this.calculateStreakData(studentId, courseId)
      
      // Get interaction patterns
      const interactionPatterns = await this.analyzeInteractionPatterns(studentId, courseId)

      const enrollmentDate = student.enrollments[0]?.createdAt || student.createdAt

      return {
        studentId: student.id,
        studentName: student.name || 'Unknown',
        studentEmail: student.email,
        enrollmentDate,
        lastActive: progressSummary.lastAccessedAt || null,
        progressSummary,
        performanceMetrics,
        streakData,
        interactionPatterns
      }

    } catch (error) {
      console.error('Error getting student metrics:', error)
      throw new Error('Failed to get student metrics')
    }
  }

  static async getCourseMetrics(courseId: string): Promise<CourseMetrics> {
    try {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          enrollments: {
            include: {
              user: true
            }
          },
          modules: {
            include: {
              lessons: {
                include: {
                  progress: {
                    include: {
                      sessions: {
                        include: {
                          interactions: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      })

      if (!course) {
        throw new Error('Course not found')
      }

      const totalStudents = course.enrollments.length
      
      // Calculate active students (last 7 days)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const activeStudents = await prisma.user.count({
        where: {
          enrollments: {
            some: { courseId }
          },
          progress: {
            some: {
              lastAccessedAt: {
                gte: weekAgo
              },
              lesson: {
                module: {
                  courseId
                }
              }
            }
          }
        }
      })

      // Get course analytics from ProgressTracker
      const courseAnalytics = await ProgressTracker.getCourseAnalytics(courseId)
      
      const completedStudents = courseAnalytics.filter(analytics => 
        analytics.completionRate >= 100
      ).length
      
      const completionRate = totalStudents > 0 ? (completedStudents / totalStudents) * 100 : 0
      
      const averageCompletionTime = courseAnalytics.reduce((sum, analytics) => 
        sum + analytics.totalTimeSpent, 0
      ) / Math.max(courseAnalytics.length, 1) / 3600 // Convert to hours

      // Calculate dropoff points
      const dropoffPoints = await this.calculateDropoffPoints(courseId)
      
      // Calculate engagement metrics
      const engagementMetrics = await this.calculateEngagementMetrics(courseId)
      
      // Calculate performance distribution
      const performanceDistribution = this.calculatePerformanceDistribution(courseAnalytics)

      return {
        courseId,
        courseTitle: course.title,
        totalStudents,
        activeStudents,
        completionRate,
        averageCompletionTime,
        dropoffPoints,
        engagementMetrics,
        performanceDistribution
      }

    } catch (error) {
      console.error('Error getting course metrics:', error)
      throw new Error('Failed to get course metrics')
    }
  }

  static async getLessonMetrics(lessonId: string): Promise<LessonMetrics> {
    try {
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
          progress: {
            include: {
              sessions: {
                include: {
                  interactions: true
                }
              }
            }
          }
        }
      })

      if (!lesson) {
        throw new Error('Lesson not found')
      }

      const totalProgress = lesson.progress.length
      const completedProgress = lesson.progress.filter(p => p.completed).length
      const completionRate = totalProgress > 0 ? (completedProgress / totalProgress) * 100 : 0

      const averageWatchTime = lesson.progress.reduce((sum, p) => sum + p.timeSpent, 0) / Math.max(totalProgress, 1)
      const averageAttempts = lesson.progress.reduce((sum, p) => sum + p.attempts, 0) / Math.max(totalProgress, 1)

      // Analyze common dropoff points
      const dropoffPoints = await this.analyzeLessonDropoffPoints(lessonId)
      
      // Analyze interaction hotspots
      const interactionHotspots = await this.analyzeLessonInteractionHotspots(lessonId)

      return {
        lessonId,
        lessonTitle: lesson.title,
        averageWatchTime,
        completionRate,
        averageAttempts,
        commonDropoffPoints: dropoffPoints,
        interactionHotspots
      }

    } catch (error) {
      console.error('Error getting lesson metrics:', error)
      throw new Error('Failed to get lesson metrics')
    }
  }

  private static async calculatePerformanceMetrics(studentId: string, courseId?: string) {
    const sessions = await prisma.learningSession.findMany({
      where: {
        userId: studentId,
        ...(courseId && {
          lesson: {
            module: {
              courseId
            }
          }
        })
      },
      include: {
        interactions: true,
        progress: true
      }
    })

    const totalSessionTime = sessions.reduce((sum, session) => sum + (session.duration || 0), 0)
    const averageSessionLength = sessions.length > 0 ? totalSessionTime / sessions.length / 60 : 0

    const totalEngagementTime = totalSessionTime / 60 // Convert to minutes

    // Calculate completion velocity (lessons per week)
    const completedLessons = sessions.filter(s => s.completed).length
    const firstSession = sessions.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())[0]
    const weeksActive = firstSession ? 
      Math.max(1, (Date.now() - firstSession.startedAt.getTime()) / (7 * 24 * 60 * 60 * 1000)) : 1
    const completionVelocity = completedLessons / weeksActive

    // Identify struggling and strong performance lessons
    const lessonPerformance = sessions.reduce((acc, session) => {
      if (!acc[session.lessonId]) {
        acc[session.lessonId] = { totalTime: 0, completed: false, attempts: 0 }
      }
      acc[session.lessonId].totalTime += session.duration || 0
      acc[session.lessonId].completed = session.completed || acc[session.lessonId].completed
      acc[session.lessonId].attempts += 1
      return acc
    }, {} as Record<string, { totalTime: number, completed: boolean, attempts: number }>)

    const avgLessonTime = Object.values(lessonPerformance).reduce((sum, p) => sum + p.totalTime, 0) / 
                         Math.max(Object.keys(lessonPerformance).length, 1)

    const strugglingLessons = Object.entries(lessonPerformance)
      .filter(([_, perf]) => perf.totalTime > avgLessonTime * 2 || perf.attempts > 3)
      .map(([lessonId]) => lessonId)

    const strongPerformance = Object.entries(lessonPerformance)
      .filter(([_, perf]) => perf.completed && perf.totalTime < avgLessonTime * 0.8 && perf.attempts === 1)
      .map(([lessonId]) => lessonId)

    return {
      averageSessionLength,
      totalEngagementTime,
      completionVelocity,
      strugglingLessons,
      strongPerformance
    }
  }

  private static async calculateStreakData(studentId: string, courseId?: string) {
    const currentStreak = await ProgressTracker['calculateLearningStreak'](studentId)
    
    // Calculate longest streak and breaks
    const sessions = await prisma.learningSession.findMany({
      where: {
        userId: studentId,
        ...(courseId && {
          lesson: {
            module: {
              courseId
            }
          }
        })
      },
      orderBy: { startedAt: 'asc' }
    })

    const sessionsByDate = sessions.reduce((acc, session) => {
      const date = session.startedAt.toDateString()
      if (!acc.includes(date)) acc.push(date)
      return acc
    }, [] as string[])

    let longestStreak = 0
    let currentStreakCount = 0
    let streakBreaks = 0

    for (let i = 0; i < sessionsByDate.length; i++) {
      const currentDate = new Date(sessionsByDate[i])
      const nextDate = i < sessionsByDate.length - 1 ? new Date(sessionsByDate[i + 1]) : null
      
      currentStreakCount++
      
      if (nextDate && (nextDate.getTime() - currentDate.getTime()) > 2 * 24 * 60 * 60 * 1000) {
        // Gap of more than 2 days breaks the streak
        longestStreak = Math.max(longestStreak, currentStreakCount)
        currentStreakCount = 0
        streakBreaks++
      }
    }
    
    longestStreak = Math.max(longestStreak, currentStreakCount)

    return {
      currentStreak,
      longestStreak,
      streakBreaks
    }
  }

  private static async analyzeInteractionPatterns(studentId: string, courseId?: string) {
    const interactions = await prisma.sessionInteraction.findMany({
      where: {
        session: {
          userId: studentId,
          ...(courseId && {
            lesson: {
              module: {
                courseId
              }
            }
          })
        }
      },
      include: {
        session: {
          include: {
            lesson: true
          }
        }
      }
    })

    // Analyze most active time of day
    const hourCounts = interactions.reduce((acc, interaction) => {
      const hour = interaction.timestamp.getHours()
      acc[hour] = (acc[hour] || 0) + 1
      return acc
    }, {} as Record<number, number>)

    const mostActiveHour = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '0'
    
    const mostActiveTimeOfDay = `${mostActiveHour}:00`

    // Analyze preferred lesson types
    const lessonTypeCounts = interactions.reduce((acc, interaction) => {
      const lessonType = interaction.session.lesson.type
      acc[lessonType] = (acc[lessonType] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const preferredLessonTypes = Object.entries(lessonTypeCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([type]) => type)

    // Calculate average pauses and seeks per lesson
    const sessionStats = interactions.reduce((acc, interaction) => {
      if (!acc[interaction.sessionId]) {
        acc[interaction.sessionId] = { pauses: 0, seeks: 0 }
      }
      
      if (interaction.type === 'LESSON_PAUSE') acc[interaction.sessionId].pauses++
      if (interaction.type === 'LESSON_SEEK') acc[interaction.sessionId].seeks++
      
      return acc
    }, {} as Record<string, { pauses: number, seeks: number }>)

    const sessions = Object.values(sessionStats)
    const avgPausesPerLesson = sessions.reduce((sum, s) => sum + s.pauses, 0) / Math.max(sessions.length, 1)
    const avgSeeksPerLesson = sessions.reduce((sum, s) => sum + s.seeks, 0) / Math.max(sessions.length, 1)

    return {
      mostActiveTimeOfDay,
      preferredLessonTypes,
      avgPausesPerLesson,
      avgSeeksPerLesson
    }
  }

  private static async calculateDropoffPoints(courseId: string) {
    const lessons = await prisma.lesson.findMany({
      where: {
        module: {
          courseId
        }
      },
      include: {
        progress: true,
        module: true
      },
      orderBy: [
        { module: { order: 'asc' } },
        { order: 'asc' }
      ]
    })

    const dropoffPoints = []
    
    for (let i = 0; i < lessons.length - 1; i++) {
      const currentLesson = lessons[i]
      const nextLesson = lessons[i + 1]
      
      const currentLessonStudents = currentLesson.progress.length
      const nextLessonStudents = nextLesson.progress.length
      
      if (currentLessonStudents > 0) {
        const dropoffRate = ((currentLessonStudents - nextLessonStudents) / currentLessonStudents) * 100
        
        if (dropoffRate > 20) { // Significant dropoff threshold
          dropoffPoints.push({
            lessonId: currentLesson.id,
            lessonTitle: currentLesson.title,
            dropoffRate
          })
        }
      }
    }

    return dropoffPoints.sort((a, b) => b.dropoffRate - a.dropoffRate).slice(0, 5)
  }

  private static async calculateEngagementMetrics(courseId: string) {
    const sessions = await prisma.learningSession.findMany({
      where: {
        lesson: {
          module: {
            courseId
          }
        }
      },
      include: {
        interactions: true
      }
    })

    const totalSessions = sessions.length
    const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0)
    const averageSessionLength = totalSessions > 0 ? totalDuration / totalSessions / 60 : 0

    const totalViewTime = totalDuration / 60 // Convert to minutes
    
    const totalInteractions = sessions.reduce((sum, s) => sum + s.interactions.length, 0)
    const interactionRate = totalSessions > 0 ? totalInteractions / totalSessions : 0

    return {
      averageSessionLength,
      totalViewTime,
      interactionRate
    }
  }

  private static calculatePerformanceDistribution(courseAnalytics: any[]) {
    if (courseAnalytics.length === 0) {
      return { highPerformers: 0, averagePerformers: 0, strugglingStudents: 0 }
    }

    const sortedByCompletion = courseAnalytics
      .sort((a, b) => b.completionRate - a.completionRate)

    const total = sortedByCompletion.length
    const top25Percent = Math.ceil(total * 0.25)
    const bottom25Percent = Math.ceil(total * 0.25)

    return {
      highPerformers: top25Percent,
      averagePerformers: total - top25Percent - bottom25Percent,
      strugglingStudents: bottom25Percent
    }
  }

  private static async analyzeLessonDropoffPoints(lessonId: string): Promise<number[]> {
    const progress = await prisma.progress.findMany({
      where: { lessonId },
      select: { lastPosition: true, completed: true }
    })

    const incompleteLessons = progress.filter(p => !p.completed)
    const dropoffPositions = incompleteLessons.map(p => p.lastPosition)
    
    // Group positions into 10-second buckets and find common dropoff points
    const buckets = dropoffPositions.reduce((acc, position) => {
      const bucket = Math.floor(position / 10) * 10
      acc[bucket] = (acc[bucket] || 0) + 1
      return acc
    }, {} as Record<number, number>)

    return Object.entries(buckets)
      .filter(([, count]) => count >= 3) // At least 3 people dropped off at this point
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([position]) => Number(position))
  }

  private static async analyzeLessonInteractionHotspots(lessonId: string) {
    const interactions = await prisma.sessionInteraction.findMany({
      where: {
        session: {
          lessonId
        },
        position: {
          not: null
        }
      }
    })

    // Group by position in 30-second buckets
    const hotspots = interactions.reduce((acc, interaction) => {
      const bucket = Math.floor((interaction.position || 0) / 30) * 30
      const key = `${bucket}-${interaction.type}`
      
      if (!acc[bucket]) {
        acc[bucket] = { position: bucket, interactionCount: 0, types: {} }
      }
      
      acc[bucket].interactionCount++
      acc[bucket].types[interaction.type] = (acc[bucket].types[interaction.type] || 0) + 1
      
      return acc
    }, {} as Record<number, { position: number, interactionCount: number, types: Record<string, number> }>)

    return Object.values(hotspots)
      .filter(h => h.interactionCount >= 5) // Significant interaction threshold
      .sort((a, b) => b.interactionCount - a.interactionCount)
      .slice(0, 10)
      .map(h => ({
        position: h.position,
        interactionCount: h.interactionCount,
        type: Object.entries(h.types).sort(([,a], [,b]) => b - a)[0][0] // Most common interaction type
      }))
  }
}