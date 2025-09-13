import { NextRequest, NextResponse } from 'next/server'
import { SessionManager } from '@/lib/auth/session'
import { PermissionManager } from '@/lib/auth/permissions'
import { PermissionType, EventType, EventStatus, RecurrenceType } from '@prisma/client'
import { CalendarService } from '@/lib/calendar/calendar-service'
import { ZoomService } from '@/lib/integrations/zoom-service'
import { z } from 'zod'

const CreateEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  location: z.string().optional(),
  startTime: z.string().transform(str => new Date(str)),
  endTime: z.string().transform(str => new Date(str)),
  allDay: z.boolean().default(false),
  type: z.nativeEnum(EventType).default(EventType.MEETING),
  courseId: z.string().cuid().optional(),
  organizationId: z.string().cuid().optional(),
  attendeeIds: z.array(z.string().cuid()).default([]),
  isRecurring: z.boolean().default(false),
  recurrenceType: z.nativeEnum(RecurrenceType).optional(),
  recurrenceEnd: z.string().transform(str => new Date(str)).optional(),
  zoomMeeting: z.boolean().default(false)
})

const UpdateEventSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  startTime: z.string().transform(str => new Date(str)).optional(),
  endTime: z.string().transform(str => new Date(str)).optional(),
  allDay: z.boolean().optional(),
  type: z.nativeEnum(EventType).optional(),
  status: z.nativeEnum(EventStatus).optional()
})

const EventFiltersSchema = z.object({
  startDate: z.string().transform(str => new Date(str)).optional(),
  endDate: z.string().transform(str => new Date(str)).optional(),
  courseId: z.string().cuid().optional(),
  organizationId: z.string().cuid().optional(),
  type: z.nativeEnum(EventType).optional(),
  status: z.nativeEnum(EventStatus).optional(),
  createdById: z.string().cuid().optional(),
  attendeeId: z.string().cuid().optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await SessionManager.requireAuth()
    const body = await request.json()
    const eventData = CreateEventSchema.parse(body)

    // Check calendar management permissions
    const canManageCalendar = PermissionManager.hasPermission(
      session.permissions, 
      PermissionType.CALENDAR_MANAGE
    ) || session.user.role === 'ADMIN' || session.user.role === 'INSTRUCTOR'

    if (!canManageCalendar) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to create calendar events' 
      }, { status: 403 })
    }

    // Validate course access if courseId is provided
    if (eventData.courseId) {
      const canAccessCourse = PermissionManager.canAccessCourse(
        session.permissions,
        eventData.courseId,
        'edit'
      )
      
      if (!canAccessCourse) {
        return NextResponse.json({ 
          error: 'Access denied to the specified course' 
        }, { status: 403 })
      }
    }

    // Create the event
    const event = await CalendarService.createEvent(session.user.id, eventData)

    // Create Zoom meeting if requested
    if (eventData.zoomMeeting) {
      try {
        const zoomDetails = await ZoomService.createMeetingForEvent(event.id, {
          title: eventData.title,
          description: eventData.description,
          startTime: eventData.startTime,
          endTime: eventData.endTime
        })

        // Return event with Zoom details
        return NextResponse.json({
          success: true,
          event: {
            ...event,
            zoomJoinUrl: zoomDetails.joinUrl,
            zoomStartUrl: zoomDetails.startUrl,
            zoomMeetingId: zoomDetails.meetingId,
            zoomPassword: zoomDetails.password
          }
        })
      } catch (zoomError) {
        console.error('Zoom meeting creation failed:', zoomError)
        // Event was created but Zoom failed - return success with warning
        return NextResponse.json({
          success: true,
          event,
          warning: 'Event created but Zoom meeting creation failed'
        })
      }
    }

    return NextResponse.json({
      success: true,
      event
    })

  } catch (error) {
    console.error('Calendar event creation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to create calendar event' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await SessionManager.requireAuth()
    const searchParams = request.nextUrl.searchParams
    
    // Check calendar view permissions
    const canViewCalendar = PermissionManager.hasPermission(
      session.permissions, 
      PermissionType.CALENDAR_VIEW
    ) || PermissionManager.hasPermission(
      session.permissions, 
      PermissionType.CALENDAR_MANAGE
    )

    if (!canViewCalendar) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to view calendar events' 
      }, { status: 403 })
    }

    // Parse filters from query parameters
    const filters: any = {}
    
    if (searchParams.get('startDate')) {
      filters.startDate = searchParams.get('startDate')
    }
    if (searchParams.get('endDate')) {
      filters.endDate = searchParams.get('endDate')
    }
    if (searchParams.get('courseId')) {
      filters.courseId = searchParams.get('courseId')
    }
    if (searchParams.get('organizationId')) {
      filters.organizationId = searchParams.get('organizationId')
    }
    if (searchParams.get('type')) {
      filters.type = searchParams.get('type')
    }
    if (searchParams.get('status')) {
      filters.status = searchParams.get('status')
    }
    if (searchParams.get('createdById')) {
      filters.createdById = searchParams.get('createdById')
    }
    if (searchParams.get('attendeeId')) {
      filters.attendeeId = searchParams.get('attendeeId')
    }

    const validatedFilters = EventFiltersSchema.parse(filters)
    
    const events = await CalendarService.getUserEvents(session.user.id, validatedFilters)

    return NextResponse.json({
      success: true,
      events
    })

  } catch (error) {
    console.error('Calendar events fetch error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid filter parameters', 
        details: error.issues 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch calendar events' 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await SessionManager.requireAuth()
    const body = await request.json()
    const { eventId, ...updateData } = body
    
    if (!eventId) {
      return NextResponse.json({ 
        error: 'Event ID is required' 
      }, { status: 400 })
    }

    const validatedData = UpdateEventSchema.parse(updateData)

    // Update the event
    const updatedEvent = await CalendarService.updateEvent(eventId, session.user.id, validatedData)

    // Update Zoom meeting if event has one and relevant fields changed
    if (updatedEvent.zoomMeetingId && (
      validatedData.title || 
      validatedData.description || 
      validatedData.startTime || 
      validatedData.endTime
    )) {
      try {
        await ZoomService.updateMeetingForEvent(eventId, {
          title: validatedData.title,
          description: validatedData.description,
          startTime: validatedData.startTime,
          endTime: validatedData.endTime
        })
      } catch (zoomError) {
        console.error('Zoom meeting update failed:', zoomError)
        // Continue with event update even if Zoom fails
      }
    }

    return NextResponse.json({
      success: true,
      event: updatedEvent
    })

  } catch (error) {
    console.error('Calendar event update error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to update calendar event' 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await SessionManager.requireAuth()
    const searchParams = request.nextUrl.searchParams
    const eventId = searchParams.get('eventId')
    const deleteRecurring = searchParams.get('deleteRecurring') === 'true'
    
    if (!eventId) {
      return NextResponse.json({ 
        error: 'Event ID is required' 
      }, { status: 400 })
    }

    // Delete Zoom meeting if exists
    try {
      await ZoomService.deleteMeetingForEvent(eventId)
    } catch (zoomError) {
      console.error('Zoom meeting deletion failed:', zoomError)
      // Continue with event deletion even if Zoom fails
    }

    // Delete the event
    const result = await CalendarService.deleteEvent(eventId, session.user.id, deleteRecurring)

    return NextResponse.json({
      success: true,
      message: deleteRecurring ? 'Event series deleted successfully' : 'Event deleted successfully'
    })

  } catch (error) {
    console.error('Calendar event deletion error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete calendar event' 
    }, { status: 500 })
  }
}