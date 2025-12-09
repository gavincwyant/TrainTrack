'use client'

import useSWR from 'swr'
import type { CalendarEvent } from '../types/calendar'

interface Appointment {
  id: string
  startTime: string
  endTime: string
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED'
  client: {
    id: string
    fullName: string
    email: string
  }
}

interface BlockedTime {
  id: string
  startTime: string
  endTime: string
  reason?: string
}

interface ApiResponse {
  appointments?: Appointment[]
  blockedTimes?: BlockedTime[]
}

interface UseCalendarDataReturn {
  events: CalendarEvent[]
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

// Fetcher function for SWR
const fetcher = async (url: string): Promise<ApiResponse> => {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Failed to fetch calendar data')
  }

  return response.json()
}

// Transform API appointments to calendar events
function transformToCalendarEvents(appointments: Appointment[]): CalendarEvent[] {
  return appointments.map((apt) => ({
    id: apt.id,
    title: `Session with ${apt.client.fullName}`,
    startTime: new Date(apt.startTime),
    endTime: new Date(apt.endTime),
    status: apt.status,
    clientId: apt.client.id,
    clientName: apt.client.fullName,
    clientEmail: apt.client.email,
    type: 'appointment' as const,
  }))
}

// Transform blocked times to calendar events
function transformBlockedTimes(blockedTimes: BlockedTime[]): CalendarEvent[] {
  return blockedTimes.map((block) => ({
    id: block.id,
    title: block.reason || 'Blocked Time',
    startTime: new Date(block.startTime),
    endTime: new Date(block.endTime),
    status: 'SCHEDULED' as const,
    clientId: '',
    clientName: '',
    type: 'blocked' as const,
    reason: block.reason,
  }))
}

export function useCalendarData(): UseCalendarDataReturn {
  const { data, error, mutate } = useSWR<ApiResponse>(
    '/api/appointments',
    fetcher,
    {
      refreshInterval: 60000, // Auto-refresh every 60 seconds
      revalidateOnFocus: true, // Revalidate when window regains focus
      revalidateOnReconnect: true, // Revalidate on network reconnection
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
    }
  )

  // Transform data to calendar events
  const appointments = transformToCalendarEvents(data?.appointments || [])
  const blockedTimes = transformBlockedTimes(data?.blockedTimes || [])
  const events = [...appointments, ...blockedTimes]

  return {
    events,
    isLoading: !error && !data,
    isError: !!error,
    refetch: mutate,
  }
}
