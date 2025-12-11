import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { extractCardsFromNote } from '@/lib/openai'

// PDF parsing - temporarily disabled due to compatibility issues
// Will be re-enabled with a different library
async function parsePDF(buffer: Buffer): Promise<string> {
  throw new Error('PDF processing temporarily unavailable. Please convert to .txt or .md format.')
}

// Background processing function
async function processNoteInBackground(noteId: string, userId: string) {
  try {
    const supabase = await createClient()
    
    // Get note
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .eq('user_id', userId)
      .single()

    if (noteError || !note) {
      throw new Error('Note not found')
    }

    // Update to processing
    await supabase
      .from('notes')
      .update({ processing_status: 'processing' })
      .eq('id', noteId)

    // Download file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('notes')
      .download(note.file_path)

    if (downloadError || !fileData) {
      throw new Error('Failed to download file')
    }

    // Extract text - check by file extension
    let textContent = ''
    const fileName = note.file_path.toLowerCase()
    
    if (fileName.endsWith('.txt') || fileName.endsWith('.md') || fileName.endsWith('.markdown')) {
      textContent = await fileData.text()
    } else if (fileName.endsWith('.pdf')) {
      const buffer = Buffer.from(await fileData.arrayBuffer())
      textContent = await parsePDF(buffer)
    } else {
      throw new Error('Unsupported file type')
    }

    if (!textContent || textContent.trim().length < 50) {
      throw new Error('Insufficient text content')
    }

    // Extract cards with AI
    const extractedCards = await extractCardsFromNote(textContent, note.title)

    // Save cards
    const cardsToInsert = extractedCards.map((card) => ({
      note_id: noteId,
      user_id: userId,
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
      .eq('id', noteId)

    console.log(`✅ Successfully processed note ${noteId}: ${extractedCards.length} cards created`)
  } catch (error: any) {
    console.error('❌ Processing error:', error)
    const supabase = await createClient()
    await supabase
      .from('notes')
      .update({ processing_status: 'failed' })
      .eq('id', noteId)
  }
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

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type by extension (more reliable than MIME type)
    const originalFileName = file.name.toLowerCase()
    const isValidFile = originalFileName.endsWith('.txt') || 
                       originalFileName.endsWith('.md') || 
                       originalFileName.endsWith('.markdown')

    if (!isValidFile) {
      return NextResponse.json(
        { error: 'Invalid file type. Supported: .txt, .md, .markdown' },
        { status: 400 }
      )
    }

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${uuidv4()}.${fileExt}`
    const filePath = `${user.id}/${fileName}`

    const fileBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from('notes')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Create note record in database
    const { data: note, error: dbError } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        title: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        processing_status: 'pending',
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // Clean up uploaded file
      await supabase.storage.from('notes').remove([filePath])
      return NextResponse.json(
        { error: 'Failed to create note record' },
        { status: 500 }
      )
    }

    // Trigger async processing in the background
    // Don't await - let it process asynchronously
    processNoteInBackground(note.id, user.id).catch(console.error)

    return NextResponse.json({ note })
  } catch (error) {
    console.error('Error in upload:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

