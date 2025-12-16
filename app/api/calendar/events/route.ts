import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getCalendarEvents } from '@/lib/supabase-calendar'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start') || new Date().toISOString()
    const endDate = searchParams.get('end') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    // Fetch events from Supabase
    const calendarEvents = await getCalendarEvents(
      user.id,
      new Date(startDate),
      new Date(endDate)
    )

    const events = calendarEvents.map(event => ({
      id: event.id,
      title: event.title,
      start: event.start_time,
      end: event.end_time,
      description: event.description,
    }))

    return NextResponse.json({ events })
  } catch (error: any) {
    console.error('Error fetching calendar events:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch events', events: [] },
      { status: 500 }
    )
  }
}

