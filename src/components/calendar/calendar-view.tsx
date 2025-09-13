'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Clock,
  MapPin,
  Users,
  Video,
  Filter,
  Search
} from 'lucide-react'
import { EventType, EventStatus } from '@prisma/client'
import { cn } from '@/lib/utils'

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  location?: string
  startTime: Date
  endTime: Date
  allDay: boolean
  type: EventType
  status: EventStatus
  zoomJoinUrl?: string
  course?: {
    id: string
    title: string
  }
  attendees: {
    user: {
      id: string
      name: string
      email: string
    }
    status: string
  }[]
}

interface CalendarViewProps {
  events: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
  onCreateEvent?: (date?: Date) => void
  onEventUpdate?: (eventId: string) => void
  view?: 'month' | 'week' | 'day'
  className?: string
}

export default function CalendarView({
  events,
  onEventClick,
  onCreateEvent,
  onEventUpdate,
  view = 'month',
  className
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day'>(view)
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>(events)
  const [filterType, setFilterType] = useState<EventType | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<EventStatus | 'all'>('all')

  useEffect(() => {
    setFilteredEvents(events)
  }, [events])

  useEffect(() => {
    let filtered = events

    if (filterType !== 'all') {
      filtered = filtered.filter(event => event.type === filterType)
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(event => event.status === filterStatus)
    }

    setFilteredEvents(filtered)
  }, [events, filterType, filterStatus])

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    
    switch (currentView) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
        break
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
        break
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
        break
    }
    
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const getDateRange = () => {
    const start = new Date(currentDate)
    const end = new Date(currentDate)

    switch (currentView) {
      case 'month':
        start.setDate(1)
        end.setMonth(end.getMonth() + 1, 0)
        break
      case 'week':
        const dayOfWeek = start.getDay()
        start.setDate(start.getDate() - dayOfWeek)
        end.setDate(start.getDate() + 6)
        break
      case 'day':
        // Same day
        break
    }

    return { start, end }
  }

  const getEventsInRange = () => {
    const { start, end } = getDateRange()
    
    return filteredEvents.filter(event => {
      const eventStart = new Date(event.startTime)
      const eventEnd = new Date(event.endTime)
      
      return eventStart <= end && eventEnd >= start
    })
  }

  const formatEventTime = (event: CalendarEvent) => {
    if (event.allDay) {
      return 'All day'
    }
    
    const start = new Date(event.startTime)
    const end = new Date(event.endTime)
    
    return `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  const getEventTypeColor = (type: EventType) => {
    switch (type) {
      case EventType.MEETING: return 'bg-blue-100 text-blue-800 border-blue-200'
      case EventType.LECTURE: return 'bg-purple-100 text-purple-800 border-purple-200'
      case EventType.WORKSHOP: return 'bg-green-100 text-green-800 border-green-200'
      case EventType.EXAM: return 'bg-red-100 text-red-800 border-red-200'
      case EventType.ASSIGNMENT_DUE: return 'bg-orange-100 text-orange-800 border-orange-200'
      case EventType.OFFICE_HOURS: return 'bg-cyan-100 text-cyan-800 border-cyan-200'
      case EventType.BREAK: return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusBadge = (status: EventStatus) => {
    switch (status) {
      case EventStatus.SCHEDULED:
        return <Badge variant="secondary">Scheduled</Badge>
      case EventStatus.IN_PROGRESS:
        return <Badge className="bg-green-100 text-green-800">In Progress</Badge>
      case EventStatus.COMPLETED:
        return <Badge variant="outline">Completed</Badge>
      case EventStatus.CANCELLED:
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return null
    }
  }

  const formatDateHeader = () => {
    const options: Intl.DateTimeFormatOptions = {
      month: 'long',
      year: 'numeric'
    }

    switch (currentView) {
      case 'month':
        return currentDate.toLocaleDateString(undefined, options)
      case 'week':
        const { start, end } = getDateRange()
        return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
      case 'day':
        return currentDate.toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })
    }
  }

  const renderMonthView = () => {
    const { start } = getDateRange()
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
    const firstDayOfWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()
    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="min-h-24 p-1 border border-gray-200 bg-gray-50"></div>)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dayEvents = getEventsInRange().filter(event => {
        const eventDate = new Date(event.startTime)
        return eventDate.toDateString() === date.toDateString()
      })

      days.push(
        <div key={day} className="min-h-24 p-1 border border-gray-200 hover:bg-gray-50">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium">{day}</span>
            {onCreateEvent && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onCreateEvent(date)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
          </div>
          <div className="space-y-1">
            {dayEvents.slice(0, 3).map(event => (
              <div
                key={event.id}
                className={cn(
                  "text-xs p-1 rounded cursor-pointer truncate",
                  getEventTypeColor(event.type)
                )}
                onClick={() => onEventClick?.(event)}
                title={event.title}
              >
                {event.title}
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div className="text-xs text-gray-500">
                +{dayEvents.length - 3} more
              </div>
            )}
          </div>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-7 gap-0">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 border border-gray-200 bg-gray-100 text-center font-medium text-sm">
            {day}
          </div>
        ))}
        {days}
      </div>
    )
  }

  const renderListView = () => {
    const eventsInRange = getEventsInRange().sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )

    if (eventsInRange.length === 0) {
      return (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No events in this period</p>
          {onCreateEvent && (
            <Button onClick={() => onCreateEvent()} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {eventsInRange.map(event => (
          <Card 
            key={event.id} 
            className={cn(
              "cursor-pointer hover:shadow-md transition-shadow",
              getEventTypeColor(event.type)
            )}
            onClick={() => onEventClick?.(event)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium">{event.title}</h3>
                    {getStatusBadge(event.status)}
                    {event.zoomJoinUrl && (
                      <Badge variant="outline" className="text-blue-600">
                        <Video className="h-3 w-3 mr-1" />
                        Zoom
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>{formatEventTime(event)}</span>
                    </div>
                    
                    {event.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    
                    {event.attendees.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        <span>{event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                  
                  {event.description && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                  
                  {event.course && (
                    <Badge variant="outline" className="mt-2">
                      {event.course.title}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar
          </CardTitle>
          
          <div className="flex flex-wrap gap-2">
            {/* Filters */}
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.values(EventType).map(type => (
                  <SelectItem key={type} value={type}>
                    {type.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.values(EventStatus).map(status => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View Toggle */}
            <Select value={currentView} onValueChange={(value: any) => setCurrentView(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="day">Day</SelectItem>
              </SelectContent>
            </Select>

            {onCreateEvent && (
              <Button onClick={() => onCreateEvent()}>
                <Plus className="h-4 w-4 mr-2" />
                New Event
              </Button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <h2 className="text-lg font-medium">{formatDateHeader()}</h2>
        </div>
      </CardHeader>
      
      <CardContent>
        {currentView === 'month' ? renderMonthView() : renderListView()}
      </CardContent>
    </Card>
  )
}