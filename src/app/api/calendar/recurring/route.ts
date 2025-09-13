import { NextRequest, NextResponse } from 'next/server'
import { SessionManager } from '@/lib/auth/session'
import { CalendarService } from '@/lib/calendar/calendar-service'
import { PrismaClient, RecurrenceType, EventType } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

const CreateRecurringEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  location: z.string().optional(),
  startTime: z.string().transform(str => new Date(str)),
  endTime: z.string().transform(str => new Date(str)),
  allDay: z.boolean().default(false),
  type: z.nativeEnum(EventType).default(EventType.MEETING),
  courseId: z.string().cuid().optional(),
  attendeeIds: z.array(z.string().cuid()).default([]),
  recurrenceType: z.nativeEnum(RecurrenceType),
  recurrenceEnd: z.string().transform(str => new Date(str)).optional(),
  recurrenceCount: z.number().int().positive().max(100).optional(),
  interval: z.number().int().positive().max(30).default(1),
  zoomMeeting: z.boolean().default(false)
})

const UpdateRecurringEventSchema = z.object({
  updateType: z.enum(['single', 'series']),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  startTime: z.string().transform(str => new Date(str)).optional(),
  endTime: z.string().transform(str => new Date(str)).optional(),
  allDay: z.boolean().optional(),
  type: z.nativeEnum(EventType).optional()
})

const DeleteRecurringEventSchema = z.object({
  deleteType: z.enum(['single', 'series', 'following'])
})

export async function POST(request: NextRequest) {
  try {
    const session = await SessionManager.requireAuth()
    const body = await request.json()
    const eventData = CreateRecurringEventSchema.parse(body)

    // Create the recurring event series
    const event = await CalendarService.createEvent(session.user.id, {
      ...eventData,
      isRecurring: true
    })

    return NextResponse.json({
      success: true,
      event,
      message: 'Recurring event series created successfully'
    })

  } catch (error) {
    console.error('Recurring event creation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to create recurring event' 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await SessionManager.requireAuth()
    const body = await request.json()
    const { eventId, updateType, ...updateData } = body
    
    if (!eventId) {
      return NextResponse.json({ 
        error: 'Event ID is required' 
      }, { status: 400 })
    }

    const validatedData = UpdateRecurringEventSchema.parse({ updateType, ...updateData })

    // Get the event to check if it's part of a recurring series
    const event = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
      include: {
        parentEvent: true,
        childEvents: true
      }
    })

    if (!event) {
      return NextResponse.json({ 
        error: 'Event not found' 
      }, { status: 404 })
    }

    // Check permissions
    if (event.createdById !== session.user.id) {
      return NextResponse.json({ 
        error: 'Permission denied' 
      }, { status: 403 })
    }

    if (validatedData.updateType === 'single') {
      // Update only this event
      await CalendarService.updateEvent(eventId, session.user.id, updateData)
    } else if (validatedData.updateType === 'series') {
      // Update the parent event and all children
      const parentId = event.parentEventId || eventId
      
      // Update parent event
      await CalendarService.updateEvent(parentId, session.user.id, updateData)
      
      // Update all child events
      const childEvents = await prisma.calendarEvent.findMany({
        where: { parentEventId: parentId }
      })

      for (const childEvent of childEvents) {
        await CalendarService.updateEvent(childEvent.id, session.user.id, updateData)
      }
    }

    return NextResponse.json({
      success: true,
      message: `${validatedData.updateType === 'single' ? 'Event' : 'Event series'} updated successfully`
    })

  } catch (error) {
    console.error('Recurring event update error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to update recurring event' 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await SessionManager.requireAuth()
    const searchParams = request.nextUrl.searchParams
    const eventId = searchParams.get('eventId')
    const deleteType = searchParams.get('deleteType') as 'single' | 'series' | 'following'
    
    if (!eventId) {
      return NextResponse.json({ 
        error: 'Event ID is required' 
      }, { status: 400 })
    }

    const validatedData = DeleteRecurringEventSchema.parse({ deleteType })

    // Get the event
    const event = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
      include: {
        parentEvent: true,
        childEvents: true
      }
    })

    if (!event) {
      return NextResponse.json({ 
        error: 'Event not found' 
      }, { status: 404 })
    }

    // Check permissions
    if (event.createdById !== session.user.id) {
      return NextResponse.json({ 
        error: 'Permission denied' 
      }, { status: 403 })
    }

    switch (validatedData.deleteType) {
      case 'single':
        // Delete only this event
        await CalendarService.deleteEvent(eventId, session.user.id, false)
        break

      case 'series':
        // Delete the entire series
        const parentId = event.parentEventId || eventId
        await CalendarService.deleteEvent(parentId, session.user.id, true)
        break

      case 'following':
        // Delete this event and all following events in the series
        if (event.parentEventId) {
          // This is a child event - delete it and all later siblings
          const laterEvents = await prisma.calendarEvent.findMany({
            where: {
              parentEventId: event.parentEventId,
              startTime: { gte: event.startTime }
            }
          })

          for (const laterEvent of laterEvents) {
            await CalendarService.deleteEvent(laterEvent.id, session.user.id, false)
          }
        } else {
          // This is the parent event - delete all child events
          await CalendarService.deleteEvent(eventId, session.user.id, true)
        }
        break
    }

    return NextResponse.json({
      success: true,
      message: `Event${validatedData.deleteType !== 'single' ? 's' : ''} deleted successfully`
    })

  } catch (error) {
    console.error('Recurring event deletion error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to delete recurring event' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await SessionManager.requireAuth()
    const searchParams = request.nextUrl.searchParams
    const parentEventId = searchParams.get('parentEventId')
    
    if (!parentEventId) {
      return NextResponse.json({ 
        error: 'Parent event ID is required' 
      }, { status: 400 })
    }

    // Get the parent event and all its occurrences
    const parentEvent = await prisma.calendarEvent.findUnique({
      where: { id: parentEventId },
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
        childEvents: {
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
            }
          },
          orderBy: { startTime: 'asc' }
        }
      }
    })

    if (!parentEvent) {
      return NextResponse.json({ 
        error: 'Recurring event series not found' 
      }, { status: 404 })
    }

    // Check access permissions
    const hasAccess = parentEvent.createdById === session.user.id ||
                     parentEvent.attendees.some(attendee => attendee.userId === session.user.id)

    if (!hasAccess) {
      return NextResponse.json({ 
        error: 'Access denied to this event series' 
      }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      parentEvent,
      occurrences: parentEvent.childEvents,
      totalOccurrences: parentEvent.childEvents.length
    })

  } catch (error) {
    console.error('Error fetching recurring event series:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch recurring event series' 
    }, { status: 500 })
  }
}