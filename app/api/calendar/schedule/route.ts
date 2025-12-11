import { createClient } from '@/lib/supabase/server'
import { createCalendarEvent, findAvailableSlots } from '@/lib/google-calendar'
import { NextResponse } from 'next/server'
import { addDays, format } from 'date-fns'

export async function POST(request: Request) {
  try {
    const { daysAhead = 7 } = await request.json()

    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user settings
    const { data: settings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!settings || !settings.google_refresh_token) {
      return NextResponse.json(
        { error: 'Google Calendar not connected' },
        { status: 400 }
      )
    }

    // Get cards due in the next week
    const { data: dueCards } = await supabase
      .from('cards')
      .select('id')
      .eq('user_id', user.id)
      .lte('next_review', addDays(new Date(), daysAhead).toISOString())

    if (!dueCards || dueCards.length === 0) {
      return NextResponse.json({
        message: 'No cards due in the next week',
        sessionsCreated: 0,
      })
    }

    // Find available time slots
    const availableSlots = await findAvailableSlots(
      settings.google_refresh_token,
      settings.preferred_time_slots || [{ hour: 9, minute: 0 }],
      settings.drill_duration || 30,
      daysAhead
    )

    // Limit to daily drill count
    const sessionsToSchedule = Math.min(
      availableSlots.length,
      settings.daily_drill_count * daysAhead
    )

    const createdSessions = []

    // Create calendar events and drill sessions
    for (let i = 0; i < sessionsToSchedule; i++) {
      const startTime = availableSlots[i]
      const endTime = new Date(startTime)
      endTime.setMinutes(endTime.getMinutes() + settings.drill_duration)

      try {
        // Create calendar event
        const eventId = await createCalendarEvent(settings.google_refresh_token, {
          summary: 'Ultra Learning - Drill Session',
          description: `Practice session for spaced repetition learning. ${dueCards.length} cards available.`,
          start: startTime.toISOString(),
          end: endTime.toISOString(),
          colorId: '9', // Blue
        })

        // Create drill session record
        const { data: session } = await supabase
          .from('drill_sessions')
          .insert({
            user_id: user.id,
            session_type: 'mixed',
            cards_count: Math.min(20, dueCards.length),
            scheduled_at: startTime.toISOString(),
            calendar_event_id: eventId,
          })
          .select()
          .single()

        if (session) {
          createdSessions.push(session)
        }
      } catch (error) {
        console.error('Error creating session:', error)
      }
    }

    return NextResponse.json({
      success: true,
      sessionsCreated: createdSessions.length,
      sessions: createdSessions,
    })
  } catch (error: any) {
    console.error('Error in schedule:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

