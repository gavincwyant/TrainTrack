import { http, HttpResponse } from 'msw'

// Track calls to Google Calendar API for testing
let calendarCalls: Array<{ method: string; data: unknown }> = []

/**
 * MSW handlers for Google Calendar API
 */
export const googleCalendarHandlers = [
  // OAuth token endpoint
  http.post('https://oauth2.googleapis.com/token', async ({ request }) => {
    const body = await request.text()
    calendarCalls.push({ method: 'getToken', data: body })

    return HttpResponse.json({
      access_token: 'mock_access_token_' + Date.now(),
      refresh_token: 'mock_refresh_token_' + Date.now(),
      expires_in: 3600,
      scope: 'https://www.googleapis.com/auth/calendar.events',
      token_type: 'Bearer',
    })
  }),

  // Create calendar event
  http.post(
    'https://www.googleapis.com/calendar/v3/calendars/:calendarId/events',
    async ({ request, params }) => {
      const body = await request.json() as Record<string, unknown>
      calendarCalls.push({
        method: 'createEvent',
        data: { calendarId: params.calendarId, body },
      })

      return HttpResponse.json({
        id: 'mock_event_' + Date.now(),
        summary: body.summary,
        start: body.start,
        end: body.end,
        status: 'confirmed',
        htmlLink: 'https://calendar.google.com/calendar/event?eid=mock',
      })
    }
  ),

  // Update calendar event
  http.patch(
    'https://www.googleapis.com/calendar/v3/calendars/:calendarId/events/:eventId',
    async ({ request, params }) => {
      const body = await request.json() as Record<string, unknown>
      calendarCalls.push({
        method: 'updateEvent',
        data: { calendarId: params.calendarId, eventId: params.eventId, body },
      })

      return HttpResponse.json({
        id: params.eventId,
        summary: body.summary,
        start: body.start,
        end: body.end,
        status: 'confirmed',
      })
    }
  ),

  // Delete calendar event
  http.delete(
    'https://www.googleapis.com/calendar/v3/calendars/:calendarId/events/:eventId',
    ({ params }) => {
      calendarCalls.push({
        method: 'deleteEvent',
        data: { calendarId: params.calendarId, eventId: params.eventId },
      })

      return new HttpResponse(null, { status: 204 })
    }
  ),

  // List calendar events
  http.get(
    'https://www.googleapis.com/calendar/v3/calendars/:calendarId/events',
    ({ request, params }) => {
      const url = new URL(request.url)
      const timeMin = url.searchParams.get('timeMin')
      const timeMax = url.searchParams.get('timeMax')

      calendarCalls.push({
        method: 'listEvents',
        data: { calendarId: params.calendarId, timeMin, timeMax },
      })

      // Return mock events
      return HttpResponse.json({
        items: [
          {
            id: 'event_1',
            summary: 'John Doe',
            start: { dateTime: '2025-01-15T10:00:00Z', timeZone: 'UTC' },
            end: { dateTime: '2025-01-15T11:00:00Z', timeZone: 'UTC' },
            status: 'confirmed',
          },
          {
            id: 'event_2',
            summary: 'Jane Smith',
            start: { dateTime: '2025-01-16T14:00:00Z', timeZone: 'UTC' },
            end: { dateTime: '2025-01-16T15:00:00Z', timeZone: 'UTC' },
            status: 'confirmed',
          },
        ],
      })
    }
  ),
]

/**
 * Get all Google Calendar API calls made during tests
 */
export function getGoogleCalendarCalls() {
  return calendarCalls
}

/**
 * Clear Google Calendar API call history
 */
export function clearGoogleCalendarCalls() {
  calendarCalls = []
}

/**
 * Mock a specific Google Calendar event for testing
 */
export function mockGoogleCalendarEvent(event: {
  id?: string
  summary: string
  start: string
  end: string
  status?: string
}) {
  // This would be used in tests to set up specific scenarios
  // The actual implementation depends on how MSW mocking works in your tests
  return {
    id: event.id || 'mock_event_' + Date.now(),
    summary: event.summary,
    start: { dateTime: event.start, timeZone: 'UTC' },
    end: { dateTime: event.end, timeZone: 'UTC' },
    status: event.status || 'confirmed',
  }
}
