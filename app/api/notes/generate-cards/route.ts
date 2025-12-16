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

    const { cornell_note_id, title, content } = await request.json()

    if (!cornell_note_id || !content) {
      return NextResponse.json(
        { error: 'Missing cornell_note_id or content' },
        { status: 400 }
      )
    }

    // Check if cards already exist for this Cornell note
    const { data: existingCards } = await supabase
      .from('cards')
      .select('id')
      .eq('cornell_note_id', cornell_note_id)
      .limit(1)

    // If cards exist, delete them first (regenerate)
    if (existingCards && existingCards.length > 0) {
      await supabase
        .from('cards')
        .delete()
        .eq('cornell_note_id', cornell_note_id)
    }

    // Extract cards with AI
    const extractedCards = await extractCardsFromNote(content, title || 'Cornell Note')

    // Save cards
    const cardsToInsert = extractedCards.map((card) => ({
      cornell_note_id,
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
      console.error('Cards error:', cardsError)
      throw new Error('Failed to save cards')
    }

    return NextResponse.json({ 
      success: true, 
      count: extractedCards.length,
      message: `${extractedCards.length} flashcards created!`
    })
  } catch (error: any) {
    console.error('Error generating cards:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

