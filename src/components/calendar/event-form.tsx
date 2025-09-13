'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Video,
  Repeat,
  AlertCircle,
  Plus,
  X
} from 'lucide-react'
import { EventType, RecurrenceType } from '@prisma/client'
import { cn } from '@/lib/utils'

interface EventFormData {
  title: string
  description: string
  location: string
  startTime: string
  endTime: string
  allDay: boolean
  type: EventType
  courseId: string
  attendeeIds: string[]
  isRecurring: boolean
  recurrenceType: RecurrenceType
  recurrenceEnd: string
  zoomMeeting: boolean
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

interface EventFormProps {
  initialData?: Partial<EventFormData>
  courses: Course[]
  users: User[]
  onSubmit: (data: EventFormData) => void
  onCancel: () => void
  loading?: boolean
  className?: string
}

export default function EventForm({
  initialData,
  courses,
  users,
  onSubmit,
  onCancel,
  loading = false,
  className
}: EventFormProps) {
  const [formData, setFormData] = useState<EventFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    location: initialData?.location || '',
    startTime: initialData?.startTime || '',
    endTime: initialData?.endTime || '',
    allDay: initialData?.allDay || false,
    type: initialData?.type || EventType.MEETING,
    courseId: initialData?.courseId || '',
    attendeeIds: initialData?.attendeeIds || [],
    isRecurring: initialData?.isRecurring || false,
    recurrenceType: initialData?.recurrenceType || RecurrenceType.NONE,
    recurrenceEnd: initialData?.recurrenceEnd || '',
    zoomMeeting: initialData?.zoomMeeting || false
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: keyof EventFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleAttendeeToggle = (userId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      attendeeIds: checked 
        ? [...prev.attendeeIds, userId]
        : prev.attendeeIds.filter(id => id !== userId)
    }))
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required'
    }

    if (!formData.endTime) {
      newErrors.endTime = 'End time is required'
    }

    if (formData.startTime && formData.endTime) {
      const start = new Date(formData.startTime)
      const end = new Date(formData.endTime)
      
      if (end <= start) {
        newErrors.endTime = 'End time must be after start time'
      }
    }

    if (formData.isRecurring && formData.recurrenceType === RecurrenceType.NONE) {
      newErrors.recurrenceType = 'Please select a recurrence pattern'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateForm()) {
      onSubmit(formData)
    }
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

  const formatDateTime = (dateTime: string) => {
    if (!dateTime) return ''
    const date = new Date(dateTime)
    return date.toISOString().slice(0, 16) // Format for datetime-local input
  }

  const selectedAttendees = users.filter(user => formData.attendeeIds.includes(user.id))

  return (
    <Card className={cn("w-full max-w-4xl mx-auto", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {initialData ? 'Edit Event' : 'Create New Event'}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Event title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.title}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Event Type</Label>
                <Select value={formData.type} onValueChange={(value: EventType) => handleInputChange('type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(EventType).map(type => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <Badge className={getEventTypeColor(type)}>{type.replace('_', ' ')}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Event description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </Label>
              <Input
                id="location"
                placeholder="Event location (physical or virtual)"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
              />
            </div>
          </div>

          {/* Date and Time */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="allDay"
                checked={formData.allDay}
                onCheckedChange={(checked) => handleInputChange('allDay', checked)}
              />
              <Label htmlFor="allDay">All day event</Label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startTime" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Start {formData.allDay ? 'Date' : 'Date & Time'} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="startTime"
                  type={formData.allDay ? 'date' : 'datetime-local'}
                  value={formData.allDay ? formData.startTime.split('T')[0] : formatDateTime(formData.startTime)}
                  onChange={(e) => handleInputChange('startTime', formData.allDay ? `${e.target.value}T00:00` : e.target.value)}
                  className={errors.startTime ? 'border-red-500' : ''}
                />
                {errors.startTime && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.startTime}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  End {formData.allDay ? 'Date' : 'Date & Time'} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="endTime"
                  type={formData.allDay ? 'date' : 'datetime-local'}
                  value={formData.allDay ? formData.endTime.split('T')[0] : formatDateTime(formData.endTime)}
                  onChange={(e) => handleInputChange('endTime', formData.allDay ? `${e.target.value}T23:59` : e.target.value)}
                  className={errors.endTime ? 'border-red-500' : ''}
                />
                {errors.endTime && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.endTime}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Course Association */}
          <div className="space-y-2">
            <Label htmlFor="courseId">Associated Course (Optional)</Label>
            <Select value={formData.courseId} onValueChange={(value) => handleInputChange('courseId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {courses.map(course => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Attendees */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Attendees
            </Label>
            
            {selectedAttendees.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedAttendees.map(attendee => (
                  <Badge key={attendee.id} variant="secondary" className="flex items-center gap-1">
                    {attendee.name || attendee.email}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => handleAttendeeToggle(attendee.id, false)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-2">
              {users.map(user => (
                <div key={user.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`attendee-${user.id}`}
                    checked={formData.attendeeIds.includes(user.id)}
                    onCheckedChange={(checked) => handleAttendeeToggle(user.id, !!checked)}
                  />
                  <Label htmlFor={`attendee-${user.id}`} className="flex-1 text-sm">
                    {user.name || user.email}
                    {user.name && (
                      <span className="text-muted-foreground ml-1">({user.email})</span>
                    )}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Integration Options */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="zoomMeeting"
                checked={formData.zoomMeeting}
                onCheckedChange={(checked) => handleInputChange('zoomMeeting', checked)}
              />
              <Label htmlFor="zoomMeeting" className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Create Zoom Meeting
              </Label>
            </div>

            {formData.zoomMeeting && (
              <div className="ml-6 text-sm text-muted-foreground">
                A Zoom meeting will be automatically created and the join link will be included in the event details.
              </div>
            )}
          </div>

          {/* Recurrence */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="isRecurring"
                checked={formData.isRecurring}
                onCheckedChange={(checked) => handleInputChange('isRecurring', checked)}
              />
              <Label htmlFor="isRecurring" className="flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                Recurring Event
              </Label>
            </div>

            {formData.isRecurring && (
              <div className="ml-6 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="recurrenceType">Repeat Pattern</Label>
                    <Select 
                      value={formData.recurrenceType} 
                      onValueChange={(value: RecurrenceType) => handleInputChange('recurrenceType', value)}
                    >
                      <SelectTrigger className={errors.recurrenceType ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select pattern" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={RecurrenceType.DAILY}>Daily</SelectItem>
                        <SelectItem value={RecurrenceType.WEEKLY}>Weekly</SelectItem>
                        <SelectItem value={RecurrenceType.MONTHLY}>Monthly</SelectItem>
                        <SelectItem value={RecurrenceType.YEARLY}>Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.recurrenceType && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.recurrenceType}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recurrenceEnd">End Date (Optional)</Label>
                    <Input
                      id="recurrenceEnd"
                      type="date"
                      value={formData.recurrenceEnd.split('T')[0]}
                      onChange={(e) => handleInputChange('recurrenceEnd', `${e.target.value}T23:59`)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {initialData ? 'Updating...' : 'Creating...'}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  {initialData ? 'Update Event' : 'Create Event'}
                </div>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}