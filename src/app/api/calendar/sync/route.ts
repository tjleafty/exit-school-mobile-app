import { NextRequest, NextResponse } from 'next/server'
import { SessionManager } from '@/lib/auth/session'
import { CalendarSyncService } from '@/lib/integrations/calendar-sync-service'
import { CalendarProvider } from '@prisma/client'
import { z } from 'zod'

const SyncRequestSchema = z.object({
  provider: z.nativeEnum(CalendarProvider),
  direction: z.enum(['import', 'export', 'both']).default('both')
})

const SetupIntegrationSchema = z.object({
  provider: z.nativeEnum(CalendarProvider),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  tokenExpiry: z.string().transform(str => new Date(str)).optional(),
  providerUserId: z.string().optional(),
  calendarId: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await SessionManager.requireAuth()
    const body = await request.json()
    const action = body.action

    switch (action) {
      case 'sync': {
        const { provider, direction } = SyncRequestSchema.parse(body)
        
        switch (provider) {
          case CalendarProvider.GOOGLE:
            await CalendarSyncService.syncWithGoogleCalendar(session.user.id, direction)
            break
          case CalendarProvider.OUTLOOK:
            await CalendarSyncService.syncWithOutlook(session.user.id, direction)
            break
          default:
            return NextResponse.json({ 
              error: 'Unsupported calendar provider' 
            }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          message: 'Calendar sync completed successfully'
        })
      }

      case 'setup': {
        const integrationData = SetupIntegrationSchema.parse(body)
        
        const integration = await CalendarSyncService.createIntegration(
          session.user.id,
          integrationData.provider,
          integrationData.accessToken,
          integrationData.refreshToken,
          integrationData.tokenExpiry,
          integrationData.providerUserId,
          integrationData.calendarId
        )

        return NextResponse.json({
          success: true,
          integration: {
            id: integration.id,
            provider: integration.provider,
            syncEnabled: integration.syncEnabled
          }
        })
      }

      default:
        return NextResponse.json({ 
          error: 'Invalid action' 
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Calendar sync API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to process calendar sync request' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await SessionManager.requireAuth()
    
    const integrations = await CalendarSyncService.getUserIntegrations(session.user.id)

    return NextResponse.json({
      success: true,
      integrations
    })

  } catch (error) {
    console.error('Error fetching calendar integrations:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch calendar integrations' 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await SessionManager.requireAuth()
    const searchParams = request.nextUrl.searchParams
    const provider = searchParams.get('provider') as CalendarProvider
    
    if (!provider || !Object.values(CalendarProvider).includes(provider)) {
      return NextResponse.json({ 
        error: 'Valid provider is required' 
      }, { status: 400 })
    }

    await CalendarSyncService.removeIntegration(session.user.id, provider)

    return NextResponse.json({
      success: true,
      message: 'Calendar integration removed successfully'
    })

  } catch (error) {
    console.error('Error removing calendar integration:', error)
    return NextResponse.json({ 
      error: 'Failed to remove calendar integration' 
    }, { status: 500 })
  }
}