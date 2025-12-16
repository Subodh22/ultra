'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Plus, Save, FileText, Trash2, Upload, Edit, Loader2, CheckCircle2, XCircle, Brain } from 'lucide-react'
import { formatDistance } from 'date-fns'
import { RichTextEditor } from '@/components/rich-text-editor'
import { NoteUpload } from '@/components/note-upload'

interface CornellNote {
  id: string
  title: string
  cue_column: string
  notes_area: string
  summary: string
  is_draft: boolean
  last_processed_content?: string
  last_cards_generated_at?: string
  created_at: string
  updated_at: string
}

interface UploadedNote {
  id: string
  title: string
  file_type: string
  file_size: number
  processing_status: string
  content?: string
  created_at: string
  updated_at: string
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export default function CornellNotesPage() {
  const [notes, setNotes] = useState<CornellNote[]>([])
  const [uploadedNotes, setUploadedNotes] = useState<UploadedNote[]>([])
  const [loading, setLoading] = useState(true)
  const [editingNote, setEditingNote] = useState<CornellNote | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [generatingCards, setGeneratingCards] = useState(false)
  const [generatingNoteId, setGeneratingNoteId] = useState<string | null>(null)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    loadNotes()
    loadUploadedNotes()
    
    // Check if we're coming from an uploaded note
    const fromUpload = searchParams.get('from_upload')
    if (fromUpload) {
      loadUploadedNote(fromUpload)
    }
  }, [searchParams])

  async function loadNotes() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from('cornell_notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) throw error
      setNotes(data || [])
    } catch (error) {
      console.error('Error loading notes:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadUploadedNotes() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setUploadedNotes(data || [])
    } catch (error) {
      console.error('Error loading uploaded notes:', error)
    }
  }

  async function loadUploadedNote(noteId: string) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // Fetch the uploaded note
      const { data: uploadedNote, error } = await supabase
        .from('notes')
        .select('title, content')
        .eq('id', noteId)
        .eq('user_id', user.id)
        .single()

      if (error) throw error

      if (uploadedNote) {
        // Convert plain text to HTML paragraphs
        const htmlContent = uploadedNote.content
          .split('\n\n')
          .map((para: string) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
          .join('')

        // Create a new Cornell note with the uploaded content
        setEditingNote({
          id: '',
          title: uploadedNote.title,
          cue_column: '',
          notes_area: htmlContent,
          summary: '',
          is_draft: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        setShowEditor(true)
      }
    } catch (error) {
      console.error('Error loading uploaded note:', error)
    }
  }

  function createNewNote() {
    setEditingNote({
      id: '',
      title: 'Untitled Note',
      cue_column: '',
      notes_area: '',
      summary: '',
      is_draft: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    setShowEditor(true)
  }

  function editNote(note: CornellNote) {
    setEditingNote(note)
    setShowEditor(true)
  }

  async function deleteNote(id: string) {
    if (!confirm('Delete this note?')) return

    try {
      const { error } = await supabase
        .from('cornell_notes')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadNotes()
    } catch (error) {
      console.error('Error deleting note:', error)
    }
  }

  async function deleteUploadedNote(id: string) {
    if (!confirm('Delete this uploaded note?')) return

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadUploadedNotes()
    } catch (error) {
      console.error('Error deleting uploaded note:', error)
    }
  }

  async function handleGenerateCardsForUpload(noteId: string) {
    const confirmed = confirm('Generate flashcards from this uploaded note?')
    if (!confirmed) return

    setGeneratingCards(true)
    setGeneratingNoteId(noteId)

    try {
      const response = await fetch('/api/notes/process-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_id: noteId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate cards')
      }

      const result = await response.json()
      setSuccessMessage(`Success! ${result.count} flashcard${result.count !== 1 ? 's' : ''} created!`)
      setShowSuccessDialog(true)
      loadUploadedNotes()
    } catch (error: any) {
      setSuccessMessage(`Error: ${error.message}`)
      setShowSuccessDialog(true)
    } finally {
      setGeneratingCards(false)
      setGeneratingNoteId(null)
    }
  }

  if (showEditor && editingNote) {
    return (
      <CornellEditor
        note={editingNote}
        onSave={() => {
          setShowEditor(false)
          loadNotes()
        }}
        onCancel={() => setShowEditor(false)}
      />
    )
  }

  return (
    <>
      {/* Success Dialog */}
      {showSuccessDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {successMessage.includes('Error') ? (
                  <XCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                )}
                {successMessage.includes('Error') ? 'Error' : 'Flashcards Created!'}
              </CardTitle>
              <CardDescription>
                {successMessage}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setShowSuccessDialog(false)}
                className="w-full"
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Notes</h1>
            <p className="text-muted-foreground">
              Upload files or create Cornell-style notes
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowUpload(!showUpload)}>
              <Upload className="mr-2 h-4 w-4" />
              {showUpload ? 'Hide Upload' : 'Upload'}
            </Button>
            <Button onClick={createNewNote}>
              <Plus className="mr-2 h-4 w-4" />
              New Note
            </Button>
          </div>
        </div>

      {showUpload && (
        <Card>
          <CardContent className="pt-6">
            <NoteUpload onUploadComplete={() => {
              loadUploadedNotes()
              setShowUpload(false)
            }} />
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {loading ? (
          <p>Loading notes...</p>
        ) : notes.length === 0 && uploadedNotes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No notes yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create a Cornell note or upload a file to get started
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => setShowUpload(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
                <Button onClick={createNewNote}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Note
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Cornell Notes */}
            {notes.map((note) => (
              <Card key={`cornell-${note.id}`} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader onClick={() => editNote(note)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{note.title}</CardTitle>
                      <CardDescription>
                        Updated{' '}
                        {formatDistance(new Date(note.updated_at), new Date(), {
                          addSuffix: true,
                        })}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant="outline">Cornell</Badge>
                      {note.is_draft && (
                        <Badge variant="secondary">Draft</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent onClick={() => editNote(note)}>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {stripHtml(note.summary || note.notes_area).substring(0, 150)}...
                  </p>
                </CardContent>
                <div className="px-6 pb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteNote(note.id)
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}

            {/* Uploaded Notes */}
            {uploadedNotes.map((note) => (
              <Card 
                key={`upload-${note.id}`} 
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{note.title}</CardTitle>
                      <CardDescription>
                        Uploaded{' '}
                        {formatDistance(new Date(note.created_at), new Date(), {
                          addSuffix: true,
                        })}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant="outline">Uploaded</Badge>
                      {note.processing_status === 'pending' && (
                        <Badge variant="secondary">
                          Ready
                        </Badge>
                      )}
                      {note.processing_status === 'processing' && (
                        <Badge variant="secondary">
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Processing
                        </Badge>
                      )}
                      {note.processing_status === 'completed' && (
                        <Badge variant="default">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Cards Ready
                        </Badge>
                      )}
                      {note.processing_status === 'failed' && (
                        <Badge variant="destructive">
                          <XCircle className="mr-1 h-3 w-3" />
                          Failed
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{note.file_type}</span>
                      <span>•</span>
                      <span>{(note.file_size / 1024).toFixed(2)} KB</span>
                      {note.processing_status === 'completed' && (
                        <>
                          <span>•</span>
                          <span className="text-green-600 dark:text-green-400">Cards created - ready for practice!</span>
                        </>
                      )}
                    </div>
                    {note.processing_status === 'pending' && (
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleGenerateCardsForUpload(note.id)
                        }}
                        disabled={generatingCards && generatingNoteId === note.id}
                      >
                        {generatingCards && generatingNoteId === note.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Brain className="mr-2 h-4 w-4" />
                            Generate Cards
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
                <div className="px-6 pb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteUploadedNote(note.id)
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
        </div>
      </div>
    </>
  )
}

function CornellEditor({
  note,
  onSave,
  onCancel,
}: {
  note: CornellNote
  onSave: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(note.title)
  const [cueColumn, setCueColumn] = useState(note.cue_column)
  const [notesArea, setNotesArea] = useState(note.notes_area)
  const [summary, setSummary] = useState(note.summary)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [showCardDialog, setShowCardDialog] = useState(false)
  const [existingCardsCount, setExistingCardsCount] = useState(0)
  const [pendingSave, setPendingSave] = useState(false)
  const [newContentPreview, setNewContentPreview] = useState('')
  const [hasNewContent, setHasNewContent] = useState(false)
  const supabase = createClient()

  // Detect new content (additions only, not deletions)
  function getNewlyAddedContent(currentContent: string, previousContent: string): string {
    if (!previousContent) return currentContent
    
    const currentLength = currentContent.length
    const previousLength = previousContent.length
    
    // If current is shorter, content was deleted, not added
    if (currentLength <= previousLength) {
      return ''
    }
    
    // Simple approach: if current contains all of previous, extract the new part
    if (currentContent.includes(previousContent)) {
      return currentContent.replace(previousContent, '').trim()
    }
    
    // Line-by-line comparison for additions
    const currentLines = currentContent.split('\n')
    const previousLines = previousContent.split('\n')
    
    const newLines: string[] = []
    
    for (const line of currentLines) {
      const trimmedLine = line.trim()
      if (trimmedLine && !previousLines.some(prevLine => prevLine.trim() === trimmedLine)) {
        newLines.push(line)
      }
    }
    
    return newLines.join('\n').trim()
  }

  async function handleSave(isDraft: boolean) {
    if (!isDraft) {
      // If saving as final, check for new content and existing cards
      setPendingSave(true)
      
      const currentContent = `${cueColumn}\n\n${notesArea}\n\n${summary}`
      const previousContent = note.last_processed_content || ''
      const newContent = getNewlyAddedContent(currentContent, previousContent)
      
      setNewContentPreview(newContent)
      setHasNewContent(newContent.length > 10)
      
      await checkExistingCards()
      setShowCardDialog(true)
      return
    }

    // Save draft without generating cards
    await saveToDB(isDraft)
  }

  async function checkExistingCards() {
    if (!note.id) {
      setExistingCardsCount(0)
      return
    }

    try {
      const { data, error } = await supabase
        .from('cards')
        .select('id')
        .eq('cornell_note_id', note.id)

      if (error) throw error
      setExistingCardsCount(data?.length || 0)
    } catch (error) {
      console.error('Error checking cards:', error)
      setExistingCardsCount(0)
    }
  }

  async function saveToDB(isDraft: boolean, generateCards: boolean = false, regenerateAll: boolean = false) {
    setSaving(true)
    setMessage('')
    setShowCardDialog(false)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      const noteData = {
        user_id: user.id,
        title,
        cue_column: cueColumn,
        notes_area: notesArea,
        summary,
        is_draft: isDraft,
        updated_at: new Date().toISOString(),
      }

      let savedNoteId = note.id

      if (note.id) {
        // Update existing
        const { error } = await supabase
          .from('cornell_notes')
          .update(noteData)
          .eq('id', note.id)

        if (error) throw error
      } else {
        // Create new
        const { data: newNote, error } = await supabase
          .from('cornell_notes')
          .insert(noteData)
          .select()
          .single()

        if (error) throw error
        savedNoteId = newNote.id
      }

      setMessage(isDraft ? 'Draft saved!' : 'Note saved!')

      // If saving as final and user wants to generate cards
      if (!isDraft && generateCards && savedNoteId) {
        setMessage('Note saved! Generating flashcards...')
        
        const currentContent = `${cueColumn}\n\n${notesArea}\n\n${summary}`
        
        // Call API to generate cards
        const response = await fetch('/api/notes/generate-cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cornell_note_id: savedNoteId,
            title,
            current_content: currentContent,
            previous_content: note.last_processed_content || '',
            regenerate_all: regenerateAll,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to generate cards')
        }

        const result = await response.json()
        
        if (result.count === 0) {
          setMessage('Note saved! No new content to generate cards from.')
        } else {
          setMessage(`Note saved! ${result.count} flashcard${result.count > 1 ? 's' : ''} created from new content!`)
        }
      }

      setTimeout(() => {
        onSave()
      }, 1500)
    } catch (error: any) {
      setMessage(`Error: ${error.message}`)
    } finally {
      setSaving(false)
      setPendingSave(false)
    }
  }

  return (
    <>
      {/* Card Generation Dialog */}
      {showCardDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Generate Flashcards?</CardTitle>
              <CardDescription>
                {!hasNewContent ? (
                  'No new content detected. Only deletions or edits were made.'
                ) : existingCardsCount > 0 ? (
                  `This note already has ${existingCardsCount} flashcard${existingCardsCount > 1 ? 's' : ''}. Generate cards from newly added content?`
                ) : (
                  'Would you like to generate practice flashcards from this note?'
                )}
              </CardDescription>
              {hasNewContent && newContentPreview && (
                <div className="mt-4 p-3 rounded-md bg-muted text-sm max-h-32 overflow-y-auto">
                  <p className="font-medium text-xs text-muted-foreground mb-1">New content detected:</p>
                  <p className="whitespace-pre-wrap">{newContentPreview.substring(0, 200)}{newContentPreview.length > 200 ? '...' : ''}</p>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {!hasNewContent ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => saveToDB(false, true, true)}
                      disabled={saving}
                    >
                      Regenerate All Cards Anyway
                    </Button>
                    <Button
                      onClick={() => saveToDB(false, false, false)}
                      disabled={saving}
                    >
                      Just Save (No Cards)
                    </Button>
                  </>
                ) : existingCardsCount > 0 ? (
                  <>
                    <Button
                      onClick={() => saveToDB(false, true, false)}
                      disabled={saving}
                    >
                      Generate from New Content Only
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => saveToDB(false, true, true)}
                      disabled={saving}
                    >
                      Regenerate All (Delete & Recreate)
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => saveToDB(false, false, false)}
                      disabled={saving}
                    >
                      Save Without Generating
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => saveToDB(false, true, false)}
                      disabled={saving}
                    >
                      Yes, Generate Flashcards
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => saveToDB(false, false, false)}
                      disabled={saving}
                    >
                      No, Just Save
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCardDialog(false)
                    setPendingSave(false)
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Cornell Note</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} disabled={saving || pendingSave}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => handleSave(true)} disabled={saving || pendingSave}>
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
            <Button onClick={() => handleSave(false)} disabled={saving || pendingSave}>
              <FileText className="mr-2 h-4 w-4" />
              Save Final
            </Button>
          </div>
        </div>

      {message && (
        <div className={`p-3 rounded-md text-sm ${
          message.includes('Error') 
            ? 'bg-destructive/10 text-destructive' 
            : 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
        }`}>
          {message}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter note title..."
            className="text-lg font-medium"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Cue Column */}
          <div className="md:col-span-1">
            <Label className="text-sm font-medium mb-2 block">
              Cue Column (Keywords/Questions)
            </Label>
            <RichTextEditor
              content={cueColumn}
              onChange={setCueColumn}
              placeholder="• Key terms
• Questions  
• Main ideas"
              className="min-h-[500px]"
            />
          </div>

          {/* Notes Area */}
          <div className="md:col-span-3">
            <Label className="text-sm font-medium mb-2 block">
              Notes Area (Detailed Information)
            </Label>
            <RichTextEditor
              content={notesArea}
              onChange={setNotesArea}
              placeholder="Take detailed notes here...

• Main points
• Details and examples
• Diagrams and explanations"
              className="min-h-[500px]"
            />
          </div>
        </div>

        {/* Summary Section */}
        <div>
          <Label className="text-sm font-medium mb-2 block">
            Summary (Key Takeaways)
          </Label>
          <RichTextEditor
            content={summary}
            onChange={setSummary}
            placeholder="Summarize the main points in your own words..."
            className="min-h-[150px]"
          />
        </div>
      </div>

      <div className="border-t pt-4 text-sm text-muted-foreground">
        <p><strong>Cornell Method Tips:</strong></p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li><strong>Cue Column:</strong> Write questions and keywords that relate to your notes</li>
          <li><strong>Notes Area:</strong> Record information during lectures or reading</li>
          <li><strong>Summary:</strong> Write a brief summary at the bottom after taking notes</li>
        </ul>
        </div>
      </div>
    </>
  )
}

