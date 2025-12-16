import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createMCPCalendarEvent } from '@/lib/mcp-calendar'

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

    // Create calendar event using MCP server
    const startTime = new Date(scheduled_time)
    const endTime = new Date(startTime.getTime() + duration * 60000)

    const mcpEvent = await createMCPCalendarEvent({
      title: `🎯 Practice: ${note_title}`,
      description: `Practice session for ${note_title}\n\nClick to start: ${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/drill/session?note_id=${note_id}&type=${note_type}`,
      startTime,
      endTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })

    // Save drill session to database
    const { data: session, error: sessionError } = await supabase
      .from('drill_sessions')
      .insert({
        user_id: user.id,
        session_type: 'mixed',
        cards_count: 0,
        completed_count: 0,
        calendar_event_id: mcpEvent.id || `mcp-${Date.now()}`,
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
      event_id: mcpEvent.id,
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

