import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getCalendarEvents } from '@/lib/google-calendar'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's Google Calendar refresh token
    const { data: settings } = await supabase
      .from('user_settings')
      .select('google_refresh_token')
      .eq('user_id', user.id)
      .single()

    if (!settings?.google_refresh_token) {
      return NextResponse.json(
        { error: 'Google Calendar not connected', events: [] },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start') || new Date().toISOString()
    const endDate = searchParams.get('end') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    // Fetch events from Google Calendar
    const googleEvents = await getCalendarEvents(
      settings.google_refresh_token,
      startDate,
      endDate
    )

    const events = googleEvents.map((event: any) => ({
      id: event.id,
      title: event.summary,
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
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

