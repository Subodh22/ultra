import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { extractCardsFromNote } from '@/lib/openai'

// Function to extract only new content
function getNewContent(currentContent: string, previousContent: string): string {
  if (!previousContent) return currentContent
  
  // Split into lines for comparison
  const currentLines = currentContent.split('\n')
  const previousLines = previousContent.split('\n')
  
  // Find lines that are in current but not in previous
  const newLines: string[] = []
  
  for (const line of currentLines) {
    const trimmedLine = line.trim()
    if (trimmedLine && !previousLines.some(prevLine => prevLine.trim() === trimmedLine)) {
      newLines.push(line)
    }
  }
  
  return newLines.join('\n').trim()
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { cornell_note_id, title, current_content, previous_content, regenerate_all } = await request.json()

    if (!cornell_note_id || !current_content) {
      return NextResponse.json(
        { error: 'Missing cornell_note_id or current_content' },
        { status: 400 }
      )
    }

    // Determine what content to process
    let contentToProcess = current_content
    
    if (regenerate_all) {
      // Delete all existing cards and regenerate from full content
      const { data: existingCards } = await supabase
        .from('cards')
        .select('id')
        .eq('cornell_note_id', cornell_note_id)

      if (existingCards && existingCards.length > 0) {
        await supabase
          .from('cards')
          .delete()
          .eq('cornell_note_id', cornell_note_id)
      }
      
      contentToProcess = current_content
    } else if (previous_content) {
      // Extract only new content
      const newContent = getNewContent(current_content, previous_content)
      
      if (!newContent || newContent.length < 10) {
        // No meaningful new content, update the record and return
        await supabase
          .from('cornell_notes')
          .update({ 
            last_processed_content: current_content,
            last_cards_generated_at: new Date().toISOString()
          })
          .eq('id', cornell_note_id)
        
        return NextResponse.json({ 
          success: true, 
          count: 0,
          message: 'No new content to generate cards from'
        })
      }
      
      contentToProcess = newContent
    }

    // Extract cards with AI
    const extractedCards = await extractCardsFromNote(contentToProcess, title || 'Cornell Note')

    if (extractedCards.length > 0) {
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
    }

    // Update the last processed content
    await supabase
      .from('cornell_notes')
      .update({ 
        last_processed_content: current_content,
        last_cards_generated_at: new Date().toISOString()
      })
      .eq('id', cornell_note_id)

    return NextResponse.json({ 
      success: true, 
      count: extractedCards.length,
      message: `${extractedCards.length} flashcard${extractedCards.length !== 1 ? 's' : ''} created!`
    })
  } catch (error: any) {
    console.error('Error generating cards:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

