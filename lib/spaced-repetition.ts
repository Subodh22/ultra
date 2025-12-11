/**
 * Spaced Repetition Algorithm (SM-2)
 * Based on the SuperMemo algorithm for optimal learning intervals
 */

export interface CardReviewData {
  ease_factor: number
  interval: number
  repetitions: number
  next_review: Date
}

export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5

/**
 * Calculate next review date based on SM-2 algorithm
 * @param quality - User's self-assessment (0-5)
 *   0: Complete blackout
 *   1: Incorrect but remembered
 *   2: Incorrect but easy to recall
 *   3: Correct but difficult
 *   4: Correct with hesitation
 *   5: Perfect recall
 * @param currentData - Current card review data
 * @returns Updated review data
 */
export function calculateNextReview(
  quality: ReviewQuality,
  currentData: CardReviewData
): CardReviewData {
  let { ease_factor, interval, repetitions } = currentData

  // If quality < 3, reset the card
  if (quality < 3) {
    repetitions = 0
    interval = 1
  } else {
    // Update ease factor
    ease_factor = Math.max(
      1.3,
      ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    )

    // Calculate new interval
    if (repetitions === 0) {
      interval = 1
    } else if (repetitions === 1) {
      interval = 6
    } else {
      interval = Math.round(interval * ease_factor)
    }

    repetitions += 1
  }

  // Calculate next review date
  const next_review = new Date()
  next_review.setDate(next_review.getDate() + interval)

  return {
    ease_factor: Math.round(ease_factor * 100) / 100, // Round to 2 decimals
    interval,
    repetitions,
    next_review,
  }
}

/**
 * Get cards due for review
 * @param cards - All user cards
 * @returns Cards that need to be reviewed today
 */
export function getDueCards<T extends { next_review: string }>(cards: T[]): T[] {
  const now = new Date()
  return cards.filter((card) => new Date(card.next_review) <= now)
}

/**
 * Sort cards by priority (earliest next_review first)
 */
export function sortCardsByPriority<T extends { next_review: string }>(
  cards: T[]
): T[] {
  return [...cards].sort(
    (a, b) =>
      new Date(a.next_review).getTime() - new Date(b.next_review).getTime()
  )
}

/**
 * Calculate retention rate for a user
 */
export function calculateRetentionRate(
  reviews: Array<{ quality: number }>
): number {
  if (reviews.length === 0) return 0

  const successful = reviews.filter((r) => r.quality >= 3).length
  return Math.round((successful / reviews.length) * 100)
}

/**
 * Get study statistics
 */
export function getStudyStats(cards: Array<{
  repetitions: number
  next_review: string
  ease_factor: number
}>) {
  const now = new Date()
  const dueCards = cards.filter((c) => new Date(c.next_review) <= now)
  const newCards = cards.filter((c) => c.repetitions === 0)
  const learningCards = cards.filter(
    (c) => c.repetitions > 0 && c.repetitions < 3
  )
  const matureCards = cards.filter((c) => c.repetitions >= 3)

  return {
    total: cards.length,
    due: dueCards.length,
    new: newCards.length,
    learning: learningCards.length,
    mature: matureCards.length,
    averageEase: cards.length > 0
      ? Math.round(
          (cards.reduce((sum, c) => sum + c.ease_factor, 0) / cards.length) * 100
        ) / 100
      : 0,
  }
}

