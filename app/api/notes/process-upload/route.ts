import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { extractCardsFromNote } from '@/lib/openai'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { note_id } = await request.json()

    if (!note_id) {
      return NextResponse.json(
        { error: 'Missing note_id' },
        { status: 400 }
      )
    }

    // Get note
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('*')
      .eq('id', note_id)
      .eq('user_id', user.id)
      .single()

    if (noteError || !note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    // Update status to processing
    await supabase
      .from('notes')
      .update({ processing_status: 'processing' })
      .eq('id', note_id)

    // Get content (should already be saved)
    let textContent = note.content

    // If content not saved, download and extract
    if (!textContent) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('notes')
        .download(note.file_path)

      if (downloadError || !fileData) {
        throw new Error('Failed to download file')
      }

      textContent = await fileData.text()
      
      // Save content for future use
      await supabase
        .from('notes')
        .update({ content: textContent })
        .eq('id', note_id)
    }

    if (!textContent || textContent.trim().length < 50) {
      throw new Error('Insufficient text content')
    }

    // Extract cards with AI
    const extractedCards = await extractCardsFromNote(textContent, note.title)

    // Save cards
    const cardsToInsert = extractedCards.map((card) => ({
      note_id: note_id,
      user_id: user.id,
      card_type: card.type,
      question: card.question,
      answer: card.answer,
      ease_factor: 2.5,
      interval: 1,
      repetitions: 0,
      next_review: new Date().toISOString(),
    }))

    const { error: cardsError } = await supabase
      .from('cards')
      .insert(cardsToInsert)

    if (cardsError) {
      throw new Error('Failed to save cards')
    }

    // Update to completed
    await supabase
      .from('notes')
      .update({ processing_status: 'completed' })
      .eq('id', note_id)

    return NextResponse.json({ 
      success: true, 
      count: extractedCards.length,
      message: `${extractedCards.length} flashcards created!`
    })
  } catch (error: any) {
    console.error('Error processing upload:', error)
    
    // Update status to failed
    const supabase = await createClient()
    const { note_id } = await request.json()
    if (note_id) {
      await supabase
        .from('notes')
        .update({ processing_status: 'failed' })
        .eq('id', note_id)
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

