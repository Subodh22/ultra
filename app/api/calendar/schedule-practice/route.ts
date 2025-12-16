import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { note_id, note_title, note_type, scheduled_time, duration = 30 } = await request.json()

    if (!note_id || !scheduled_time) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get user's Google tokens
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('google_refresh_token, google_access_token')
      .eq('user_id', user.id)
      .single()

    if (settingsError || !settings?.google_refresh_token) {
      return NextResponse.json(
        { error: 'Google Calendar not connected' },
        { status: 400 }
      )
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

    // Create calendar event
    const startTime = new Date(scheduled_time)
    const endTime = new Date(startTime.getTime() + duration * 60000)

    const event = {
      summary: `🎯 Practice: ${note_title}`,
      description: `Practice session for ${note_title}\n\nClick to start: ${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/drill/session?note_id=${note_id}&type=${note_type}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'UTC',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 10 },
          { method: 'email', minutes: 30 },
        ],
      },
    }

    const calendarResponse = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    })

    // Save drill session to database
    const { data: session, error: sessionError } = await supabase
      .from('drill_sessions')
      .insert({
        user_id: user.id,
        session_type: 'mixed',
        cards_count: 0,
        completed_count: 0,
        calendar_event_id: calendarResponse.data.id,
        scheduled_at: startTime.toISOString(),
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Session error:', sessionError)
      throw new Error('Failed to save session')
    }

    return NextResponse.json({
      success: true,
      event_id: calendarResponse.data.id,
      event_link: calendarResponse.data.htmlLink,
      session_id: session.id,
    })
  } catch (error: any) {
    console.error('Error scheduling practice:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to schedule practice' },
      { status: 500 }
    )
  }
}

