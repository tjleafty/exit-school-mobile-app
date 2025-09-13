import { z } from 'zod'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface ZoomMeetingConfig {
  topic: string
  type: 1 | 2 | 3 | 8 // 1=instant, 2=scheduled, 3=recurring with no fixed time, 8=recurring with fixed time
  start_time?: string // ISO 8601 format
  duration?: number // Meeting duration in minutes
  timezone?: string
  password?: string
  agenda?: string
  recurrence?: {
    type: 1 | 2 | 3 // 1=Daily, 2=Weekly, 3=Monthly
    repeat_interval: number
    end_times?: number
    end_date_time?: string
  }
  settings?: {
    host_video?: boolean
    participant_video?: boolean
    cn_meeting?: boolean
    in_meeting?: boolean
    join_before_host?: boolean
    mute_upon_entry?: boolean
    watermark?: boolean
    use_pmi?: boolean
    approval_type?: 0 | 1 | 2 // 0=auto approve, 1=manually approve, 2=no registration required
    audio?: 'both' | 'telephony' | 'voip'
    auto_recording?: 'local' | 'cloud' | 'none'
    waiting_room?: boolean
  }
}

export interface ZoomMeetingResponse {
  id: string
  host_id: string
  topic: string
  type: number
  status: string
  start_time: string
  duration: number
  timezone: string
  agenda: string
  created_at: string
  start_url: string
  join_url: string
  password: string
  h323_password: string
  pstn_password: string
  encrypted_password: string
  settings: any
  recurrence?: any
}

export interface ZoomAuthToken {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
}

export class ZoomService {
  private static baseUrl = 'https://api.zoom.us/v2'
  private static clientId = process.env.ZOOM_CLIENT_ID
  private static clientSecret = process.env.ZOOM_CLIENT_SECRET
  private static redirectUri = process.env.ZOOM_REDIRECT_URI
  
  // Server-to-Server OAuth for app-level access
  private static async getServerToServerToken(): Promise<string> {
    try {
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
      
      const response = await fetch('https://zoom.us/oauth/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      })

      if (!response.ok) {
        throw new Error(`Zoom OAuth failed: ${response.statusText}`)
      }

      const data: ZoomAuthToken = await response.json()
      return data.access_token
    } catch (error) {
      console.error('Error getting Zoom server-to-server token:', error)
      throw new Error('Failed to authenticate with Zoom')
    }
  }

  // User-level OAuth for individual user access
  static getAuthUrl(userId: string, state?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId!,
      redirect_uri: this.redirectUri!,
      state: state || userId
    })

    return `https://zoom.us/oauth/authorize?${params.toString()}`
  }

  static async exchangeCodeForToken(code: string): Promise<ZoomAuthToken> {
    try {
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
      
      const response = await fetch('https://zoom.us/oauth/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.redirectUri!
        })
      })

      if (!response.ok) {
        throw new Error(`Zoom token exchange failed: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error exchanging Zoom code for token:', error)
      throw new Error('Failed to exchange code for token')
    }
  }

  static async refreshToken(refreshToken: string): Promise<ZoomAuthToken> {
    try {
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
      
      const response = await fetch('https://zoom.us/oauth/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      })

      if (!response.ok) {
        throw new Error(`Zoom token refresh failed: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error refreshing Zoom token:', error)
      throw new Error('Failed to refresh token')
    }
  }

  static async createMeeting(config: ZoomMeetingConfig, accessToken?: string): Promise<ZoomMeetingResponse> {
    try {
      const token = accessToken || await this.getServerToServerToken()
      
      const response = await fetch(`${this.baseUrl}/users/me/meetings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Zoom meeting creation failed: ${error.message || response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating Zoom meeting:', error)
      throw new Error('Failed to create Zoom meeting')
    }
  }

  static async updateMeeting(meetingId: string, config: Partial<ZoomMeetingConfig>, accessToken?: string): Promise<void> {
    try {
      const token = accessToken || await this.getServerToServerToken()
      
      const response = await fetch(`${this.baseUrl}/meetings/${meetingId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Zoom meeting update failed: ${error.message || response.statusText}`)
      }
    } catch (error) {
      console.error('Error updating Zoom meeting:', error)
      throw new Error('Failed to update Zoom meeting')
    }
  }

  static async deleteMeeting(meetingId: string, accessToken?: string): Promise<void> {
    try {
      const token = accessToken || await this.getServerToServerToken()
      
      const response = await fetch(`${this.baseUrl}/meetings/${meetingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok && response.status !== 404) {
        const error = await response.json()
        throw new Error(`Zoom meeting deletion failed: ${error.message || response.statusText}`)
      }
    } catch (error) {
      console.error('Error deleting Zoom meeting:', error)
      throw new Error('Failed to delete Zoom meeting')
    }
  }

  static async getMeeting(meetingId: string, accessToken?: string): Promise<ZoomMeetingResponse> {
    try {
      const token = accessToken || await this.getServerToServerToken()
      
      const response = await fetch(`${this.baseUrl}/meetings/${meetingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Zoom meeting fetch failed: ${error.message || response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting Zoom meeting:', error)
      throw new Error('Failed to get Zoom meeting')
    }
  }

  static async createMeetingForEvent(eventId: string, eventData: {
    title: string
    description?: string
    startTime: Date
    endTime: Date
    timezone?: string
  }): Promise<{ joinUrl: string; startUrl: string; meetingId: string; password: string }> {
    try {
      const duration = Math.ceil((eventData.endTime.getTime() - eventData.startTime.getTime()) / (1000 * 60))
      
      const zoomConfig: ZoomMeetingConfig = {
        topic: eventData.title,
        type: 2, // Scheduled meeting
        start_time: eventData.startTime.toISOString(),
        duration,
        timezone: eventData.timezone || 'UTC',
        agenda: eventData.description,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          waiting_room: true,
          auto_recording: 'none',
          audio: 'both'
        }
      }

      const meeting = await this.createMeeting(zoomConfig)

      // Update the calendar event with Zoom details
      await prisma.calendarEvent.update({
        where: { id: eventId },
        data: {
          zoomMeetingId: meeting.id,
          zoomJoinUrl: meeting.join_url,
          zoomStartUrl: meeting.start_url,
          zoomPassword: meeting.password
        }
      })

      return {
        joinUrl: meeting.join_url,
        startUrl: meeting.start_url,
        meetingId: meeting.id,
        password: meeting.password
      }
    } catch (error) {
      console.error('Error creating Zoom meeting for event:', error)
      throw new Error('Failed to create Zoom meeting for event')
    }
  }

  static async updateMeetingForEvent(eventId: string, eventData: {
    title?: string
    description?: string
    startTime?: Date
    endTime?: Date
    timezone?: string
  }): Promise<void> {
    try {
      const event = await prisma.calendarEvent.findUnique({
        where: { id: eventId },
        select: { zoomMeetingId: true }
      })

      if (!event?.zoomMeetingId) {
        throw new Error('No Zoom meeting associated with this event')
      }

      const updateConfig: Partial<ZoomMeetingConfig> = {}
      
      if (eventData.title) updateConfig.topic = eventData.title
      if (eventData.description) updateConfig.agenda = eventData.description
      if (eventData.startTime) updateConfig.start_time = eventData.startTime.toISOString()
      if (eventData.timezone) updateConfig.timezone = eventData.timezone
      
      if (eventData.startTime && eventData.endTime) {
        updateConfig.duration = Math.ceil((eventData.endTime.getTime() - eventData.startTime.getTime()) / (1000 * 60))
      }

      await this.updateMeeting(event.zoomMeetingId, updateConfig)
    } catch (error) {
      console.error('Error updating Zoom meeting for event:', error)
      throw new Error('Failed to update Zoom meeting for event')
    }
  }

  static async deleteMeetingForEvent(eventId: string): Promise<void> {
    try {
      const event = await prisma.calendarEvent.findUnique({
        where: { id: eventId },
        select: { zoomMeetingId: true }
      })

      if (event?.zoomMeetingId) {
        await this.deleteMeeting(event.zoomMeetingId)
        
        // Clear Zoom details from the event
        await prisma.calendarEvent.update({
          where: { id: eventId },
          data: {
            zoomMeetingId: null,
            zoomJoinUrl: null,
            zoomStartUrl: null,
            zoomPassword: null
          }
        })
      }
    } catch (error) {
      console.error('Error deleting Zoom meeting for event:', error)
      throw new Error('Failed to delete Zoom meeting for event')
    }
  }

  // Webhook handling for Zoom events
  static async handleWebhook(payload: any) {
    try {
      const { event, payload: data } = payload

      switch (event) {
        case 'meeting.started':
          await this.handleMeetingStarted(data)
          break
        case 'meeting.ended':
          await this.handleMeetingEnded(data)
          break
        case 'meeting.participant_joined':
          await this.handleParticipantJoined(data)
          break
        case 'meeting.participant_left':
          await this.handleParticipantLeft(data)
          break
        default:
          console.log('Unhandled Zoom webhook event:', event)
      }
    } catch (error) {
      console.error('Error handling Zoom webhook:', error)
    }
  }

  private static async handleMeetingStarted(data: any) {
    try {
      const { object } = data
      const meetingId = object.id.toString()

      await prisma.calendarEvent.updateMany({
        where: { zoomMeetingId: meetingId },
        data: { status: 'IN_PROGRESS' }
      })
    } catch (error) {
      console.error('Error handling meeting started:', error)
    }
  }

  private static async handleMeetingEnded(data: any) {
    try {
      const { object } = data
      const meetingId = object.id.toString()

      await prisma.calendarEvent.updateMany({
        where: { zoomMeetingId: meetingId },
        data: { status: 'COMPLETED' }
      })
    } catch (error) {
      console.error('Error handling meeting ended:', error)
    }
  }

  private static async handleParticipantJoined(data: any) {
    try {
      const { object } = data
      const meetingId = object.id.toString()
      const participantEmail = object.participant.email

      // Find the event and user
      const event = await prisma.calendarEvent.findFirst({
        where: { zoomMeetingId: meetingId },
        include: {
          attendees: {
            include: {
              user: true
            }
          }
        }
      })

      if (event) {
        const attendee = event.attendees.find(a => a.user.email === participantEmail)
        if (attendee) {
          await prisma.eventAttendee.update({
            where: { id: attendee.id },
            data: {
              joinedAt: new Date(),
              attendanceMarked: true
            }
          })
        }
      }
    } catch (error) {
      console.error('Error handling participant joined:', error)
    }
  }

  private static async handleParticipantLeft(data: any) {
    try {
      const { object } = data
      const meetingId = object.id.toString()
      const participantEmail = object.participant.email

      // Find the event and user
      const event = await prisma.calendarEvent.findFirst({
        where: { zoomMeetingId: meetingId },
        include: {
          attendees: {
            include: {
              user: true
            }
          }
        }
      })

      if (event) {
        const attendee = event.attendees.find(a => a.user.email === participantEmail)
        if (attendee) {
          await prisma.eventAttendee.update({
            where: { id: attendee.id },
            data: {
              leftAt: new Date()
            }
          })
        }
      }
    } catch (error) {
      console.error('Error handling participant left:', error)
    }
  }
}