'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DrillInterface } from '@/components/drill-interface'

function SessionContent() {
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [noteTitle, setNoteTitle] = useState('')
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadCards()
  }, [])

  async function loadCards() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const mode = searchParams.get('mode')
      const noteId = searchParams.get('note_id')
      const noteType = searchParams.get('type')

      let query = supabase
        .from('cards')
        .select('*')
        .eq('user_id', user.id)
        .lte('next_review', new Date().toISOString())
        .order('next_review', { ascending: true })

      if (mode === 'all') {
        setNoteTitle('All Notes')
        query = query.limit(20)
      } else if (noteId && noteType) {
        if (noteType === 'cornell') {
          query = query.eq('cornell_note_id', noteId)
          
          // Get note title
          const { data: note } = await supabase
            .from('cornell_notes')
            .select('title')
            .eq('id', noteId)
            .single()
          
          if (note) setNoteTitle(note.title)
        } else {
          query = query.eq('note_id', noteId)
          
          // Get note title
          const { data: note } = await supabase
            .from('notes')
            .select('title')
            .eq('id', noteId)
            .single()
          
          if (note) setNoteTitle(note.title)
        }
      }

      const { data } = await query

      if (!data || data.length === 0) {
        router.push('/dashboard/drill')
        return
      }

      setCards(data)
    } catch (error) {
      console.error('Error loading cards:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 p-6">
        <p>Loading practice session...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Practice Session</h1>
        <p className="text-muted-foreground">
          {noteTitle} • {cards.length} cards ready for review
        </p>
      </div>

      <DrillInterface initialCards={cards} />
    </div>
  )
}

export default function SessionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SessionContent />
    </Suspense>
  )
}

