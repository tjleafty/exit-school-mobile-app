'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Video,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Mail,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Repeat
} from 'lucide-react'
import { EventType, EventStatus, RecurrenceType } from '@prisma/client'
import { cn } from '@/lib/utils'

interface EventDetailsProps {
  event: {
    id: string
    title: string
    description?: string
    location?: string
    startTime: Date
    endTime: Date
    allDay: boolean
    type: EventType
    status: EventStatus
    isRecurring: boolean
    recurrenceType: RecurrenceType
    zoomJoinUrl?: string
    zoomStartUrl?: string
    zoomPassword?: string
    course?: {
      id: string
      title: string
    }
    createdBy: {
      id: string
      name: string
      email: string
    }
    attendees: {
      user: {
        id: string
        name: string
        email: string
      }
      status: string
      joinedAt?: Date
      leftAt?: Date
    }[]
    parentEvent?: {
      id: string
      title: string
    }
    childEvents?: {
      id: string
      startTime: Date
      endTime: Date
    }[]
  }
  currentUserId: string
  canEdit?: boolean
  onEdit?: () => void
  onDelete?: () => void
  onRSVP?: (status: string) => void
  onJoinZoom?: () => void
  className?: string
}

export default function EventDetails({
  event,
  currentUserId,
  canEdit = false,
  onEdit,
  onDelete,
  onRSVP,
  onJoinZoom,
  className
}: EventDetailsProps) {
  const [loading, setLoading] = useState(false)

  const formatDateTime = (date: Date, includeTime = true) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }

    if (includeTime && !event.allDay) {
      options.hour = '2-digit'
      options.minute = '2-digit'
    }

    return new Date(date).toLocaleDateString(undefined, options)
  }

  const formatDuration = () => {
    const start = new Date(event.startTime)
    const end = new Date(event.endTime)
    const durationMs = end.getTime() - start.getTime()
    const durationMinutes = Math.floor(durationMs / (1000 * 60))
    const hours = Math.floor(durationMinutes / 60)
    const minutes = durationMinutes % 60

    if (hours > 0) {
      return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`
    }
    return `${minutes}m`
  }

  const getEventTypeColor = (type: EventType) => {
    switch (type) {
      case EventType.MEETING: return 'bg-blue-100 text-blue-800'
      case EventType.LECTURE: return 'bg-purple-100 text-purple-800'
      case EventType.WORKSHOP: return 'bg-green-100 text-green-800'
      case EventType.EXAM: return 'bg-red-100 text-red-800'
      case EventType.ASSIGNMENT_DUE: return 'bg-orange-100 text-orange-800'
      case EventType.OFFICE_HOURS: return 'bg-cyan-100 text-cyan-800'
      case EventType.BREAK: return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: EventStatus) => {
    switch (status) {
      case EventStatus.SCHEDULED:
        return <Clock className="h-4 w-4 text-blue-500" />
      case EventStatus.IN_PROGRESS:
        return <div className="h-4 w-4 bg-green-500 rounded-full animate-pulse" />
      case EventStatus.COMPLETED:
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case EventStatus.CANCELLED:
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getRSVPStatus = () => {
    const attendee = event.attendees.find(a => a.user.id === currentUserId)
    return attendee?.status || 'pending'
  }

  const getRSVPBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800">Accepted</Badge>
      case 'declined':
        return <Badge className="bg-red-100 text-red-800">Declined</Badge>
      case 'maybe':
        return <Badge className="bg-yellow-100 text-yellow-800">Maybe</Badge>
      default:
        return <Badge variant="outline">Pending</Badge>
    }
  }

  const handleRSVP = async (status: string) => {
    if (!onRSVP) return
    
    setLoading(true)
    try {
      await onRSVP(status)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You could add a toast notification here
  }

  const downloadCalendarEvent = () => {
    const start = new Date(event.startTime).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    const end = new Date(event.endTime).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Your App//EN',
      'BEGIN:VEVENT',
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description || ''}`,
      `LOCATION:${event.location || ''}`,
      `UID:${event.id}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n')

    const blob = new Blob([icsContent], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${event.title}.ics`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const currentUserRSVP = getRSVPStatus()
  const isCreator = event.createdBy.id === currentUserId
  const isAttendee = event.attendees.some(a => a.user.id === currentUserId)

  return (
    <Card className={cn("w-full max-w-4xl", className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">{event.title}</CardTitle>
              <Badge className={getEventTypeColor(event.type)}>
                {event.type.replace('_', ' ')}
              </Badge>
              {event.isRecurring && (
                <Badge variant="outline">
                  <Repeat className="h-3 w-3 mr-1" />
                  {event.recurrenceType}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {getStatusIcon(event.status)}
              <span className="text-sm font-medium capitalize">{event.status.toLowerCase()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={onDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            
            <Button variant="outline" size="sm" onClick={downloadCalendarEvent}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Date and Time */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4" />
            Date & Time
          </div>
          <div className="ml-6 space-y-1 text-sm">
            <p>{formatDateTime(event.startTime)}</p>
            {!event.allDay && (
              <p className="text-muted-foreground">
                {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                <span className="ml-2">({formatDuration()})</span>
              </p>
            )}
          </div>
        </div>

        {/* Location */}
        {event.location && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4" />
              Location
            </div>
            <div className="ml-6 text-sm">
              <p>{event.location}</p>
            </div>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Description</div>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">
              {event.description}
            </div>
          </div>
        )}

        {/* Course Association */}
        {event.course && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Course</div>
            <Badge variant="outline">{event.course.title}</Badge>
          </div>
        )}

        {/* Zoom Meeting */}
        {event.zoomJoinUrl && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Video className="h-4 w-4" />
              Zoom Meeting
            </div>
            <div className="ml-6 space-y-2">
              <div className="flex flex-wrap gap-2">
                {onJoinZoom ? (
                  <Button onClick={onJoinZoom} className="bg-blue-600 hover:bg-blue-700">
                    <Video className="h-4 w-4 mr-2" />
                    Join Zoom Meeting
                  </Button>
                ) : (
                  <Button asChild className="bg-blue-600 hover:bg-blue-700">
                    <a href={event.zoomJoinUrl} target="_blank" rel="noopener noreferrer">
                      <Video className="h-4 w-4 mr-2" />
                      Join Zoom Meeting
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(event.zoomJoinUrl!)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              
              {event.zoomPassword && (
                <div className="text-sm">
                  <span className="font-medium">Meeting Password: </span>
                  <code className="bg-gray-100 px-1 py-0.5 rounded">{event.zoomPassword}</code>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="ml-2 h-6 w-6 p-0"
                    onClick={() => copyToClipboard(event.zoomPassword!)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Organizer */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4" />
            Organizer
          </div>
          <div className="ml-6 flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {event.createdBy.name ? event.createdBy.name.charAt(0).toUpperCase() : event.createdBy.email.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{event.createdBy.name || event.createdBy.email}</p>
              {event.createdBy.name && (
                <p className="text-xs text-muted-foreground">{event.createdBy.email}</p>
              )}
            </div>
            <Button variant="ghost" size="sm" asChild>
              <a href={`mailto:${event.createdBy.email}`}>
                <Mail className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>

        {/* RSVP Section (if user is attendee) */}
        {isAttendee && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Your Response</div>
            <div className="flex items-center gap-3">
              {getRSVPBadge(currentUserRSVP)}
              {onRSVP && (
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant={currentUserRSVP === 'accepted' ? 'default' : 'outline'}
                    onClick={() => handleRSVP('accepted')}
                    disabled={loading}
                  >
                    Accept
                  </Button>
                  <Button 
                    size="sm" 
                    variant={currentUserRSVP === 'maybe' ? 'default' : 'outline'}
                    onClick={() => handleRSVP('maybe')}
                    disabled={loading}
                  >
                    Maybe
                  </Button>
                  <Button 
                    size="sm" 
                    variant={currentUserRSVP === 'declined' ? 'destructive' : 'outline'}
                    onClick={() => handleRSVP('declined')}
                    disabled={loading}
                  >
                    Decline
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Attendees */}
        {event.attendees.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium">
              Attendees ({event.attendees.length})
            </div>
            <div className="ml-6 space-y-2">
              {event.attendees.map(attendee => (
                <div key={attendee.user.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {attendee.user.name ? attendee.user.name.charAt(0).toUpperCase() : attendee.user.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm">{attendee.user.name || attendee.user.email}</p>
                      {attendee.user.name && (
                        <p className="text-xs text-muted-foreground">{attendee.user.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRSVPBadge(attendee.status)}
                    {attendee.joinedAt && (
                      <Badge variant="outline" className="text-xs">
                        Attended
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recurring Event Info */}
        {event.isRecurring && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Repeat className="h-4 w-4" />
              Recurring Event
            </div>
            <div className="ml-6 text-sm text-muted-foreground">
              <p>Repeats {event.recurrenceType.toLowerCase()}</p>
              {event.parentEvent && (
                <p>Part of series: {event.parentEvent.title}</p>
              )}
              {event.childEvents && event.childEvents.length > 0 && (
                <p>{event.childEvents.length} upcoming occurrences</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}