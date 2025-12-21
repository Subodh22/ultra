import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
)

export interface CalendarEvent {
  summary: string
  description: string
  start: string // ISO date string
  end: string // ISO date string
  colorId?: string
}

/**
 * Create a calendar event for a drill session
 */
export async function createCalendarEvent(
  refreshToken: string,
  event: CalendarEvent
): Promise<string> {
  try {
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: event.summary,
        description: event.description,
        start: {
          dateTime: event.start,
          timeZone: 'UTC',
        },
        end: {
          dateTime: event.end,
          timeZone: 'UTC',
        },
        colorId: event.colorId || '9', // Blue color for learning events
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 10 },
            { method: 'email', minutes: 30 },
          ],
        },
      },
    })

    return response.data.id || ''
  } catch (error) {
    console.error('Error creating calendar event:', error)
    throw new Error('Failed to create calendar event')
  }
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(
  refreshToken: string,
  eventId: string
): Promise<void> {
  try {
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    })
  } catch (error) {
    console.error('Error deleting calendar event:', error)
    throw new Error('Failed to delete calendar event')
  }
}

/**
 * Get free/busy information from calendar
 */
export async function getFreeBusyInfo(
  refreshToken: string,
  timeMin: string,
  timeMax: string
) {
  try {
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        items: [{ id: 'primary' }],
      },
    })

    return response.data.calendars?.primary?.busy || []
  } catch (error) {
    console.error('Error getting free/busy info:', error)
    throw new Error('Failed to get calendar availability')
  }
}

/**
 * Find available time slots for drill sessions
 */
export async function findAvailableSlots(
  refreshToken: string,
  preferredSlots: Array<{ hour: number; minute: number }>,
  durationMinutes: number,
  daysAhead: number = 7
): Promise<Date[]> {
  const now = new Date()
  const timeMin = now.toISOString()
  const timeMax = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000).toISOString()

  const busySlots = await getFreeBusyInfo(refreshToken, timeMin, timeMax)

  const availableSlots: Date[] = []

  // Check each day
  for (let day = 0; day < daysAhead; day++) {
    const date = new Date(now)
    date.setDate(date.getDate() + day)

    // Check each preferred time slot
    for (const slot of preferredSlots) {
      const slotStart = new Date(date)
      slotStart.setHours(slot.hour, slot.minute, 0, 0)

      const slotEnd = new Date(slotStart)
      slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes)

      // Check if slot is in the future
      if (slotStart <= now) continue

      // Check if slot conflicts with busy times
      const hasConflict = busySlots.some((busy: any) => {
        const busyStart = new Date(busy.start)
        const busyEnd = new Date(busy.end)
        return (
          (slotStart >= busyStart && slotStart < busyEnd) ||
          (slotEnd > busyStart && slotEnd <= busyEnd) ||
          (slotStart <= busyStart && slotEnd >= busyEnd)
        )
      })

      if (!hasConflict) {
        availableSlots.push(slotStart)
      }
    }
  }

  return availableSlots
}

/**
 * Get calendar events from Google Calendar
 */
export async function getCalendarEvents(
  refreshToken: string,
  timeMin: string,
  timeMax: string
) {
  try {
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    })

    return response.data.items || []
  } catch (error) {
    console.error('Error getting calendar events:', error)
    throw new Error('Failed to get calendar events')
  }
}

