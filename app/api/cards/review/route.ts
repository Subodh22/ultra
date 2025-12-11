import { createClient } from '@/lib/supabase/server'
import { calculateNextReview, type ReviewQuality } from '@/lib/spaced-repetition'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { cardId, quality, timeTaken } = await request.json()

    if (!cardId || quality === undefined) {
      return NextResponse.json(
        { error: 'Card ID and quality required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current card data
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .eq('user_id', user.id)
      .single()

    if (cardError || !card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    // Calculate next review using SM-2 algorithm
    const nextReviewData = calculateNextReview(quality as ReviewQuality, {
      ease_factor: card.ease_factor,
      interval: card.interval,
      repetitions: card.repetitions,
      next_review: new Date(card.next_review),
    })

    // Update card
    const { error: updateError } = await supabase
      .from('cards')
      .update({
        ease_factor: nextReviewData.ease_factor,
        interval: nextReviewData.interval,
        repetitions: nextReviewData.repetitions,
        next_review: nextReviewData.next_review.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', cardId)

    if (updateError) {
      throw new Error('Failed to update card')
    }

    // Record review in history
    const { error: reviewError } = await supabase
      .from('card_reviews')
      .insert({
        card_id: cardId,
        user_id: user.id,
        quality,
        time_taken: timeTaken || 0,
        reviewed_at: new Date().toISOString(),
      })

    if (reviewError) {
      console.error('Failed to record review:', reviewError)
      // Don't fail the request if review history fails
    }

    return NextResponse.json({
      success: true,
      nextReview: nextReviewData.next_review,
    })
  } catch (error: any) {
    console.error('Error in review:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

