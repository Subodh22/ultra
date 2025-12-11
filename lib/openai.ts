import OpenAI from 'openai'
import { z } from 'zod'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Schema for extracted cards
const CardSchema = z.object({
  type: z.enum(['fact', 'concept', 'procedure']),
  question: z.string(),
  answer: z.string(),
})

const ExtractedCardsSchema = z.object({
  cards: z.array(CardSchema),
})

export type ExtractedCard = z.infer<typeof CardSchema>

/**
 * Extract facts, concepts, and procedures from note content using OpenAI
 */
export async function extractCardsFromNote(
  content: string,
  noteTitle: string
): Promise<ExtractedCard[]> {
  try {
    const prompt = `You are an expert learning assistant specialized in creating effective study materials using spaced repetition principles.

Analyze the following note titled "${noteTitle}" and extract learning cards in three categories:

1. **Facts**: Discrete pieces of information that can be memorized (dates, names, definitions, formulas)
2. **Concepts**: Ideas or theories that need to be understood (principles, relationships, explanations)
3. **Procedures**: Step-by-step processes or methods (how to do something, algorithms, workflows)

For each card:
- Create a clear, specific question
- Provide a comprehensive but concise answer
- Focus on one idea per card (atomic cards are better for retention)
- Use active recall principles (questions should test understanding, not just recognition)

Return your response as a JSON object with this structure:
{
  "cards": [
    {
      "type": "fact" | "concept" | "procedure",
      "question": "Clear question here",
      "answer": "Comprehensive answer here"
    }
  ]
}

Note Content:
${content}

Extract at least 5 cards if possible, but prioritize quality over quantity. Only create cards for information that is actually present in the note.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at extracting learning materials from educational content. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 4000,
    })

    const responseContent = response.choices[0]?.message?.content
    if (!responseContent) {
      throw new Error('No response from OpenAI')
    }

    // Parse and validate the response
    const parsed = JSON.parse(responseContent)
    const validated = ExtractedCardsSchema.parse(parsed)

    return validated.cards
  } catch (error) {
    console.error('Error extracting cards from note:', error)
    throw new Error('Failed to extract cards from note content')
  }
}

/**
 * Extract text content from different file types
 */
export async function extractTextFromFile(
  fileBuffer: Buffer,
  fileType: string
): Promise<string> {
  // For now, we'll handle text and markdown directly
  // PDF parsing will be done separately with pdf-parse
  if (fileType === 'text/plain' || fileType === 'text/markdown') {
    return fileBuffer.toString('utf-8')
  }

  // For PDF files, use pdf-parse (handled in the API route)
  throw new Error(`Unsupported file type: ${fileType}`)
}

