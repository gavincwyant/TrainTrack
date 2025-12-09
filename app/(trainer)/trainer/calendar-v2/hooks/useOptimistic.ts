'use client'

import { useState, useCallback } from 'react'
import type { CalendarEvent } from '../types/calendar'

interface UseOptimisticReturn {
  pendingEvents: CalendarEvent[]
  addOptimistic: (event: Omit<CalendarEvent, '_pending' | '_tempId'>) => string
  resolveOptimistic: (tempId: string, realEvent?: CalendarEvent) => void
  clearAll: () => void
}

export function useOptimistic(): UseOptimisticReturn {
  const [pendingEvents, setPendingEvents] = useState<CalendarEvent[]>([])

  const addOptimistic = useCallback((event: Omit<CalendarEvent, '_pending' | '_tempId'>): string => {
    // Generate a temporary ID for tracking
    const tempId = crypto.randomUUID()

    const optimisticEvent: CalendarEvent = {
      ...event,
      _pending: true,
      _tempId: tempId,
    }

    setPendingEvents((prev) => [...prev, optimisticEvent])

    return tempId
  }, [])

  const resolveOptimistic = useCallback((tempId: string, realEvent?: CalendarEvent) => {
    setPendingEvents((prev) => {
      // Remove the pending event with the matching tempId
      return prev.filter((event) => event._tempId !== tempId)
    })

    // If a real event is provided, you might want to handle updating the main events list
    // This would typically be done by triggering a refetch in useCalendarData
    // or by updating a global state management solution
  }, [])

  const clearAll = useCallback(() => {
    setPendingEvents([])
  }, [])

  return {
    pendingEvents,
    addOptimistic,
    resolveOptimistic,
    clearAll,
  }
}
