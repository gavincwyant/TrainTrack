'use client'

import { useState, useCallback } from 'react'
import type { CalendarView } from '../types/calendar'

interface UseCalendarViewReturn {
  view: CalendarView
  setView: (view: CalendarView) => void
  currentDate: Date
  goToToday: () => void
  goToPrevious: () => void
  goToNext: () => void
  goToDate: (date: Date) => void
}

export function useCalendarView(initialView: CalendarView = 'week'): UseCalendarViewReturn {
  const [view, setView] = useState<CalendarView>(initialView)
  const [currentDate, setCurrentDate] = useState(new Date())

  const goToToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [])

  const goToPrevious = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)

      switch (view) {
        case 'day':
          newDate.setDate(newDate.getDate() - 1)
          break
        case 'week':
          newDate.setDate(newDate.getDate() - 7)
          break
        case 'month':
          newDate.setMonth(newDate.getMonth() - 1)
          break
        case 'agenda':
          newDate.setDate(newDate.getDate() - 7) // Navigate by week in agenda view
          break
      }

      return newDate
    })
  }, [view])

  const goToNext = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)

      switch (view) {
        case 'day':
          newDate.setDate(newDate.getDate() + 1)
          break
        case 'week':
          newDate.setDate(newDate.getDate() + 7)
          break
        case 'month':
          newDate.setMonth(newDate.getMonth() + 1)
          break
        case 'agenda':
          newDate.setDate(newDate.getDate() + 7) // Navigate by week in agenda view
          break
      }

      return newDate
    })
  }, [view])

  const goToDate = useCallback((date: Date) => {
    setCurrentDate(date)
  }, [])

  return {
    view,
    setView,
    currentDate,
    goToToday,
    goToPrevious,
    goToNext,
    goToDate,
  }
}
