import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Brain, Calendar, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch stats
  const { data: notes } = await supabase
    .from('notes')
    .select('id')
    .eq('user_id', user!.id)

  const { data: cards } = await supabase
    .from('cards')
    .select('id, next_review, repetitions')
    .eq('user_id', user!.id)

  const { data: reviews } = await supabase
    .from('card_reviews')
    .select('quality')
    .eq('user_id', user!.id)
    .gte('reviewed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  const totalNotes = notes?.length || 0
  const totalCards = cards?.length || 0
  const dueCards = cards?.filter(c => new Date(c.next_review) <= new Date()).length || 0
  const matureCards = cards?.filter(c => c.repetitions >= 3).length || 0
  
  const successfulReviews = reviews?.filter(r => r.quality >= 3).length || 0
  const totalReviews = reviews?.length || 0
  const retentionRate = totalReviews > 0 ? Math.round((successfulReviews / totalReviews) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's your learning progress.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Notes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalNotes}</div>
            <p className="text-xs text-muted-foreground">
              Uploaded and processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cards</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCards}</div>
            <p className="text-xs text-muted-foreground">
              {matureCards} mature cards
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dueCards}</div>
            <p className="text-xs text-muted-foreground">
              Cards ready for review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{retentionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Last 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ready to Practice?</CardTitle>
            <CardDescription>
              You have {dueCards} cards due for review today
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dueCards > 0 ? (
              <Link href="/dashboard/drill">
                <Button className="w-full">Start Drill Session</Button>
              </Link>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">
                  No cards due right now. Great job! 🎉
                </p>
                <Link href="/dashboard/notes">
                  <Button variant="outline">Upload More Notes</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your learning journey this week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Cards Reviewed</span>
                <Badge>{totalReviews}</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Retention Rate</span>
                  <span>{retentionRate}%</span>
                </div>
                <Progress value={retentionRate} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started */}
      {totalNotes === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Start your learning journey in 3 simple steps
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                1
              </div>
              <div>
                <h4 className="font-medium">Upload Your Notes</h4>
                <p className="text-sm text-muted-foreground">
                  Upload PDFs, markdown files, or text documents
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                2
              </div>
              <div>
                <h4 className="font-medium">AI Extracts Learning Cards</h4>
                <p className="text-sm text-muted-foreground">
                  Our AI automatically creates facts, concepts, and procedures
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                3
              </div>
              <div>
                <h4 className="font-medium">Practice with Spaced Repetition</h4>
                <p className="text-sm text-muted-foreground">
                  Review cards at optimal intervals for maximum retention
                </p>
              </div>
            </div>
            <Link href="/dashboard/notes">
              <Button className="w-full">Upload Your First Note</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

