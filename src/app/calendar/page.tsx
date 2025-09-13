'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Settings,
  Download,
  Upload,
  Clock,
  Users,
  Video,
  MapPin,
  Bell,
  RefreshCw as Sync
} from 'lucide-react'
import CalendarView from '@/components/calendar/calendar-view'
import EventForm from '@/components/calendar/event-form'
import EventDetails from '@/components/calendar/event-details'
import { EventType, EventStatus, CalendarProvider } from '@prisma/client'
import { cn } from '@/lib/utils'

interface CalendarEvent {
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
  zoomStartUrl?: string
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
  }[]
}

interface Course {
  id: string
  title: string
}

interface User {
  id: string
  name: string
  email: string
}

interface CalendarIntegration {
  id: string
  provider: CalendarProvider
  syncEnabled: boolean
  syncStatus: string
  lastSyncAt?: Date
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([])
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showEventForm, setShowEventForm] = useState(false)
  const [showEventDetails, setShowEventDetails] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      
      // Fetch current user
      const userResponse = await fetch('/api/auth/me')
      if (userResponse.ok) {
        const userData = await userResponse.json()
        setCurrentUserId(userData.user.id)
      }

      // Fetch events
      await fetchEvents()
      
      // Fetch upcoming events
      await fetchUpcomingEvents()
      
      // Fetch courses for form
      const coursesResponse = await fetch('/api/courses')
      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json()
        setCourses(coursesData.courses || [])
      }

      // Fetch users for attendee selection
      const usersResponse = await fetch('/api/users')
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData.users || [])
      }

      // Fetch calendar integrations
      await fetchIntegrations()

    } catch (error) {
      console.error('Error fetching initial data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/calendar/events')
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events || [])
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    }
  }

  const fetchUpcomingEvents = async () => {
    try {
      const response = await fetch('/api/calendar/upcoming?days=7')
      if (response.ok) {
        const data = await response.json()
        setUpcomingEvents(data.events || [])
      }
    } catch (error) {
      console.error('Error fetching upcoming events:', error)
    }
  }

  const fetchIntegrations = async () => {
    try {
      const response = await fetch('/api/calendar/sync')
      if (response.ok) {
        const data = await response.json()
        setIntegrations(data.integrations || [])
      }
    } catch (error) {
      console.error('Error fetching integrations:', error)
    }
  }

  const handleCreateEvent = async (eventData: any) => {
    try {
      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })

      if (response.ok) {
        await fetchEvents()
        await fetchUpcomingEvents()
        setShowEventForm(false)
      } else {
        const errorData = await response.json()
        console.error('Error creating event:', errorData.error)
      }
    } catch (error) {
      console.error('Error creating event:', error)
    }
  }

  const handleUpdateEvent = async (eventData: any) => {
    if (!editingEvent) return

    try {
      const response = await fetch('/api/calendar/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: editingEvent.id, ...eventData })
      })

      if (response.ok) {
        await fetchEvents()
        await fetchUpcomingEvents()
        setShowEventForm(false)
        setEditingEvent(null)
      } else {
        const errorData = await response.json()
        console.error('Error updating event:', errorData.error)
      }
    } catch (error) {
      console.error('Error updating event:', error)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/calendar/events?eventId=${eventId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchEvents()
        await fetchUpcomingEvents()
        setShowEventDetails(false)
        setSelectedEvent(null)
      } else {
        const errorData = await response.json()
        console.error('Error deleting event:', errorData.error)
      }
    } catch (error) {
      console.error('Error deleting event:', error)
    }
  }

  const handleRSVP = async (eventId: string, status: string) => {
    try {
      const response = await fetch(`/api/calendar/events/${eventId}/attendees`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        await fetchEvents()
        if (selectedEvent) {
          // Refresh selected event details
          const eventResponse = await fetch(`/api/calendar/events/${eventId}`)
          if (eventResponse.ok) {
            const eventData = await eventResponse.json()
            setSelectedEvent(eventData.event)
          }
        }
      }
    } catch (error) {
      console.error('Error updating RSVP:', error)
    }
  }

  const handleSync = async (provider: CalendarProvider) => {
    try {
      setSyncing(true)
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', provider })
      })

      if (response.ok) {
        await fetchEvents()
        await fetchUpcomingEvents()
        await fetchIntegrations()
      }
    } catch (error) {
      console.error('Error syncing calendar:', error)
    } finally {
      setSyncing(false)
    }
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setShowEventDetails(true)
  }

  const handleEditEvent = () => {
    if (selectedEvent) {
      setEditingEvent(selectedEvent)
      setShowEventDetails(false)
      setShowEventForm(true)
    }
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
      case EventType.MEETING: return 'bg-blue-100 text-blue-800'
      case EventType.LECTURE: return 'bg-purple-100 text-purple-800'
      case EventType.WORKSHOP: return 'bg-green-100 text-green-800'
      case EventType.EXAM: return 'bg-red-100 text-red-800'
      case EventType.ASSIGNMENT_DUE: return 'bg-orange-100 text-orange-800'
      case EventType.OFFICE_HOURS: return 'bg-cyan-100 text-cyan-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">
            Manage your schedule and program meetings
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => handleSync(CalendarProvider.GOOGLE)}
            disabled={syncing}
          >
            <Sync className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
            Sync
          </Button>
          <Button onClick={() => setShowEventForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
        </div>
      </div>

      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming Events</TabsTrigger>
          <TabsTrigger value="settings">Settings & Sync</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-6">
          <CalendarView
            events={events}
            onEventClick={handleEventClick}
            onCreateEvent={() => setShowEventForm(true)}
          />
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Upcoming Events (Next 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length > 0 ? (
                <div className="space-y-4">
                  {upcomingEvents.map(event => (
                    <div 
                      key={event.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleEventClick(event)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{event.title}</h3>
                          <Badge className={getEventTypeColor(event.type)}>
                            {event.type.replace('_', ' ')}
                          </Badge>
                          {event.zoomJoinUrl && (
                            <Badge variant="outline">
                              <Video className="h-3 w-3 mr-1" />
                              Zoom
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-3 w-3" />
                            <span>{new Date(event.startTime).toLocaleDateString()}</span>
                          </div>
                          
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
                        
                        {event.course && (
                          <Badge variant="outline" className="mt-2">
                            {event.course.title}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No upcoming events in the next 7 days</p>
                  <Button onClick={() => setShowEventForm(true)} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Event
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Calendar Integrations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.values(CalendarProvider).map(provider => {
                  const integration = integrations.find(i => i.provider === provider)
                  
                  return (
                    <div key={provider} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          {provider === CalendarProvider.GOOGLE && '📅'}
                          {provider === CalendarProvider.OUTLOOK && '📧'}
                          {provider === CalendarProvider.APPLE && '🍎'}
                          {provider === CalendarProvider.ZOOM && '📹'}
                        </div>
                        <div>
                          <p className="font-medium">{provider} Calendar</p>
                          {integration && (
                            <p className="text-sm text-gray-500">
                              Last synced: {integration.lastSyncAt ? 
                                new Date(integration.lastSyncAt).toLocaleDateString() : 
                                'Never'
                              }
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {integration ? (
                          <>
                            <Badge variant={integration.syncStatus === 'active' ? 'default' : 'destructive'}>
                              {integration.syncStatus}
                            </Badge>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleSync(provider)}
                              disabled={syncing}
                            >
                              Sync Now
                            </Button>
                          </>
                        ) : (
                          <Button variant="outline" size="sm">
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Event Form Dialog */}
      <Dialog open={showEventForm} onOpenChange={setShowEventForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? 'Edit Event' : 'Create New Event'}
            </DialogTitle>
          </DialogHeader>
          <EventForm
            initialData={editingEvent ? {
              title: editingEvent.title,
              description: editingEvent.description || '',
              location: editingEvent.location || '',
              startTime: editingEvent.startTime.toISOString().slice(0, 16),
              endTime: editingEvent.endTime.toISOString().slice(0, 16),
              allDay: editingEvent.allDay,
              type: editingEvent.type,
              courseId: editingEvent.course?.id || '',
              attendeeIds: editingEvent.attendees.map(a => a.user.id),
              zoomMeeting: !!editingEvent.zoomJoinUrl
            } : undefined}
            courses={courses}
            users={users}
            onSubmit={editingEvent ? handleUpdateEvent : handleCreateEvent}
            onCancel={() => {
              setShowEventForm(false)
              setEditingEvent(null)
            }}
            className="border-0 shadow-none p-0"
          />
        </DialogContent>
      </Dialog>

      {/* Event Details Dialog */}
      <Dialog open={showEventDetails} onOpenChange={setShowEventDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedEvent && (
            <EventDetails
              event={selectedEvent}
              currentUserId={currentUserId}
              canEdit={selectedEvent.createdBy.id === currentUserId}
              onEdit={handleEditEvent}
              onDelete={() => handleDeleteEvent(selectedEvent.id)}
              onRSVP={(status) => handleRSVP(selectedEvent.id, status)}
              className="border-0 shadow-none"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}