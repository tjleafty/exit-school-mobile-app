import { NextRequest, NextResponse } from 'next/server'
import { CoursesService } from '@/lib/db/courses'

export async function GET(request: NextRequest) {
  try {
    const [tags, instructors] = await Promise.all([
      CoursesService.getAvailableTags(),
      CoursesService.getInstructors()
    ])

    return NextResponse.json({
      tags,
      instructors,
      categories: [
        'Beginner',
        'Intermediate', 
        'Advanced',
        'Finance',
        'Legal',
        'Operations',
        'Due Diligence',
        'Valuation',
        'Negotiation'
      ]
    })

  } catch (error) {
    console.error('Course filters API error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch filter options' 
    }, { status: 500 })
  }
}