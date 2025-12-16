import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getMCPCalendarEvents } from '@/lib/mcp-calendar'

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

    // Fetch events from MCP Calendar
    const mcpEvents = await getMCPCalendarEvents(
      new Date(startDate),
      new Date(endDate)
    )

    const events = mcpEvents.map(event => ({
      id: event.id,
      title: event.summary,
      start: event.start?.dateTime,
      end: event.end?.dateTime,
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

