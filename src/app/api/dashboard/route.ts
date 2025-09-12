import { NextRequest, NextResponse } from 'next/server'
import { SessionManager } from '@/lib/auth/session'
import { DashboardService } from '@/lib/db/dashboard'

export async function GET(request: NextRequest) {
  try {
    const session = await SessionManager.getSession()

    if (!session) {
      return NextResponse.json({ 
        error: 'Not authenticated' 
      }, { status: 401 })
    }

    // Get dashboard data
    const [stats, recentActivity, continueLearning, recommendedCourses] = await Promise.all([
      DashboardService.getDashboardStats(session.user.id),
      DashboardService.getRecentActivity(session.user.id),
      DashboardService.getContinueLearning(session.user.id),
      DashboardService.getRecommendedCourses(session.user.id)
    ])

    return NextResponse.json({
      user: {
        name: session.user.name,
        role: session.user.role,
        email: session.user.email
      },
      stats,
      recentActivity,
      continueLearning,
      recommendedCourses
    })

  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch dashboard data' 
    }, { status: 500 })
  }
}