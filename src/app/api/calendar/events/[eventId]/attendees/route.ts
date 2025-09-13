import { NextRequest, NextResponse } from 'next/server'
import { SessionManager } from '@/lib/auth/session'
import { CalendarService } from '@/lib/calendar/calendar-service'
import { z } from 'zod'

const AddAttendeesSchema = z.object({
  attendeeIds: z.array(z.string().cuid()).min(1, 'At least one attendee ID is required')
})

const UpdateAttendeeStatusSchema = z.object({
  status: z.enum(['pending', 'accepted', 'declined', 'maybe'])
})

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await SessionManager.requireAuth()
    const { eventId } = params
    const body = await request.json()
    const { attendeeIds } = AddAttendeesSchema.parse(body)

    // Check if user is the event creator
    const event = await CalendarService.getEventById(eventId)
    
    if (event.createdById !== session.user.id) {
      return NextResponse.json({ 
        error: 'Only event creators can add attendees' 
      }, { status: 403 })
    }

    await CalendarService.addAttendees(eventId, attendeeIds)

    return NextResponse.json({
      success: true,
      message: 'Attendees added successfully'
    })

  } catch (error) {
    console.error('Error adding attendees:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to add attendees' 
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await SessionManager.requireAuth()
    const { eventId } = params
    const body = await request.json()
    const { status } = UpdateAttendeeStatusSchema.parse(body)

    // Update the current user's RSVP status
    await CalendarService.updateAttendeeStatus(eventId, session.user.id, status)

    return NextResponse.json({
      success: true,
      message: 'RSVP status updated successfully'
    })

  } catch (error) {
    console.error('Error updating RSVP status:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to update RSVP status' 
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await SessionManager.requireAuth()
    const { eventId } = params
    const searchParams = request.nextUrl.searchParams
    const attendeeId = searchParams.get('attendeeId')

    if (!attendeeId) {
      return NextResponse.json({ 
        error: 'Attendee ID is required' 
      }, { status: 400 })
    }

    // Check if user is the event creator or removing themselves
    const event = await CalendarService.getEventById(eventId)
    
    if (event.createdById !== session.user.id && attendeeId !== session.user.id) {
      return NextResponse.json({ 
        error: 'Permission denied' 
      }, { status: 403 })
    }

    await CalendarService.removeAttendee(eventId, attendeeId)

    return NextResponse.json({
      success: true,
      message: 'Attendee removed successfully'
    })

  } catch (error) {
    console.error('Error removing attendee:', error)
    return NextResponse.json({ 
      error: 'Failed to remove attendee' 
    }, { status: 500 })
  }
}