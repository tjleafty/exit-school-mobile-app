import { NextRequest, NextResponse } from 'next/server'
import { SessionManager } from '@/lib/auth/session'
import { CalendarService } from '@/lib/calendar/calendar-service'
import { EventType, EventStatus } from '@prisma/client'
import { z } from 'zod'

const SearchFiltersSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  startDate: z.string().transform(str => new Date(str)).optional(),
  endDate: z.string().transform(str => new Date(str)).optional(),
  courseId: z.string().cuid().optional(),
  type: z.nativeEnum(EventType).optional(),
  status: z.nativeEnum(EventStatus).optional()
})

export async function GET(request: NextRequest) {
  try {
    const session = await SessionManager.requireAuth()
    const searchParams = request.nextUrl.searchParams
    
    const query = searchParams.get('query')
    if (!query) {
      return NextResponse.json({ 
        error: 'Search query is required' 
      }, { status: 400 })
    }

    // Parse filters
    const filters: any = { query }
    
    if (searchParams.get('startDate')) {
      filters.startDate = searchParams.get('startDate')
    }
    if (searchParams.get('endDate')) {
      filters.endDate = searchParams.get('endDate')
    }
    if (searchParams.get('courseId')) {
      filters.courseId = searchParams.get('courseId')
    }
    if (searchParams.get('type')) {
      filters.type = searchParams.get('type')
    }
    if (searchParams.get('status')) {
      filters.status = searchParams.get('status')
    }

    const { query: searchQuery, ...searchFilters } = SearchFiltersSchema.parse(filters)

    const events = await CalendarService.searchEvents(session.user.id, searchQuery, searchFilters)

    return NextResponse.json({
      success: true,
      events,
      count: events.length,
      query: searchQuery
    })

  } catch (error) {
    console.error('Error searching events:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid search parameters', 
        details: error.issues 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to search events' 
    }, { status: 500 })
  }
}