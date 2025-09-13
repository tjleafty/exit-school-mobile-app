import { NextRequest, NextResponse } from 'next/server'
import { SessionManager } from '@/lib/auth/session'
import { CalendarService } from '@/lib/calendar/calendar-service'

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await SessionManager.requireAuth()
    const { eventId } = params

    const event = await CalendarService.getEventById(eventId)

    // Check if user has access to this event
    const hasAccess = event.createdById === session.user.id ||
                     event.attendees.some(attendee => attendee.userId === session.user.id)

    if (!hasAccess) {
      return NextResponse.json({ 
        error: 'Access denied to this event' 
      }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      event
    })

  } catch (error) {
    console.error('Error fetching event:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch event' 
    }, { status: 500 })
  }
}