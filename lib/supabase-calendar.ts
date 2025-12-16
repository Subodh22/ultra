import { createClient } from '@/lib/supabase/server'

interface CalendarEventData {
  note_id: string
  title: string
  description: string
  start_time: string
  end_time: string
  status: 'scheduled' | 'completed' | 'cancelled'
}

interface CalendarEvent extends CalendarEventData {
  id: string
  user_id: string
  created_at: string
  updated_at: string
}

/**
 * Create a calendar event in Supabase
 */
export async function createCalendarEvent(
  userId: string,
  eventData: CalendarEventData
): Promise<CalendarEvent> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      user_id: userId,
      ...eventData,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating calendar event:', error)
    throw new Error('Failed to create calendar event')
  }

  return data
}

/**
 * Get calendar events for a user within a date range
 */
export async function getCalendarEvents(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .gte('start_time', startDate.toISOString())
    .lte('start_time', endDate.toISOString())
    .order('start_time', { ascending: true })

  if (error) {
    console.error('Error fetching calendar events:', error)
    throw new Error('Failed to fetch calendar events')
  }

  return data || []
}

/**
 * Update a calendar event
 */
export async function updateCalendarEvent(
  eventId: string,
  updates: Partial<CalendarEventData>
): Promise<CalendarEvent> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('calendar_events')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .select()
    .single()

  if (error) {
    console.error('Error updating calendar event:', error)
    throw new Error('Failed to update calendar event')
  }

  return data
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', eventId)

  if (error) {
    console.error('Error deleting calendar event:', error)
    throw new Error('Failed to delete calendar event')
  }
}

