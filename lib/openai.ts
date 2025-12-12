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
    const prompt = `You are an expert learning assistant specialized in creating COMPREHENSIVE study materials using spaced repetition principles.

Your mission: Extract EVERY piece of valuable information from this note. DO NOT skip or summarize - create cards for ALL important details.

Analyze the following note titled "${noteTitle}" and extract learning cards in three categories:

1. **Facts**: Discrete pieces of information (dates, names, definitions, formulas, statistics, examples, specific details)
2. **Concepts**: Ideas or theories that need understanding (principles, relationships, explanations, frameworks, models)
3. **Procedures**: Step-by-step processes (how to do something, algorithms, workflows, methods, techniques)

CRITICAL REQUIREMENTS:
- Extract EVERYTHING of value - aim for MAXIMUM coverage
- Break complex information into multiple atomic cards
- Create 15-30+ cards for typical notes (more for dense content)
- Each card tests ONE specific piece of knowledge
- Include examples, definitions, explanations, details, and context
- Don't skip "minor" details - they matter for complete understanding
- Create cards for supporting information, not just main points

For each card:
- Question: Clear, specific, testable question
- Answer: Detailed, complete answer with context and examples where relevant
- Use active recall principles (test understanding, not just recognition)

Return as JSON:
{
  "cards": [
    {
      "type": "fact" | "concept" | "procedure",
      "question": "Specific question testing one piece of knowledge",
      "answer": "Complete answer with all relevant details and context"
    }
  ]
}

Note Content:
${content}

EXTRACT COMPREHENSIVELY - Create as many cards as needed to cover ALL the information. The goal is COMPLETE mastery of this material.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at extracting COMPREHENSIVE learning materials from educational content. Your goal is to capture EVERY important detail, creating as many cards as needed for complete coverage. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temperature for more consistent, thorough extraction
      max_tokens: 16000, // Increased to allow many more cards
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

