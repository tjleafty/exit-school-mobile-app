import { NextRequest, NextResponse } from 'next/server'
import { SessionManager } from '@/lib/auth/session'
import { CoursesService } from '@/lib/db/courses'
import { CourseStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Get optional user session (for enrollment status)
    const session = await SessionManager.getSession().catch(() => null)
    const userId = session?.user.id

    // Parse filters from query params
    const search = searchParams.get('search') || undefined
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || undefined
    const statusParam = searchParams.get('status')
    const instructor = searchParams.get('instructor') || undefined

    let status: CourseStatus[] | undefined
    if (statusParam) {
      const statusValues = statusParam.split(',')
      status = statusValues.filter(s => 
        Object.values(CourseStatus).includes(s as CourseStatus)
      ) as CourseStatus[]
    }

    const filters = {
      search,
      tags,
      status,
      instructor
    }

    const courses = await CoursesService.getCourses(userId, filters)

    return NextResponse.json({
      courses,
      totalCount: courses.length
    })

  } catch (error) {
    console.error('Courses API error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch courses' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await SessionManager.getSession()

    if (!session) {
      return NextResponse.json({ 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    const body = await request.json()
    const { courseId, action } = body

    if (action === 'enroll') {
      if (!courseId) {
        return NextResponse.json({ 
          error: 'Course ID is required' 
        }, { status: 400 })
      }

      const enrollment = await CoursesService.enrollInCourse(session.user.id, courseId)

      return NextResponse.json({
        success: true,
        enrollment
      })
    }

    return NextResponse.json({ 
      error: 'Invalid action' 
    }, { status: 400 })

  } catch (error) {
    console.error('Courses POST API error:', error)
    
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: error.message 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to process request' 
    }, { status: 500 })
  }
}