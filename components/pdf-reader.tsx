'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { createClient } from '@/lib/supabase/client'

// Import react-pdf CSS styles
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Bookmark, 
  BookmarkCheck, 
  Highlighter, 
  StickyNote, 
  ChevronLeft, 
  ChevronRight,
  ZoomIn,
  ZoomOut,
  X,
  Save,
  FileText,
  Brain
} from 'lucide-react'
import { RichTextEditor } from '@/components/rich-text-editor'
import { Label } from '@/components/ui/label'

// Set up PDF.js worker - use version that matches react-pdf's dependency
if (typeof window !== 'undefined') {
  // react-pdf uses pdfjs-dist@5.4.296, so we need to use that version's worker
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs`
}

interface PDFReaderProps {
  pdfUrl: string
  materialId: string
  materialTitle: string
}

interface Highlight {
  id: string
  pageNumber: number
  textContent: string
  coordinates: { x: number; y: number; width: number; height: number }
  color: string
}

interface Bookmark {
  id: string
  pageNumber: number
  note?: string
}

interface PageNote {
  id: string
  pageNumber: number
  noteText: string
  position?: { x: number; y: number }
}

export function PDFReader({ pdfUrl, materialId, materialTitle }: PDFReaderProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.2)
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [pageNotes, setPageNotes] = useState<PageNote[]>([])
  const [isHighlighting, setIsHighlighting] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null)
  const [showHighlightPopup, setShowHighlightPopup] = useState(false)
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [notePageNumber, setNotePageNumber] = useState(1)
  const [highlightColor, setHighlightColor] = useState('#ffff00')
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showNotesSidebar, setShowNotesSidebar] = useState(false)
  const [cornellNote, setCornellNote] = useState({
    title: materialTitle,
    cueColumn: '',
    notesArea: '',
    summary: '',
  })
  const [savingNote, setSavingNote] = useState(false)
  const [showCardDialog, setShowCardDialog] = useState(false)
  const [existingCardsCount, setExistingCardsCount] = useState(0)
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const supabase = createClient()

  useEffect(() => {
    loadAnnotations()
  }, [materialId])

  async function loadAnnotations() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // Load highlights
      const { data: highlightsData } = await supabase
        .from('pdf_highlights')
        .select('*')
        .eq('reading_material_id', materialId)
        .eq('user_id', user.id)

      if (highlightsData) {
        setHighlights(highlightsData.map(h => ({
          id: h.id,
          pageNumber: h.page_number,
          textContent: h.text_content,
          coordinates: h.coordinates,
          color: h.color,
        })))
      }

      // Load bookmarks
      const { data: bookmarksData } = await supabase
        .from('pdf_bookmarks')
        .select('*')
        .eq('reading_material_id', materialId)
        .eq('user_id', user.id)

      if (bookmarksData) {
        setBookmarks(bookmarksData.map(b => ({
          id: b.id,
          pageNumber: b.page_number,
          note: b.note,
        })))
      }

      // Load page notes
      const { data: notesData } = await supabase
        .from('pdf_page_notes')
        .select('*')
        .eq('reading_material_id', materialId)
        .eq('user_id', user.id)

      if (notesData) {
        setPageNotes(notesData.map(n => ({
          id: n.id,
          pageNumber: n.page_number,
          noteText: n.note_text,
          position: n.position,
        })))
      }
    } catch (error) {
      console.error('Error loading annotations:', error)
    }
  }

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    // Load last bookmark position if exists
    const lastBookmark = bookmarks.sort((a, b) => b.pageNumber - a.pageNumber)[0]
    if (lastBookmark) {
      setPageNumber(lastBookmark.pageNumber)
    }
  }

  function handleTextSelection() {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      setShowHighlightPopup(false)
      return
    }

    const text = selection.toString().trim()
    if (!text) {
      setShowHighlightPopup(false)
      if (isHighlighting) {
        setIsHighlighting(false)
      }
      return
    }

    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    
    // Find which page this selection is on
    let selectedPage = pageNumber
    for (const [pageNum, pageElement] of pageRefs.current.entries()) {
      if (pageElement) {
        const pageRect = pageElement.getBoundingClientRect()
        if (rect.top >= pageRect.top && rect.bottom <= pageRect.bottom) {
          selectedPage = pageNum
          break
        }
      }
    }

    setSelectedText(text)
    setSelectionRect(rect)
    
    // If highlighting mode is active, create highlight immediately
    if (isHighlighting) {
      createHighlight(text, selectedPage, rect)
      selection.removeAllRanges()
      setIsHighlighting(false)
    } else {
      // Show highlight popup
      setShowHighlightPopup(true)
    }
  }

  async function handleHighlightSelectedText() {
    if (!selectedText || !selectionRect) return

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    
    // Find which page this selection is on
    let selectedPage = pageNumber
    for (const [pageNum, pageElement] of pageRefs.current.entries()) {
      if (pageElement) {
        const pageRect = pageElement.getBoundingClientRect()
        if (rect.top >= pageRect.top && rect.bottom <= pageRect.bottom) {
          selectedPage = pageNum
          break
        }
      }
    }

    await createHighlight(selectedText, selectedPage, rect)
    
    if (selection) {
      selection.removeAllRanges()
    }
    setShowHighlightPopup(false)
    setSelectedText('')
    setSelectionRect(null)
  }

  async function createHighlight(text: string, pageNum: number, rect: DOMRect) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const pageElement = pageRefs.current.get(pageNum)
      if (!pageElement) return

      const pageRect = pageElement.getBoundingClientRect()
      const pageScale = scale
      
      // Adjust coordinates based on page scale
      const coordinates = {
        x: (rect.left - pageRect.left) / pageScale,
        y: (rect.top - pageRect.top) / pageScale,
        width: rect.width / pageScale,
        height: rect.height / pageScale,
      }

      const { data, error } = await supabase
        .from('pdf_highlights')
        .insert({
          user_id: user.id,
          reading_material_id: materialId,
          page_number: pageNum,
          text_content: text,
          coordinates: coordinates,
          color: highlightColor,
        })
        .select()
        .single()

      if (error) throw error

      setHighlights([...highlights, {
        id: data.id,
        pageNumber: pageNum,
        textContent: text,
        coordinates: coordinates,
        color: highlightColor,
      }])
    } catch (error) {
      console.error('Error creating highlight:', error)
      alert('Failed to create highlight. Please try again.')
    }
  }

  async function deleteHighlight(highlightId: string) {
    try {
      const { error } = await supabase
        .from('pdf_highlights')
        .delete()
        .eq('id', highlightId)

      if (error) throw error

      setHighlights(highlights.filter(h => h.id !== highlightId))
    } catch (error) {
      console.error('Error deleting highlight:', error)
    }
  }

  async function toggleBookmark() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const existingBookmark = bookmarks.find(b => b.pageNumber === pageNumber)

      if (existingBookmark) {
        // Remove bookmark
        const { error } = await supabase
          .from('pdf_bookmarks')
          .delete()
          .eq('id', existingBookmark.id)

        if (error) throw error

        setBookmarks(bookmarks.filter(b => b.id !== existingBookmark.id))
      } else {
        // Add bookmark
        const { data, error } = await supabase
          .from('pdf_bookmarks')
          .insert({
            user_id: user.id,
            reading_material_id: materialId,
            page_number: pageNumber,
          })
          .select()
          .single()

        if (error) throw error

        setBookmarks([...bookmarks, {
          id: data.id,
          pageNumber: pageNumber,
        }])
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error)
    }
  }

  function openNoteDialog() {
    const existingNote = pageNotes.find(n => n.pageNumber === pageNumber)
    if (existingNote) {
      setNoteText(existingNote.noteText)
    } else {
      setNoteText('')
    }
    setNotePageNumber(pageNumber)
    setShowNoteDialog(true)
  }

  async function saveNote() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const existingNote = pageNotes.find(n => n.pageNumber === notePageNumber)

      if (existingNote) {
        // Update note
        const { error } = await supabase
          .from('pdf_page_notes')
          .update({ note_text: noteText })
          .eq('id', existingNote.id)

        if (error) throw error

        setPageNotes(pageNotes.map(n => 
          n.id === existingNote.id 
            ? { ...n, noteText }
            : n
        ))
      } else {
        // Create note
        const { data, error } = await supabase
          .from('pdf_page_notes')
          .insert({
            user_id: user.id,
            reading_material_id: materialId,
            page_number: notePageNumber,
            note_text: noteText,
          })
          .select()
          .single()

        if (error) throw error

        setPageNotes([...pageNotes, {
          id: data.id,
          pageNumber: notePageNumber,
          noteText: noteText,
        }])
      }

      setShowNoteDialog(false)
    } catch (error) {
      console.error('Error saving note:', error)
    }
  }

  function getPageHighlights(pageNum: number): Highlight[] {
    return highlights.filter(h => h.pageNumber === pageNum)
  }

  function getPageNote(pageNum: number): PageNote | undefined {
    return pageNotes.find(n => n.pageNumber === pageNum)
  }

  const hasBookmark = bookmarks.some(b => b.pageNumber === pageNumber)
  const currentPageNote = getPageNote(pageNumber)

  async function checkExistingCards() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // We'll check cards after saving the note, so we need the note ID
      // For now, just return 0
      setExistingCardsCount(0)
    } catch (error) {
      console.error('Error checking cards:', error)
      setExistingCardsCount(0)
    }
  }

  async function saveCornellNote(generateCards: boolean = false, regenerateAll: boolean = false) {
    setSavingNote(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      const noteData = {
        user_id: user.id,
        title: cornellNote.title || `${materialTitle} - Notes`,
        cue_column: cornellNote.cueColumn,
        notes_area: cornellNote.notesArea,
        summary: cornellNote.summary,
        is_draft: false,
        updated_at: new Date().toISOString(),
      }

      const { data: savedNote, error } = await supabase
        .from('cornell_notes')
        .insert(noteData)
        .select()
        .single()

      if (error) throw error

      // If user wants to generate cards
      if (generateCards && savedNote) {
        const response = await fetch('/api/notes/generate-cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            note_id: savedNote.id,
            note_type: 'cornell',
            regenerate_all: regenerateAll,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to generate cards')
        }

        const result = await response.json()
        alert(`Success! ${result.count} flashcard${result.count !== 1 ? 's' : ''} created!`)
      }

      alert('Cornell note saved successfully!')
      setShowNotesSidebar(false)
    } catch (error: unknown) {
      alert(`Error: ${error instanceof Error ? error.message : 'An error occurred'}`)
    } finally {
      setSavingNote(false)
      setShowCardDialog(false)
    }
  }

  async function handleSaveFinal() {
    // Check if cards already exist (we'll check after saving)
    await checkExistingCards()
    
    if (existingCardsCount > 0) {
      setShowCardDialog(true)
    } else {
      // No existing cards, ask if they want to generate
      const confirmed = confirm('Generate flashcards from this Cornell note?')
      if (confirmed) {
        await saveCornellNote(true, false)
      } else {
        await saveCornellNote(false, false)
      }
    }
  }

  // Handle swipe gestures
  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0]
    setTouchStart({ x: touch.clientX, y: touch.clientY })
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStart) return

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStart.x
    const deltaY = touch.clientY - touchStart.y

    // Only handle horizontal swipes (ignore if highlighting)
    if (!isHighlighting && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        // Swipe right - previous page
        setPageNumber(Math.max(1, pageNumber - 1))
      } else {
        // Swipe left - next page
        setPageNumber(Math.min(numPages, pageNumber + 1))
      }
    }

    setTouchStart(null)
  }

  return (
    <div className="flex gap-4 h-full w-full overflow-hidden">
      {/* Left Sidebar - Bookmarks, Highlights, and Notes */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} shrink-0 transition-all duration-300 overflow-hidden`}>
        <div className={`${sidebarOpen ? 'opacity-100' : 'opacity-0'} space-y-4 overflow-y-auto h-full px-4 py-4`}>
        {/* Bookmarks */}
        {bookmarks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookmarkCheck className="h-5 w-5" />
                Bookmarks ({bookmarks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {bookmarks
                  .sort((a, b) => a.pageNumber - b.pageNumber)
                  .map((bookmark) => (
                    <div
                      key={bookmark.id}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                        bookmark.pageNumber === pageNumber
                          ? 'bg-primary/10 border border-primary'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => {
                        setPageNumber(bookmark.pageNumber)
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                    >
                      <div className="flex-1">
                        <p className="font-medium">Page {bookmark.pageNumber}</p>
                        {bookmark.note && (
                          <p className="text-sm text-muted-foreground">{bookmark.note}</p>
                        )}
                      </div>
                      <BookmarkCheck className="h-4 w-4 shrink-0" />
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Highlights */}
        {highlights.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Highlighter className="h-5 w-5" />
                Highlights ({highlights.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {highlights
                  .sort((a, b) => a.pageNumber - b.pageNumber)
                  .map((highlight) => (
                    <div
                      key={highlight.id}
                      className={`p-2 rounded cursor-pointer group transition-colors ${
                        highlight.pageNumber === pageNumber
                          ? 'bg-primary/10 border border-primary'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => {
                        setPageNumber(highlight.pageNumber)
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className="w-4 h-4 rounded shrink-0 mt-0.5"
                          style={{ backgroundColor: highlight.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">Page {highlight.pageNumber}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {highlight.textContent}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm('Delete this highlight?')) {
                              deleteHighlight(highlight.id)
                            }
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Page Notes */}
        {pageNotes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="h-5 w-5" />
                Page Notes ({pageNotes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pageNotes
                  .sort((a, b) => a.pageNumber - b.pageNumber)
                  .map((note) => (
                    <div
                      key={note.id}
                      className={`p-2 rounded cursor-pointer transition-colors ${
                        note.pageNumber === pageNumber
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                          : 'hover:bg-muted border border-transparent'
                      }`}
                      onClick={() => {
                        setPageNumber(note.pageNumber)
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <StickyNote className="h-4 w-4 mt-0.5 shrink-0 text-yellow-600 dark:text-yellow-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">Page {note.pageNumber}</p>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {note.noteText}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {bookmarks.length === 0 && highlights.length === 0 && pageNotes.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No bookmarks, highlights, or notes yet.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Use the toolbar above to add them!
              </p>
            </CardContent>
          </Card>
        )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-4 overflow-y-auto min-w-0 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-2">
            {/* Sidebar Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            >
              {sidebarOpen ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
            disabled={pageNumber === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {pageNumber} / {numPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
            disabled={pageNumber === numPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={isHighlighting ? "default" : "outline"}
            size="sm"
            onClick={() => setIsHighlighting(!isHighlighting)}
          >
            <Highlighter className="h-4 w-4 mr-2" />
            Highlight
          </Button>
          <Button
            variant={hasBookmark ? "default" : "outline"}
            size="sm"
            onClick={toggleBookmark}
          >
            {hasBookmark ? (
              <>
                <BookmarkCheck className="h-4 w-4 mr-2" />
                Bookmarked
              </>
            ) : (
              <>
                <Bookmark className="h-4 w-4 mr-2" />
                Bookmark
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={openNoteDialog}
          >
            <StickyNote className="h-4 w-4 mr-2" />
            {currentPageNote ? 'Edit Note' : 'Add Note'}
          </Button>
          <Button
            variant={showNotesSidebar ? "default" : "outline"}
            size="sm"
            onClick={() => setShowNotesSidebar(!showNotesSidebar)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Cornell Notes
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale(Math.max(0.5, scale - 0.1))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm w-16 text-center">{Math.round(scale * 100)}%</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale(Math.min(3, scale + 0.1))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {/* PDF Document - Book-style single page view */}
        <div 
          className="relative flex justify-center items-center bg-gray-100 dark:bg-gray-900 p-2 rounded-lg flex-1 min-h-0 overflow-auto"
          onMouseUp={handleTextSelection}
          onTouchStart={handleTouchStart}
          onTouchEnd={(e) => {
            handleTouchEnd(e)
            handleTextSelection()
          }}
          style={{ userSelect: 'text' }}
        >
        <div className="relative w-full max-w-4xl mx-auto" id="pdf-container">
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onItemClick={(item) => {
              // Handle internal links to other pages
              if (item && 'dest' in item && item.dest) {
                if (typeof item.dest === 'string') {
                  // If dest is a string, try to extract page number
                  const pageMatch = item.dest.match(/page\s*(\d+)/i)
                  if (pageMatch) {
                    const targetPage = parseInt(pageMatch[1], 10)
                    if (targetPage > 0 && targetPage <= numPages) {
                      setPageNumber(targetPage)
                    }
                  }
                } else if (Array.isArray(item.dest) && item.dest.length > 0) {
                  // If dest is an array, the first element might be a page reference
                  const destValue = item.dest[0]
                  if (typeof destValue === 'object' && destValue !== null && 'num' in destValue) {
                    const targetPage = (destValue as { num: number }).num + 1 // PDF pages are 0-indexed
                    if (targetPage > 0 && targetPage <= numPages) {
                      setPageNumber(targetPage)
                    }
                  } else if (typeof destValue === 'number') {
                    const targetPage = destValue + 1
                    if (targetPage > 0 && targetPage <= numPages) {
                      setPageNumber(targetPage)
                    }
                  }
                }
              }
            }}
            loading={<div className="p-8 text-center">Loading PDF...</div>}
            error={<div className="p-8 text-center text-destructive">Error loading PDF</div>}
          >
            {/* Only render the current page */}
            <div
              key={`page_${pageNumber}`}
              ref={(el) => {
                if (el) pageRefs.current.set(pageNumber, el)
              }}
              className="relative mx-auto"
              style={{ 
                touchAction: isHighlighting ? 'none' : 'pan-y',
              }}
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="shadow-2xl mx-auto"
              />
              {/* Render highlights for current page */}
              {getPageHighlights(pageNumber).map((highlight) => (
                <div
                  key={highlight.id}
                  className="absolute pointer-events-auto cursor-pointer group"
                  style={{
                    left: `${highlight.coordinates.x * scale}px`,
                    top: `${highlight.coordinates.y * scale}px`,
                    width: `${highlight.coordinates.width * scale}px`,
                    height: `${highlight.coordinates.height * scale}px`,
                    backgroundColor: highlight.color,
                    opacity: 0.3,
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('Delete this highlight?')) {
                      deleteHighlight(highlight.id)
                    }
                  }}
                  title={highlight.textContent}
                >
                  <div className="absolute inset-0 bg-transparent group-hover:bg-black/10 transition-colors" />
                </div>
              ))}
            </div>
          </Document>
        </div>
        
        {/* Navigation buttons - always visible, only buttons are clickable */}
        {pageNumber > 1 && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-30">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setPageNumber(Math.max(1, pageNumber - 1))
              }}
              className="opacity-70 hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 rounded-full p-3 shadow-lg cursor-pointer"
              title="Go to previous page"
            >
              <ChevronLeft className="h-6 w-6 text-white" />
            </button>
          </div>
        )}
        {pageNumber < numPages && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setPageNumber(Math.min(numPages, pageNumber + 1))
              }}
              className="opacity-70 hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 rounded-full p-3 shadow-lg cursor-pointer"
              title="Go to next page"
            >
              <ChevronRight className="h-6 w-6 text-white" />
            </button>
          </div>
        )}
        </div>
      </div>

      {/* Cornell Notes Sidebar */}
      {showNotesSidebar && (
        <div className="w-96 shrink-0 border-l bg-card overflow-y-auto">
          <div className="p-4 space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Cornell Notes
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotesSidebar(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="note-title">Title</Label>
                <Input
                  id="note-title"
                  value={cornellNote.title}
                  onChange={(e) => setCornellNote({ ...cornellNote, title: e.target.value })}
                  placeholder="Note title..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cue-column">Cue Column (Questions/Keywords)</Label>
                <div className="border rounded-lg">
                  <RichTextEditor
                    content={cornellNote.cueColumn}
                    onChange={(content) => setCornellNote({ ...cornellNote, cueColumn: content })}
                    placeholder="Write questions or keywords here..."
                    className="min-h-[150px]"
                  />
                </div>
              </div>

              <div className="space-y-2 flex-1">
                <Label htmlFor="notes-area">Notes Area</Label>
                <div className="border rounded-lg flex-1">
                  <RichTextEditor
                    content={cornellNote.notesArea}
                    onChange={(content) => setCornellNote({ ...cornellNote, notesArea: content })}
                    placeholder="Write your notes here..."
                    className="min-h-[300px]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  id="summary"
                  value={cornellNote.summary}
                  onChange={(e) => setCornellNote({ ...cornellNote, summary: e.target.value })}
                  placeholder="Write a summary of the key points..."
                  rows={4}
                />
              </div>
            </div>

            <div className="space-y-2 shrink-0 pt-4 border-t">
              <Button
                onClick={handleSaveFinal}
                disabled={savingNote}
                className="w-full"
              >
                {savingNote ? (
                  <>
                    <Save className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Save & Generate Cards
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => saveCornellNote(false, false)}
                disabled={savingNote}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Without Cards
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Card Generation Dialog */}
      {showCardDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Generate Flashcards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This note already has {existingCardsCount} card{existingCardsCount !== 1 ? 's' : ''}. What would you like to do?
              </p>
              <div className="space-y-2">
                <Button
                  onClick={() => saveCornellNote(true, false)}
                  disabled={savingNote}
                  className="w-full"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Add Cards from New Content
                </Button>
                <Button
                  variant="outline"
                  onClick={() => saveCornellNote(true, true)}
                  disabled={savingNote}
                  className="w-full"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Regenerate All Cards
                </Button>
                <Button
                  variant="outline"
                  onClick={() => saveCornellNote(false, false)}
                  disabled={savingNote}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Without Generating Cards
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Highlight Popup */}
      {showHighlightPopup && selectionRect && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 flex items-center gap-2"
          style={{
            left: `${selectionRect.left + selectionRect.width / 2}px`,
            top: `${selectionRect.top - 50}px`,
            transform: 'translateX(-50%)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            size="sm"
            onClick={handleHighlightSelectedText}
            className="flex items-center gap-2"
          >
            <Highlighter className="h-4 w-4" />
            Highlight
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowHighlightPopup(false)
              const selection = window.getSelection()
              if (selection) {
                selection.removeAllRanges()
              }
              setSelectedText('')
              setSelectionRect(null)
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Note Dialog */}
      {showNoteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Page {notePageNumber} Note</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNoteDialog(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Write your note for this page..."
                rows={6}
              />
              <div className="flex gap-2">
                <Button onClick={saveNote} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Save Note
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowNoteDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}


