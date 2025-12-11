import { createClient } from '@/lib/supabase/server'
import { extractCardsFromNote } from '@/lib/openai'
import { NextResponse } from 'next/server'

// Dynamic import for pdf-parse to handle CommonJS
async function parsePDF(buffer: Buffer): Promise<string> {
  const pdfParse = await import('pdf-parse')
  const data = await (pdfParse as any)(buffer)
  return data.text
}

export async function POST(request: Request) {
  try {
    const { noteId } = await request.json()

    if (!noteId) {
      return NextResponse.json({ error: 'Note ID required' }, { status: 400 })
    }

    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get note from database
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .eq('user_id', user.id)
      .single()

    if (noteError || !note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    // Update status to processing
    await supabase
      .from('notes')
      .update({ processing_status: 'processing' })
      .eq('id', noteId)

    try {
      // Download file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('notes')
        .download(note.file_path)

      if (downloadError || !fileData) {
        throw new Error('Failed to download file')
      }

      // Extract text based on file type
      let textContent = ''
      
      if (note.file_type === 'application/pdf') {
        const buffer = Buffer.from(await fileData.arrayBuffer())
        textContent = await parsePDF(buffer)
      } else if (
        note.file_type === 'text/plain' ||
        note.file_type === 'text/markdown'
      ) {
        textContent = await fileData.text()
      } else {
        // For images, we'd need OCR (like Tesseract.js)
        // For now, we'll skip image processing
        throw new Error('Image processing not yet supported')
      }

      if (!textContent || textContent.trim().length < 50) {
        throw new Error('Insufficient text content extracted')
      }

      // Extract cards using OpenAI
      const extractedCards = await extractCardsFromNote(textContent, note.title)

      // Save cards to database
      const cardsToInsert = extractedCards.map((card) => ({
        note_id: noteId,
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

      // Update note status to completed
      await supabase
        .from('notes')
        .update({ processing_status: 'completed' })
        .eq('id', noteId)

      return NextResponse.json({
        success: true,
        cardsCreated: extractedCards.length,
      })
    } catch (processingError: any) {
      console.error('Processing error:', processingError)
      
      // Update note status to failed
      await supabase
        .from('notes')
        .update({ processing_status: 'failed' })
        .eq('id', noteId)

      return NextResponse.json(
        { error: processingError.message || 'Processing failed' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error in process:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

