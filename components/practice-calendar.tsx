'use client'

import { useState, useEffect } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar as CalendarIcon, X } from 'lucide-react'

const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  description?: string
}

interface Note {
  id: string
  title: string
  type: 'cornell' | 'uploaded'
}

export function PracticeCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNoteId, setSelectedNoteId] = useState('')
  const [selectedNoteType, setSelectedNoteType] = useState<'cornell' | 'uploaded'>('cornell')
  const [scheduling, setScheduling] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadEvents()
    loadNotes()
  }, [])

  async function loadEvents() {
    try {
      const start = new Date()
      start.setDate(start.getDate() - 7)
      const end = new Date()
      end.setDate(end.getDate() + 30)

      const response = await fetch(
        `/api/calendar/events?start=${start.toISOString()}&end=${end.toISOString()}`
      )
      const data = await response.json()

      const formattedEvents = data.events.map((event: any) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      }))

      setEvents(formattedEvents)
    } catch (error) {
      console.error('Error loading events:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadNotes() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get Cornell notes with cards
      const { data: cornellNotes } = await supabase
        .from('cornell_notes')
        .select('id, title')
        .eq('user_id', user.id)
        .eq('is_draft', false)

      const notesList: Note[] = []
      
      if (cornellNotes) {
        cornellNotes.forEach((note: any) => {
          notesList.push({
            id: note.id,
            title: note.title,
            type: 'cornell',
          })
        })
      }

      setNotes(notesList)
    } catch (error) {
      console.error('Error loading notes:', error)
    }
  }

  function handleSelectSlot({ start, end }: { start: Date; end: Date }) {
    setSelectedSlot({ start, end })
    setShowScheduleDialog(true)
  }

  async function handleSchedule() {
    if (!selectedSlot || !selectedNoteId) return

    setScheduling(true)

    try {
      const selectedNote = notes.find(n => n.id === selectedNoteId)
      if (!selectedNote) return

      const response = await fetch('/api/calendar/schedule-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note_id: selectedNoteId,
          note_title: selectedNote.title,
          note_type: selectedNote.type,
          scheduled_time: selectedSlot.start.toISOString(),
          duration: 30,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to schedule')
      }

      alert('Practice session scheduled!')
      setShowScheduleDialog(false)
      setSelectedSlot(null)
      setSelectedNoteId('')
      loadEvents() // Refresh calendar
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setScheduling(false)
    }
  }

  return (
    <>
      {/* Schedule Dialog */}
      {showScheduleDialog && selectedSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Schedule Practice</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowScheduleDialog(false)
                    setSelectedSlot(null)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                {format(selectedSlot.start, 'MMMM d, yyyy')} at {format(selectedSlot.start, 'h:mm a')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="note-select">Select Note to Practice</Label>
                <Select value={selectedNoteId} onValueChange={(value) => {
                  setSelectedNoteId(value)
                  const note = notes.find(n => n.id === value)
                  if (note) setSelectedNoteType(note.type)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a note..." />
                  </SelectTrigger>
                  <SelectContent>
                    {notes.map((note) => (
                      <SelectItem key={note.id} value={note.id}>
                        {note.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSchedule}
                  disabled={scheduling || !selectedNoteId}
                  className="flex-1"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {scheduling ? 'Scheduling...' : 'Schedule Practice'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowScheduleDialog(false)
                    setSelectedSlot(null)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="h-[600px] bg-card rounded-lg p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p>Loading calendar...</p>
          </div>
        ) : (
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            titleAccessor="title"
            style={{ height: '100%' }}
            selectable
            onSelectSlot={handleSelectSlot}
            popup
          />
        )}
      </div>
    </>
  )
}

