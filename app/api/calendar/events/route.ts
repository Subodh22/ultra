import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'

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

    // Get user's Google tokens
    const { data: settings } = await supabase
      .from('user_settings')
      .select('google_refresh_token, google_access_token')
      .eq('user_id', user.id)
      .single()

    if (!settings?.google_refresh_token) {
      return NextResponse.json({ events: [] })
    }

    // Set up Google Calendar API
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXT_PUBLIC_SITE_URL + '/auth/callback'
    )

    oauth2Client.setCredentials({
      refresh_token: settings.google_refresh_token,
      access_token: settings.google_access_token,
    })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // Fetch events
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startDate,
      timeMax: endDate,
      singleEvents: true,
      orderBy: 'startTime',
    })

    const events = response.data.items?.map(event => ({
      id: event.id,
      title: event.summary,
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      description: event.description,
    })) || []

    return NextResponse.json({ events })
  } catch (error: any) {
    console.error('Error fetching calendar events:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch events', events: [] },
      { status: 500 }
    )
  }
}

