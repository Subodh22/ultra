import { createClient } from '@supabase/supabase-js'

const MCP_SERVER_URL = process.env.MCP_CALENDAR_URL || 'https://sallycallsnow.duckdns.org/mcp/0ff3c10f-0b91-4a93-af4c-e8ccaba543a3'

interface MCPCalendarEvent {
  id?: string
  summary: string
  description?: string
  start: {
    dateTime: string
    timeZone?: string
  }
  end: {
    dateTime: string
    timeZone?: string
  }
}

interface CreateEventParams {
  title: string
  description: string
  startTime: Date
  endTime: Date
  timeZone?: string
}

/**
 * Create a calendar event using the MCP server
 */
export async function createMCPCalendarEvent(params: CreateEventParams): Promise<MCPCalendarEvent> {
  const { title, description, startTime, endTime, timeZone = 'UTC' } = params

  const event: MCPCalendarEvent = {
    summary: title,
    description,
    start: {
      dateTime: startTime.toISOString(),
      timeZone,
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone,
    },
  }

  try {
    const response = await fetch(`${MCP_SERVER_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    })

    if (!response.ok) {
      throw new Error(`MCP Calendar API error: ${response.status}`)
    }

    const createdEvent = await response.json()
    return createdEvent
  } catch (error) {
    console.error('Error creating MCP calendar event:', error)
    throw error
  }
}

/**
 * Get calendar events from MCP server
 */
export async function getMCPCalendarEvents(
  startDate: Date,
  endDate: Date
): Promise<MCPCalendarEvent[]> {
  try {
    const params = new URLSearchParams({
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
    })

    const response = await fetch(`${MCP_SERVER_URL}/events?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`MCP Calendar API error: ${response.status}`)
    }

    const events = await response.json()
    return events.items || events || []
  } catch (error) {
    console.error('Error fetching MCP calendar events:', error)
    throw error
  }
}

/**
 * Update a calendar event using the MCP server
 */
export async function updateMCPCalendarEvent(
  eventId: string,
  params: Partial<CreateEventParams>
): Promise<MCPCalendarEvent> {
  const updateData: Partial<MCPCalendarEvent> = {}

  if (params.title) {
    updateData.summary = params.title
  }
  if (params.description) {
    updateData.description = params.description
  }
  if (params.startTime) {
    updateData.start = {
      dateTime: params.startTime.toISOString(),
      timeZone: params.timeZone || 'UTC',
    }
  }
  if (params.endTime) {
    updateData.end = {
      dateTime: params.endTime.toISOString(),
      timeZone: params.timeZone || 'UTC',
    }
  }

  try {
    const response = await fetch(`${MCP_SERVER_URL}/events/${eventId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    })

    if (!response.ok) {
      throw new Error(`MCP Calendar API error: ${response.status}`)
    }

    const updatedEvent = await response.json()
    return updatedEvent
  } catch (error) {
    console.error('Error updating MCP calendar event:', error)
    throw error
  }
}

/**
 * Delete a calendar event using the MCP server
 */
export async function deleteMCPCalendarEvent(eventId: string): Promise<void> {
  try {
    const response = await fetch(`${MCP_SERVER_URL}/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`MCP Calendar API error: ${response.status}`)
    }
  } catch (error) {
    console.error('Error deleting MCP calendar event:', error)
    throw error
  }
}

