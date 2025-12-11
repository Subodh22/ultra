'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, XCircle, RotateCw } from 'lucide-react'

type CardType = 'fact' | 'concept' | 'procedure'

interface DrillCard {
  id: string
  card_type: CardType
  question: string
  answer: string
  ease_factor: number
  interval: number
  repetitions: number
}

interface DrillInterfaceProps {
  initialCards: DrillCard[]
}

export function DrillInterface({ initialCards }: DrillInterfaceProps) {
  const [cards, setCards] = useState(initialCards)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 })
  const router = useRouter()

  const currentCard = cards[currentIndex]
  const progress = ((currentIndex) / cards.length) * 100

  const getCardTypeColor = (type: CardType) => {
    switch (type) {
      case 'fact':
        return 'bg-blue-500'
      case 'concept':
        return 'bg-purple-500'
      case 'procedure':
        return 'bg-green-500'
    }
  }

  const handleQualityRating = async (quality: number) => {
    try {
      const response = await fetch('/api/cards/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: currentCard.id,
          quality,
          timeTaken: 0, // You could track this
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to record review')
      }

      // Update stats
      setSessionStats({
        correct: sessionStats.correct + (quality >= 3 ? 1 : 0),
        total: sessionStats.total + 1,
      })

      // Move to next card
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(currentIndex + 1)
        setShowAnswer(false)
      } else {
        // Session complete
        router.push('/dashboard')
        router.refresh()
      }
    } catch (error) {
      console.error('Error recording review:', error)
    }
  }

  if (!currentCard) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
          <p className="text-muted-foreground mb-6">
            You reviewed {sessionStats.total} cards with{' '}
            {Math.round((sessionStats.correct / sessionStats.total) * 100)}% success rate
          </p>
          <Button onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Card {currentIndex + 1} of {cards.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} />
        </CardContent>
      </Card>

      {/* Card Display */}
      <Card className="min-h-[400px]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Badge className={getCardTypeColor(currentCard.card_type)}>
              {currentCard.card_type.toUpperCase()}
            </Badge>
            <Badge variant="outline">
              Rep: {currentCard.repetitions}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Question */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Question
            </h3>
            <p className="text-lg">{currentCard.question}</p>
          </div>

          {/* Answer (revealed) */}
          {showAnswer && (
            <div className="border-t pt-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Answer
              </h3>
              <p className="text-lg whitespace-pre-wrap">{currentCard.answer}</p>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4">
            {!showAnswer ? (
              <Button
                onClick={() => setShowAnswer(true)}
                className="w-full"
                size="lg"
              >
                Show Answer
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-center mb-4">
                  How well did you know this?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => handleQualityRating(1)}
                    variant="destructive"
                    className="w-full"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Again
                  </Button>
                  <Button
                    onClick={() => handleQualityRating(2)}
                    variant="outline"
                    className="w-full"
                  >
                    Hard
                  </Button>
                  <Button
                    onClick={() => handleQualityRating(4)}
                    variant="outline"
                    className="w-full"
                  >
                    Good
                  </Button>
                  <Button
                    onClick={() => handleQualityRating(5)}
                    variant="default"
                    className="w-full"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Easy
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Keyboard shortcuts hint */}
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground text-center">
            Tip: Use keyboard shortcuts - Space to reveal, 1-4 for rating
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

