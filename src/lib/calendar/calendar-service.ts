import { PrismaClient, EventType, EventStatus, RecurrenceType, CalendarProvider } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

export interface CreateEventData {
  title: string
  description?: string
  location?: string
  startTime: Date
  endTime: Date
  allDay?: boolean
  type: EventType
  courseId?: string
  organizationId?: string
  attendeeIds: string[]
  isRecurring?: boolean
  recurrenceType?: RecurrenceType
  recurrenceEnd?: Date
  zoomMeeting?: boolean
}

export interface UpdateEventData {
  title?: string
  description?: string
  location?: string
  startTime?: Date
  endTime?: Date
  allDay?: boolean
  type?: EventType
  status?: EventStatus
}

export interface EventFilters {
  startDate?: Date
  endDate?: Date
  courseId?: string
  organizationId?: string
  type?: EventType
  status?: EventStatus
  createdById?: string
  attendeeId?: string
}

export interface RecurrenceOptions {
  type: RecurrenceType
  endDate?: Date
  count?: number
  interval?: number
}

export class CalendarService {
  static async createEvent(creatorId: string, eventData: CreateEventData) {
    try {
      const { attendeeIds, isRecurring, recurrenceType, recurrenceEnd, zoomMeeting, ...baseEventData } = eventData

      // Create the main event
      const event = await prisma.calendarEvent.create({
        data: {
          ...baseEventData,
          createdById: creatorId,
          isRecurring: isRecurring || false,
          recurrenceType: recurrenceType || RecurrenceType.NONE,
          recurrenceEnd,
          // Zoom fields will be populated by ZoomService if zoomMeeting is true
        },
        include: {
          attendees: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          course: true,
          organization: true
        }
      })

      // Add attendees
      if (attendeeIds.length > 0) {
        await this.addAttendees(event.id, attendeeIds)
      }

      // Handle recurring events
      if (isRecurring && recurrenceType && recurrenceType !== RecurrenceType.NONE) {
        await this.createRecurringEvents(event.id, {
          type: recurrenceType,
          endDate: recurrenceEnd
        })
      }

      // Create Zoom meeting if requested
      if (zoomMeeting) {
        // This will be handled by ZoomService integration
        // For now, we'll just mark it as needing Zoom integration
      }

      return await this.getEventById(event.id)

    } catch (error) {
      console.error('Error creating event:', error)
      throw new Error('Failed to create event')
    }
  }

  static async updateEvent(eventId: string, userId: string, updateData: UpdateEventData) {
    try {
      // Check if user has permission to update the event
      const event = await prisma.calendarEvent.findUnique({
        where: { id: eventId },
        include: {
          attendees: {
            where: { userId }
          }
        }
      })

      if (!event) {
        throw new Error('Event not found')
      }

      // Only creator or attendees can update (attendees can only update their status)
      if (event.createdById !== userId && event.attendees.length === 0) {
        throw new Error('Permission denied')
      }

      const updatedEvent = await prisma.calendarEvent.update({
        where: { id: eventId },
        data: updateData,
        include: {
          attendees: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          course: true,
          organization: true
        }
      })

      return updatedEvent

    } catch (error) {
      console.error('Error updating event:', error)
      throw new Error('Failed to update event')
    }
  }

  static async deleteEvent(eventId: string, userId: string, deleteRecurring = false) {
    try {
      const event = await prisma.calendarEvent.findUnique({
        where: { id: eventId },
        include: {
          childEvents: true
        }
      })

      if (!event) {
        throw new Error('Event not found')
      }

      // Only creator can delete events
      if (event.createdById !== userId) {
        throw new Error('Permission denied')
      }

      // If it's a recurring event and deleteRecurring is true, delete all instances
      if (deleteRecurring && event.isRecurring) {
        await prisma.calendarEvent.deleteMany({
          where: {
            OR: [
              { id: eventId },
              { parentEventId: eventId }
            ]
          }
        })
      } else {
        // Just delete this specific event
        await prisma.calendarEvent.delete({
          where: { id: eventId }
        })
      }

      return { success: true }

    } catch (error) {
      console.error('Error deleting event:', error)
      throw new Error('Failed to delete event')
    }
  }

  static async getEventById(eventId: string) {
    try {
      const event = await prisma.calendarEvent.findUnique({
        where: { id: eventId },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          attendees: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          course: {
            select: {
              id: true,
              title: true
            }
          },
          organization: {
            select: {
              id: true,
              name: true
            }
          },
          parentEvent: true,
          childEvents: {
            orderBy: { startTime: 'asc' }
          }
        }
      })

      if (!event) {
        throw new Error('Event not found')
      }

      return event

    } catch (error) {
      console.error('Error getting event:', error)
      throw new Error('Failed to get event')
    }
  }

  static async getUserEvents(userId: string, filters: EventFilters = {}) {
    try {
      const {
        startDate,
        endDate,
        courseId,
        organizationId,
        type,
        status,
        createdById,
        attendeeId
      } = filters

      const whereClause: any = {
        OR: [
          { createdById: userId },
          {
            attendees: {
              some: { userId }
            }
          }
        ]
      }

      // Apply filters
      if (startDate || endDate) {
        whereClause.AND = whereClause.AND || []
        if (startDate && endDate) {
          whereClause.AND.push({
            OR: [
              {
                startTime: {
                  gte: startDate,
                  lte: endDate
                }
              },
              {
                endTime: {
                  gte: startDate,
                  lte: endDate
                }
              }
            ]
          })
        } else if (startDate) {
          whereClause.AND.push({
            endTime: { gte: startDate }
          })
        } else if (endDate) {
          whereClause.AND.push({
            startTime: { lte: endDate }
          })
        }
      }

      if (courseId) {
        whereClause.AND = whereClause.AND || []
        whereClause.AND.push({ courseId })
      }

      if (organizationId) {
        whereClause.AND = whereClause.AND || []
        whereClause.AND.push({ organizationId })
      }

      if (type) {
        whereClause.AND = whereClause.AND || []
        whereClause.AND.push({ type })
      }

      if (status) {
        whereClause.AND = whereClause.AND || []
        whereClause.AND.push({ status })
      }

      if (createdById) {
        whereClause.AND = whereClause.AND || []
        whereClause.AND.push({ createdById })
      }

      if (attendeeId) {
        whereClause.AND = whereClause.AND || []
        whereClause.AND.push({
          attendees: {
            some: { userId: attendeeId }
          }
        })
      }

      const events = await prisma.calendarEvent.findMany({
        where: whereClause,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          attendees: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          course: {
            select: {
              id: true,
              title: true
            }
          },
          organization: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { startTime: 'asc' }
      })

      return events

    } catch (error) {
      console.error('Error getting user events:', error)
      throw new Error('Failed to get user events')
    }
  }

  static async addAttendees(eventId: string, attendeeIds: string[]) {
    try {
      const attendeeData = attendeeIds.map(userId => ({
        eventId,
        userId,
        status: 'pending'
      }))

      await prisma.eventAttendee.createMany({
        data: attendeeData,
        skipDuplicates: true
      })

      return { success: true }

    } catch (error) {
      console.error('Error adding attendees:', error)
      throw new Error('Failed to add attendees')
    }
  }

  static async removeAttendee(eventId: string, userId: string) {
    try {
      await prisma.eventAttendee.delete({
        where: {
          eventId_userId: {
            eventId,
            userId
          }
        }
      })

      return { success: true }

    } catch (error) {
      console.error('Error removing attendee:', error)
      throw new Error('Failed to remove attendee')
    }
  }

  static async updateAttendeeStatus(eventId: string, userId: string, status: string) {
    try {
      const attendee = await prisma.eventAttendee.update({
        where: {
          eventId_userId: {
            eventId,
            userId
          }
        },
        data: {
          status,
          responseTime: new Date()
        }
      })

      return attendee

    } catch (error) {
      console.error('Error updating attendee status:', error)
      throw new Error('Failed to update attendee status')
    }
  }

  static async markAttendance(eventId: string, userId: string, joined: boolean = true) {
    try {
      const updateData: any = {
        attendanceMarked: true
      }

      if (joined) {
        updateData.joinedAt = new Date()
      } else {
        updateData.leftAt = new Date()
      }

      const attendee = await prisma.eventAttendee.update({
        where: {
          eventId_userId: {
            eventId,
            userId
          }
        },
        data: updateData
      })

      return attendee

    } catch (error) {
      console.error('Error marking attendance:', error)
      throw new Error('Failed to mark attendance')
    }
  }

  private static async createRecurringEvents(parentEventId: string, options: RecurrenceOptions) {
    try {
      const parentEvent = await prisma.calendarEvent.findUnique({
        where: { id: parentEventId }
      })

      if (!parentEvent) {
        throw new Error('Parent event not found')
      }

      const recurringEvents = []
      const { type, endDate, count = 10, interval = 1 } = options
      
      let currentDate = new Date(parentEvent.startTime)
      const duration = parentEvent.endTime.getTime() - parentEvent.startTime.getTime()
      let eventCount = 0

      while (eventCount < count) {
        // Calculate next occurrence
        switch (type) {
          case RecurrenceType.DAILY:
            currentDate.setDate(currentDate.getDate() + interval)
            break
          case RecurrenceType.WEEKLY:
            currentDate.setDate(currentDate.getDate() + (7 * interval))
            break
          case RecurrenceType.MONTHLY:
            currentDate.setMonth(currentDate.getMonth() + interval)
            break
          case RecurrenceType.YEARLY:
            currentDate.setFullYear(currentDate.getFullYear() + interval)
            break
        }

        // Check if we've exceeded the end date
        if (endDate && currentDate > endDate) {
          break
        }

        const nextStartTime = new Date(currentDate)
        const nextEndTime = new Date(currentDate.getTime() + duration)

        recurringEvents.push({
          title: parentEvent.title,
          description: parentEvent.description,
          location: parentEvent.location,
          startTime: nextStartTime,
          endTime: nextEndTime,
          allDay: parentEvent.allDay,
          type: parentEvent.type,
          status: parentEvent.status,
          createdById: parentEvent.createdById,
          organizationId: parentEvent.organizationId,
          courseId: parentEvent.courseId,
          parentEventId: parentEventId,
          isRecurring: false, // Child events are not themselves recurring
          recurrenceType: RecurrenceType.NONE
        })

        eventCount++
      }

      if (recurringEvents.length > 0) {
        await prisma.calendarEvent.createMany({
          data: recurringEvents
        })

        // Copy attendees to recurring events
        const childEvents = await prisma.calendarEvent.findMany({
          where: { parentEventId },
          select: { id: true }
        })

        const parentAttendees = await prisma.eventAttendee.findMany({
          where: { eventId: parentEventId },
          select: { userId: true }
        })

        if (parentAttendees.length > 0) {
          const attendeeData = []
          for (const childEvent of childEvents) {
            for (const attendee of parentAttendees) {
              attendeeData.push({
                eventId: childEvent.id,
                userId: attendee.userId,
                status: 'pending'
              })
            }
          }

          await prisma.eventAttendee.createMany({
            data: attendeeData
          })
        }
      }

      return recurringEvents.length

    } catch (error) {
      console.error('Error creating recurring events:', error)
      throw new Error('Failed to create recurring events')
    }
  }

  static async getUpcomingEvents(userId: string, days: number = 7) {
    try {
      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(startDate.getDate() + days)

      return await this.getUserEvents(userId, {
        startDate,
        endDate,
        status: EventStatus.SCHEDULED
      })

    } catch (error) {
      console.error('Error getting upcoming events:', error)
      throw new Error('Failed to get upcoming events')
    }
  }

  static async searchEvents(userId: string, query: string, filters: EventFilters = {}) {
    try {
      const baseFilters = await this.getUserEvents(userId, filters)
      
      // Simple text search
      const searchResults = baseFilters.filter(event => {
        const searchText = `${event.title} ${event.description || ''} ${event.location || ''}`.toLowerCase()
        return searchText.includes(query.toLowerCase())
      })

      return searchResults

    } catch (error) {
      console.error('Error searching events:', error)
      throw new Error('Failed to search events')
    }
  }
}