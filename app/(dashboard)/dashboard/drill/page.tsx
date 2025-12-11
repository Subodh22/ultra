import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DrillInterface } from '@/components/drill-interface'

export default async function DrillPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get cards due for review
  const { data: dueCards } = await supabase
    .from('cards')
    .select('*')
    .eq('user_id', user!.id)
    .lte('next_review', new Date().toISOString())
    .order('next_review', { ascending: true })
    .limit(20)

  if (!dueCards || dueCards.length === 0) {
    redirect('/dashboard')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Practice Session</h1>
        <p className="text-muted-foreground">
          {dueCards.length} cards ready for review
        </p>
      </div>

      <DrillInterface initialCards={dueCards} />
    </div>
  )
}

