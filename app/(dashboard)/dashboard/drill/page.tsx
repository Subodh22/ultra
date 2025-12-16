'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BookOpen, Brain, FileText, Play, Calendar, X } from 'lucide-react'
import Link from 'next/link'

interface NoteWithCards {
  id: string
  title: string
  type: 'cornell' | 'uploaded'
  total_cards: number
  due_cards: number
}

export default function DrillPage() {
  const [notes, setNotes] = useState<NoteWithCards[]>([])
  const [loading, setLoading] = useState(true)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [selectedNote, setSelectedNote] = useState<NoteWithCards | null>(null)
  const [scheduledTime, setScheduledTime] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadNotesWithCards()
  }, [])

  async function loadNotesWithCards() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // Get Cornell notes with card counts
      const { data: cornellNotes } = await supabase
        .from('cornell_notes')
        .select(`
          id,
          title,
          cards:cards!cornell_note_id(id, next_review)
        `)
        .eq('user_id', user.id)
        .eq('is_draft', false)

      // Get uploaded notes with card counts
      const { data: uploadedNotes } = await supabase
        .from('notes')
        .select(`
          id,
          title,
          cards:cards!note_id(id, next_review)
        `)
        .eq('user_id', user.id)
        .eq('processing_status', 'completed')

      const now = new Date().toISOString()
      
      const cornellWithCards: NoteWithCards[] = (cornellNotes || [])
        .filter((note: any) => note.cards && note.cards.length > 0)
        .map((note: any) => ({
          id: note.id,
          title: note.title,
          type: 'cornell' as const,
          total_cards: note.cards.length,
          due_cards: note.cards.filter((card: any) => card.next_review <= now).length,
        }))

      const uploadedWithCards: NoteWithCards[] = (uploadedNotes || [])
        .filter((note: any) => note.cards && note.cards.length > 0)
        .map((note: any) => ({
          id: note.id,
          title: note.title,
          type: 'uploaded' as const,
          total_cards: note.cards.length,
          due_cards: note.cards.filter((card: any) => card.next_review <= now).length,
        }))

      setNotes([...cornellWithCards, ...uploadedWithCards])
    } catch (error) {
      console.error('Error loading notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalDue = notes.reduce((sum, note) => sum + note.due_cards, 0)

  async function handleSchedulePractice() {
    if (!selectedNote || !scheduledTime) return

    setScheduling(true)

    try {
      const response = await fetch('/api/calendar/schedule-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note_id: selectedNote.id,
          note_title: selectedNote.title,
          note_type: selectedNote.type,
          scheduled_time: scheduledTime,
          duration: 30,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to schedule')
      }

      const result = await response.json()
      alert(`Practice scheduled! Added to your calendar.`)
      setShowScheduleDialog(false)
      setSelectedNote(null)
      setScheduledTime('')
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setScheduling(false)
    }
  }

  return (
    <>
      {/* Schedule Dialog */}
      {showScheduleDialog && selectedNote && (
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
                    setSelectedNote(null)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                Schedule practice for "{selectedNote.title}"
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="schedule-time">Date & Time</Label>
                <Input
                  id="schedule-time"
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSchedulePractice}
                  disabled={scheduling || !scheduledTime}
                  className="flex-1"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {scheduling ? 'Scheduling...' : 'Add to Calendar'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowScheduleDialog(false)
                    setSelectedNote(null)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Practice</h1>
          <p className="text-muted-foreground">
            {totalDue} cards ready for review across {notes.length} notes
          </p>
        </div>
        {totalDue > 0 && (
          <Link href="/dashboard/drill/session?mode=all">
            <Button size="lg">
              <Brain className="mr-2 h-5 w-5" />
              Practice All ({totalDue})
            </Button>
          </Link>
        )}
      </div>

      {loading ? (
        <p>Loading practice sessions...</p>
      ) : notes.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No flashcards yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Save a Cornell note as "Final" or upload a file to generate flashcards
            </p>
            <Link href="/dashboard/notes">
              <Button>
                <FileText className="mr-2 h-4 w-4" />
                Go to Notes
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <Card key={`${note.type}-${note.id}`} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{note.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {note.total_cards} total cards
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    {note.type === 'cornell' ? 'Cornell' : 'Uploaded'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    {note.due_cards > 0 ? (
                      <>
                        <Badge variant="default">
                          {note.due_cards} due now
                        </Badge>
                        <Link href={`/dashboard/drill/session?note_id=${note.id}&type=${note.type}`}>
                          <Button size="sm">
                            <Play className="mr-2 h-4 w-4" />
                            Practice
                          </Button>
                        </Link>
                      </>
                    ) : (
                      <Badge variant="secondary">
                        ✅ All caught up!
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedNote(note)
                        setShowScheduleDialog(true)
                      }}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Schedule
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </>
  )
}

