import { NextRequest, NextResponse } from 'next/server'
import { SessionManager } from '@/lib/auth/session'
import { CalendarService } from '@/lib/calendar/calendar-service'

export async function GET(request: NextRequest) {
  try {
    const session = await SessionManager.requireAuth()
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '7')

    const upcomingEvents = await CalendarService.getUpcomingEvents(session.user.id, days)

    return NextResponse.json({
      success: true,
      events: upcomingEvents,
      count: upcomingEvents.length
    })

  } catch (error) {
    console.error('Error fetching upcoming events:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch upcoming events' 
    }, { status: 500 })
  }
}