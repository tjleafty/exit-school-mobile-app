import { PrismaClient, CalendarProvider } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

// Google Calendar Integration
interface GoogleCalendarEvent {
  id: string
  summary: string
  description?: string
  location?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  attendees?: {
    email: string
    displayName?: string
    responseStatus?: string
  }[]
  conferenceData?: {
    entryPoints?: {
      entryPointType: string
      uri: string
      label?: string
    }[]
  }
  recurrence?: string[]
}

// Outlook/Microsoft Graph Integration
interface OutlookEvent {
  id: string
  subject: string
  body?: {
    content: string
    contentType: string
  }
  location?: {
    displayName: string
  }
  start: {
    dateTime: string
    timeZone: string
  }
  end: {
    dateTime: string
    timeZone: string
  }
  attendees?: {
    emailAddress: {
      address: string
      name?: string
    }
    status: {
      response: string
    }
  }[]
  onlineMeeting?: {
    joinUrl: string
  }
  recurrence?: any
}

// Apple/CalDAV Integration (simplified)
interface CalDAVEvent {
  uid: string
  summary: string
  description?: string
  location?: string
  dtstart: string
  dtend: string
  attendees?: string[]
  rrule?: string
}

export class CalendarSyncService {
  // Google Calendar Integration
  static async syncWithGoogleCalendar(userId: string, direction: 'import' | 'export' | 'both' = 'both') {
    try {
      const integration = await prisma.calendarIntegration.findUnique({
        where: {
          userId_provider: {
            userId,
            provider: CalendarProvider.GOOGLE
          }
        }
      })

      if (!integration || !integration.syncEnabled) {
        throw new Error('Google Calendar integration not found or disabled')
      }

      // Check if token needs refresh
      if (integration.tokenExpiry && new Date() >= integration.tokenExpiry) {
        await this.refreshGoogleToken(integration.id)
      }

      if (direction === 'import' || direction === 'both') {
        await this.importFromGoogleCalendar(userId, integration.accessToken)
      }

      if (direction === 'export' || direction === 'both') {
        await this.exportToGoogleCalendar(userId, integration.accessToken)
      }

      // Update last sync time
      await prisma.calendarIntegration.update({
        where: { id: integration.id },
        data: { lastSyncAt: new Date() }
      })

    } catch (error) {
      console.error('Google Calendar sync error:', error)
      throw new Error('Failed to sync with Google Calendar')
    }
  }

  private static async importFromGoogleCalendar(userId: string, accessToken: string) {
    try {
      const timeMin = new Date()
      timeMin.setMonth(timeMin.getMonth() - 1) // Import events from last month
      const timeMax = new Date()
      timeMax.setMonth(timeMax.getMonth() + 6) // Import events up to 6 months ahead

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.statusText}`)
      }

      const data = await response.json()
      const events: GoogleCalendarEvent[] = data.items || []

      for (const googleEvent of events) {
        // Check if event already exists
        const existingEvent = await prisma.calendarEvent.findFirst({
          where: {
            externalEventId: googleEvent.id,
            syncedWith: { has: CalendarProvider.GOOGLE }
          }
        })

        if (existingEvent) {
          // Update existing event
          await this.updateEventFromGoogle(existingEvent.id, googleEvent)
        } else {
          // Create new event
          await this.createEventFromGoogle(userId, googleEvent)
        }
      }
    } catch (error) {
      console.error('Error importing from Google Calendar:', error)
      throw error
    }
  }

  private static async exportToGoogleCalendar(userId: string, accessToken: string) {
    try {
      // Get events that need to be exported
      const events = await prisma.calendarEvent.findMany({
        where: {
          createdById: userId,
          NOT: {
            syncedWith: { has: CalendarProvider.GOOGLE }
          }
        }
      })

      for (const event of events) {
        const googleEvent = this.convertToGoogleEvent(event)
        
        const response = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(googleEvent)
          }
        )

        if (response.ok) {
          const createdEvent = await response.json()
          
          // Update our event with Google Calendar ID
          await prisma.calendarEvent.update({
            where: { id: event.id },
            data: {
              externalEventId: createdEvent.id,
              syncedWith: [...(event.syncedWith || []), CalendarProvider.GOOGLE]
            }
          })
        }
      }
    } catch (error) {
      console.error('Error exporting to Google Calendar:', error)
      throw error
    }
  }

  private static convertToGoogleEvent(event: any): GoogleCalendarEvent {
    const googleEvent: GoogleCalendarEvent = {
      id: event.externalEventId || undefined,
      summary: event.title,
      description: event.description,
      location: event.location,
      start: event.allDay 
        ? { date: event.startTime.toISOString().split('T')[0] }
        : { dateTime: event.startTime.toISOString() },
      end: event.allDay
        ? { date: event.endTime.toISOString().split('T')[0] }
        : { dateTime: event.endTime.toISOString() }
    }

    return googleEvent
  }

  private static async createEventFromGoogle(userId: string, googleEvent: GoogleCalendarEvent) {
    try {
      const startTime = googleEvent.start.dateTime 
        ? new Date(googleEvent.start.dateTime)
        : new Date(googleEvent.start.date + 'T00:00:00')
      
      const endTime = googleEvent.end.dateTime
        ? new Date(googleEvent.end.dateTime)
        : new Date(googleEvent.end.date + 'T23:59:59')

      await prisma.calendarEvent.create({
        data: {
          title: googleEvent.summary,
          description: googleEvent.description,
          location: googleEvent.location,
          startTime,
          endTime,
          allDay: !googleEvent.start.dateTime,
          type: 'MEETING',
          createdById: userId,
          externalEventId: googleEvent.id,
          syncedWith: [CalendarProvider.GOOGLE]
        }
      })
    } catch (error) {
      console.error('Error creating event from Google:', error)
    }
  }

  private static async updateEventFromGoogle(eventId: string, googleEvent: GoogleCalendarEvent) {
    try {
      const startTime = googleEvent.start.dateTime 
        ? new Date(googleEvent.start.dateTime)
        : new Date(googleEvent.start.date + 'T00:00:00')
      
      const endTime = googleEvent.end.dateTime
        ? new Date(googleEvent.end.dateTime)
        : new Date(googleEvent.end.date + 'T23:59:59')

      await prisma.calendarEvent.update({
        where: { id: eventId },
        data: {
          title: googleEvent.summary,
          description: googleEvent.description,
          location: googleEvent.location,
          startTime,
          endTime,
          allDay: !googleEvent.start.dateTime
        }
      })
    } catch (error) {
      console.error('Error updating event from Google:', error)
    }
  }

  private static async refreshGoogleToken(integrationId: string) {
    try {
      const integration = await prisma.calendarIntegration.findUnique({
        where: { id: integrationId }
      })

      if (!integration?.refreshToken) {
        throw new Error('No refresh token available')
      }

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: integration.refreshToken,
          grant_type: 'refresh_token'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to refresh Google token')
      }

      const data = await response.json()
      
      const expiryDate = new Date()
      expiryDate.setSeconds(expiryDate.getSeconds() + data.expires_in)

      await prisma.calendarIntegration.update({
        where: { id: integrationId },
        data: {
          accessToken: data.access_token,
          tokenExpiry: expiryDate
        }
      })
    } catch (error) {
      console.error('Error refreshing Google token:', error)
      throw error
    }
  }

  // Microsoft Outlook/Graph Integration
  static async syncWithOutlook(userId: string, direction: 'import' | 'export' | 'both' = 'both') {
    try {
      const integration = await prisma.calendarIntegration.findUnique({
        where: {
          userId_provider: {
            userId,
            provider: CalendarProvider.OUTLOOK
          }
        }
      })

      if (!integration || !integration.syncEnabled) {
        throw new Error('Outlook integration not found or disabled')
      }

      // Check if token needs refresh
      if (integration.tokenExpiry && new Date() >= integration.tokenExpiry) {
        await this.refreshOutlookToken(integration.id)
      }

      if (direction === 'import' || direction === 'both') {
        await this.importFromOutlook(userId, integration.accessToken)
      }

      if (direction === 'export' || direction === 'both') {
        await this.exportToOutlook(userId, integration.accessToken)
      }

      // Update last sync time
      await prisma.calendarIntegration.update({
        where: { id: integration.id },
        data: { lastSyncAt: new Date() }
      })

    } catch (error) {
      console.error('Outlook sync error:', error)
      throw new Error('Failed to sync with Outlook')
    }
  }

  private static async importFromOutlook(userId: string, accessToken: string) {
    try {
      const startTime = new Date()
      startTime.setMonth(startTime.getMonth() - 1)
      const endTime = new Date()
      endTime.setMonth(endTime.getMonth() + 6)

      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/calendar/events?` +
        `$filter=start/dateTime ge '${startTime.toISOString()}' and start/dateTime le '${endTime.toISOString()}'&` +
        `$orderby=start/dateTime`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Microsoft Graph API error: ${response.statusText}`)
      }

      const data = await response.json()
      const events: OutlookEvent[] = data.value || []

      for (const outlookEvent of events) {
        const existingEvent = await prisma.calendarEvent.findFirst({
          where: {
            externalEventId: outlookEvent.id,
            syncedWith: { has: CalendarProvider.OUTLOOK }
          }
        })

        if (existingEvent) {
          await this.updateEventFromOutlook(existingEvent.id, outlookEvent)
        } else {
          await this.createEventFromOutlook(userId, outlookEvent)
        }
      }
    } catch (error) {
      console.error('Error importing from Outlook:', error)
      throw error
    }
  }

  private static async exportToOutlook(userId: string, accessToken: string) {
    try {
      const events = await prisma.calendarEvent.findMany({
        where: {
          createdById: userId,
          NOT: {
            syncedWith: { has: CalendarProvider.OUTLOOK }
          }
        }
      })

      for (const event of events) {
        const outlookEvent = this.convertToOutlookEvent(event)
        
        const response = await fetch(
          'https://graph.microsoft.com/v1.0/me/calendar/events',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(outlookEvent)
          }
        )

        if (response.ok) {
          const createdEvent = await response.json()
          
          await prisma.calendarEvent.update({
            where: { id: event.id },
            data: {
              externalEventId: createdEvent.id,
              syncedWith: [...(event.syncedWith || []), CalendarProvider.OUTLOOK]
            }
          })
        }
      }
    } catch (error) {
      console.error('Error exporting to Outlook:', error)
      throw error
    }
  }

  private static convertToOutlookEvent(event: any): OutlookEvent {
    const outlookEvent: OutlookEvent = {
      id: event.externalEventId || undefined,
      subject: event.title,
      body: event.description ? {
        content: event.description,
        contentType: 'text'
      } : undefined,
      location: event.location ? {
        displayName: event.location
      } : undefined,
      start: {
        dateTime: event.startTime.toISOString(),
        timeZone: 'UTC'
      },
      end: {
        dateTime: event.endTime.toISOString(),
        timeZone: 'UTC'
      }
    }

    return outlookEvent
  }

  private static async createEventFromOutlook(userId: string, outlookEvent: OutlookEvent) {
    try {
      await prisma.calendarEvent.create({
        data: {
          title: outlookEvent.subject,
          description: outlookEvent.body?.content,
          location: outlookEvent.location?.displayName,
          startTime: new Date(outlookEvent.start.dateTime),
          endTime: new Date(outlookEvent.end.dateTime),
          allDay: false,
          type: 'MEETING',
          createdById: userId,
          externalEventId: outlookEvent.id,
          syncedWith: [CalendarProvider.OUTLOOK]
        }
      })
    } catch (error) {
      console.error('Error creating event from Outlook:', error)
    }
  }

  private static async updateEventFromOutlook(eventId: string, outlookEvent: OutlookEvent) {
    try {
      await prisma.calendarEvent.update({
        where: { id: eventId },
        data: {
          title: outlookEvent.subject,
          description: outlookEvent.body?.content,
          location: outlookEvent.location?.displayName,
          startTime: new Date(outlookEvent.start.dateTime),
          endTime: new Date(outlookEvent.end.dateTime)
        }
      })
    } catch (error) {
      console.error('Error updating event from Outlook:', error)
    }
  }

  private static async refreshOutlookToken(integrationId: string) {
    try {
      const integration = await prisma.calendarIntegration.findUnique({
        where: { id: integrationId }
      })

      if (!integration?.refreshToken) {
        throw new Error('No refresh token available')
      }

      const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          refresh_token: integration.refreshToken,
          grant_type: 'refresh_token',
          scope: 'https://graph.microsoft.com/calendars.readwrite offline_access'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to refresh Outlook token')
      }

      const data = await response.json()
      
      const expiryDate = new Date()
      expiryDate.setSeconds(expiryDate.getSeconds() + data.expires_in)

      await prisma.calendarIntegration.update({
        where: { id: integrationId },
        data: {
          accessToken: data.access_token,
          refreshToken: data.refresh_token || integration.refreshToken,
          tokenExpiry: expiryDate
        }
      })
    } catch (error) {
      console.error('Error refreshing Outlook token:', error)
      throw error
    }
  }

  // Batch sync for all users
  static async syncAllUsers() {
    try {
      const integrations = await prisma.calendarIntegration.findMany({
        where: {
          syncEnabled: true,
          syncStatus: 'active'
        }
      })

      for (const integration of integrations) {
        try {
          switch (integration.provider) {
            case CalendarProvider.GOOGLE:
              await this.syncWithGoogleCalendar(integration.userId)
              break
            case CalendarProvider.OUTLOOK:
              await this.syncWithOutlook(integration.userId)
              break
            // Add other providers as needed
          }
        } catch (error) {
          console.error(`Sync failed for user ${integration.userId}, provider ${integration.provider}:`, error)
          
          // Mark integration as having an error
          await prisma.calendarIntegration.update({
            where: { id: integration.id },
            data: { syncStatus: 'error' }
          })
        }
      }
    } catch (error) {
      console.error('Error in batch sync:', error)
    }
  }

  // Utility functions
  static async createIntegration(
    userId: string, 
    provider: CalendarProvider, 
    accessToken: string, 
    refreshToken?: string,
    tokenExpiry?: Date,
    providerUserId?: string,
    calendarId?: string
  ) {
    try {
      return await prisma.calendarIntegration.create({
        data: {
          userId,
          provider,
          accessToken,
          refreshToken,
          tokenExpiry,
          providerUserId: providerUserId || 'default',
          calendarId,
          syncEnabled: true,
          syncDirection: 'both',
          syncStatus: 'active'
        }
      })
    } catch (error) {
      console.error('Error creating calendar integration:', error)
      throw error
    }
  }

  static async removeIntegration(userId: string, provider: CalendarProvider) {
    try {
      await prisma.calendarIntegration.delete({
        where: {
          userId_provider: {
            userId,
            provider
          }
        }
      })
    } catch (error) {
      console.error('Error removing calendar integration:', error)
      throw error
    }
  }

  static async getUserIntegrations(userId: string) {
    try {
      return await prisma.calendarIntegration.findMany({
        where: { userId },
        select: {
          id: true,
          provider: true,
          syncEnabled: true,
          syncDirection: true,
          syncStatus: true,
          lastSyncAt: true,
          createdAt: true
        }
      })
    } catch (error) {
      console.error('Error getting user integrations:', error)
      throw error
    }
  }
}