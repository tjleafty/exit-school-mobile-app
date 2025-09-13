import { PrismaClient, InteractionType } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

export interface ProgressData {
  lessonId: string
  currentTime: number
  duration: number
  percentWatched: number
  completed?: boolean
}

export interface SessionData {
  userId: string
  lessonId: string
  progressId?: string
  startTime: Date
  endTime?: Date
  interactions: InteractionData[]
}

export interface InteractionData {
  type: InteractionType
  timestamp: Date
  position?: number
  data?: any
}

export interface ProgressSummary {
  totalLessons: number
  completedLessons: number
  totalTimeSpent: number // in seconds
  averageCompletionTime: number
  completionRate: number // percentage
  lastAccessedAt?: Date
  currentStreak: number // consecutive days of activity
  totalSessions: number
}

export class ProgressTracker {
  static async startLearningSession(userId: string, lessonId: string) {
    try {
      // Get or create progress record
      let progress = await prisma.progress.findUnique({
        where: {
          userId_lessonId: {
            userId,
            lessonId
          }
        }
      })

      if (!progress) {
        progress = await prisma.progress.create({
          data: {
            userId,
            lessonId,
            firstStartedAt: new Date(),
            lastAccessedAt: new Date(),
            attempts: 1
          }
        })
      } else {
        // Update existing progress
        await prisma.progress.update({
          where: { id: progress.id },
          data: {
            lastAccessedAt: new Date(),
            attempts: progress.attempts + 1
          }
        })
      }

      // Create new learning session
      const session = await prisma.learningSession.create({
        data: {
          userId,
          lessonId,
          progressId: progress.id,
          startedAt: new Date()
        }
      })

      // Record session start interaction
      await this.recordInteraction(session.id, {
        type: InteractionType.LESSON_START,
        timestamp: new Date()
      })

      return {
        sessionId: session.id,
        progressId: progress.id
      }

    } catch (error) {
      console.error('Error starting learning session:', error)
      throw new Error('Failed to start learning session')
    }
  }

  static async updateProgress(
    userId: string,
    lessonId: string,
    progressData: ProgressData
  ) {
    try {
      const { currentTime, duration, percentWatched, completed } = progressData

      // Calculate time spent in this update
      const timeSpentIncrement = Math.max(0, currentTime - (await this.getLastPosition(userId, lessonId)))

      const updatedProgress = await prisma.progress.update({
        where: {
          userId_lessonId: {
            userId,
            lessonId
          }
        },
        data: {
          lastPosition: currentTime,
          percentWatched: Math.max(percentWatched, 0),
          timeSpent: {
            increment: Math.round(timeSpentIncrement)
          },
          completed: completed || percentWatched >= 90, // Auto-complete at 90%
          completedAt: completed || percentWatched >= 90 ? new Date() : undefined,
          lastAccessedAt: new Date(),
          updatedAt: new Date()
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
        }
      })

      // Check if this completes the course
      if (updatedProgress.completed) {
        await this.checkCourseCompletion(userId, updatedProgress.lesson.module.courseId)
      }

      return updatedProgress

    } catch (error) {
      console.error('Error updating progress:', error)
      throw new Error('Failed to update progress')
    }
  }

  static async endLearningSession(sessionId: string) {
    try {
      const endTime = new Date()
      
      // Get session details
      const session = await prisma.learningSession.findUnique({
        where: { id: sessionId },
        include: { progress: true }
      })

      if (!session) {
        throw new Error('Session not found')
      }

      // Calculate duration
      const duration = Math.round((endTime.getTime() - session.startedAt.getTime()) / 1000)

      // Update session
      const updatedSession = await prisma.learningSession.update({
        where: { id: sessionId },
        data: {
          endedAt: endTime,
          duration,
          completed: session.progress.completed
        }
      })

      // Record session end interaction
      await this.recordInteraction(sessionId, {
        type: InteractionType.LESSON_COMPLETE,
        timestamp: endTime
      })

      return updatedSession

    } catch (error) {
      console.error('Error ending learning session:', error)
      throw new Error('Failed to end learning session')
    }
  }

  static async recordInteraction(sessionId: string, interaction: InteractionData) {
    try {
      return await prisma.sessionInteraction.create({
        data: {
          sessionId,
          type: interaction.type,
          timestamp: interaction.timestamp,
          position: interaction.position,
          data: interaction.data
        }
      })
    } catch (error) {
      console.error('Error recording interaction:', error)
    }
  }

  static async getUserProgress(userId: string, courseId?: string) {
    try {
      const whereClause: any = { userId }
      
      if (courseId) {
        whereClause.lesson = {
          module: {
            courseId
          }
        }
      }

      const progress = await prisma.progress.findMany({
        where: whereClause,
        include: {
          lesson: {
            include: {
              module: {
                include: {
                  course: {
                    select: {
                      id: true,
                      title: true
                    }
                  }
                }
              }
            }
          },
          sessions: {
            orderBy: { startedAt: 'desc' },
            take: 1
          }
        },
        orderBy: {
          lastAccessedAt: 'desc'
        }
      })

      return progress

    } catch (error) {
      console.error('Error getting user progress:', error)
      throw new Error('Failed to get user progress')
    }
  }

  static async getProgressSummary(userId: string, courseId?: string): Promise<ProgressSummary> {
    try {
      const whereClause: any = { userId }
      
      if (courseId) {
        whereClause.lesson = {
          module: {
            courseId
          }
        }
      }

      const progress = await prisma.progress.findMany({
        where: whereClause,
        include: {
          sessions: true
        }
      })

      const totalLessons = progress.length
      const completedLessons = progress.filter(p => p.completed).length
      const totalTimeSpent = progress.reduce((total, p) => total + p.timeSpent, 0)
      const completionRate = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0
      const lastAccessedAt = progress.reduce((latest, p) => {
        return p.lastAccessedAt && (!latest || p.lastAccessedAt > latest) ? p.lastAccessedAt : latest
      }, null as Date | null)
      
      const totalSessions = progress.reduce((total, p) => total + p.sessions.length, 0)
      const averageCompletionTime = completedLessons > 0 ? totalTimeSpent / completedLessons : 0

      // Calculate current streak
      const currentStreak = await this.calculateLearningStreak(userId)

      return {
        totalLessons,
        completedLessons,
        totalTimeSpent,
        averageCompletionTime,
        completionRate,
        lastAccessedAt: lastAccessedAt || undefined,
        currentStreak,
        totalSessions
      }

    } catch (error) {
      console.error('Error getting progress summary:', error)
      throw new Error('Failed to get progress summary')
    }
  }

  static async getCourseAnalytics(courseId: string) {
    try {
      const courseProgress = await prisma.progress.findMany({
        where: {
          lesson: {
            module: {
              courseId
            }
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          lesson: {
            include: {
              module: true
            }
          },
          sessions: {
            include: {
              interactions: true
            }
          }
        }
      })

      // Group by user
      const userProgress = courseProgress.reduce((acc, progress) => {
        if (!acc[progress.userId]) {
          acc[progress.userId] = {
            user: progress.user,
            lessons: [],
            totalTimeSpent: 0,
            completedLessons: 0,
            totalLessons: 0,
            lastAccessedAt: null as Date | null,
            sessions: 0
          }
        }

        acc[progress.userId].lessons.push(progress)
        acc[progress.userId].totalTimeSpent += progress.timeSpent
        acc[progress.userId].totalLessons += 1
        
        if (progress.completed) {
          acc[progress.userId].completedLessons += 1
        }

        if (progress.lastAccessedAt && 
            (!acc[progress.userId].lastAccessedAt || 
             progress.lastAccessedAt > acc[progress.userId].lastAccessedAt!)) {
          acc[progress.userId].lastAccessedAt = progress.lastAccessedAt
        }

        acc[progress.userId].sessions += progress.sessions.length

        return acc
      }, {} as any)

      const analytics = Object.values(userProgress).map((user: any) => ({
        ...user,
        completionRate: user.totalLessons > 0 ? (user.completedLessons / user.totalLessons) * 100 : 0,
        averageTimePerLesson: user.totalLessons > 0 ? user.totalTimeSpent / user.totalLessons : 0
      }))

      return analytics

    } catch (error) {
      console.error('Error getting course analytics:', error)
      throw new Error('Failed to get course analytics')
    }
  }

  private static async getLastPosition(userId: string, lessonId: string): Promise<number> {
    try {
      const progress = await prisma.progress.findUnique({
        where: {
          userId_lessonId: {
            userId,
            lessonId
          }
        }
      })

      return progress?.lastPosition || 0
    } catch (error) {
      return 0
    }
  }

  private static async checkCourseCompletion(userId: string, courseId: string) {
    try {
      // Get all lessons in the course
      const allLessons = await prisma.lesson.findMany({
        where: {
          module: {
            courseId
          }
        }
      })

      // Get user's progress on all lessons in the course
      const userProgress = await prisma.progress.findMany({
        where: {
          userId,
          lesson: {
            module: {
              courseId
            }
          }
        }
      })

      // Check if all lessons are completed
      const completedCount = userProgress.filter(p => p.completed).length
      const isCompleted = completedCount === allLessons.length

      if (isCompleted) {
        // Update enrollment as completed
        await prisma.enrollment.updateMany({
          where: {
            userId,
            courseId
          },
          data: {
            completedAt: new Date()
          }
        })
      }

      return isCompleted

    } catch (error) {
      console.error('Error checking course completion:', error)
      return false
    }
  }

  private static async calculateLearningStreak(userId: string): Promise<number> {
    try {
      // Get learning sessions grouped by date
      const sessions = await prisma.learningSession.findMany({
        where: {
          userId,
          startedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        orderBy: {
          startedAt: 'desc'
        }
      })

      if (sessions.length === 0) return 0

      // Group by date
      const sessionsByDate = sessions.reduce((acc, session) => {
        const date = session.startedAt.toDateString()
        if (!acc[date]) {
          acc[date] = []
        }
        acc[date].push(session)
        return acc
      }, {} as Record<string, any[]>)

      const dates = Object.keys(sessionsByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      
      let streak = 0
      const today = new Date().toDateString()
      
      // Start checking from today or yesterday
      let startIndex = dates[0] === today ? 0 : (dates[0] === new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString() ? 0 : -1)
      
      if (startIndex === -1) return 0

      for (let i = startIndex; i < dates.length; i++) {
        const currentDate = new Date(dates[i])
        const expectedDate = new Date()
        expectedDate.setDate(expectedDate.getDate() - (i - startIndex))
        
        if (currentDate.toDateString() === expectedDate.toDateString()) {
          streak++
        } else {
          break
        }
      }

      return streak

    } catch (error) {
      console.error('Error calculating learning streak:', error)
      return 0
    }
  }
}