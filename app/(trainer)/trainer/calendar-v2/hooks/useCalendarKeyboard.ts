'use client'

import { useEffect } from 'react'
import type { CalendarView } from '../types/calendar'

interface KeyboardHandlers {
  onCreateAppointment?: () => void
  onBlockTime?: () => void
  onGoToToday?: () => void
  onViewChange?: (view: CalendarView) => void
  onNavigate?: (direction: 'prev' | 'next') => void
}

export function useCalendarKeyboard(handlers: KeyboardHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      // Ignore if modifier keys are pressed (except for arrow keys navigation)
      const hasModifier = e.ctrlKey || e.metaKey || e.altKey
      if (hasModifier && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
        return
      }

      // Handle keyboard shortcuts
      switch (e.key.toLowerCase()) {
        case 'c':
          if (!hasModifier) {
            e.preventDefault()
            handlers.onCreateAppointment?.()
          }
          break

        case 'b':
          if (!hasModifier) {
            e.preventDefault()
            handlers.onBlockTime?.()
          }
          break

        case 't':
          if (!hasModifier) {
            e.preventDefault()
            handlers.onGoToToday?.()
          }
          break

        case 'm':
          if (!hasModifier) {
            e.preventDefault()
            handlers.onViewChange?.('month')
          }
          break

        case 'w':
          if (!hasModifier) {
            e.preventDefault()
            handlers.onViewChange?.('week')
          }
          break

        case 'd':
          if (!hasModifier) {
            e.preventDefault()
            handlers.onViewChange?.('day')
          }
          break

        case 'a':
          if (!hasModifier) {
            e.preventDefault()
            handlers.onViewChange?.('agenda')
          }
          break

        case 'arrowleft':
          e.preventDefault()
          handlers.onNavigate?.('prev')
          break

        case 'arrowright':
          e.preventDefault()
          handlers.onNavigate?.('next')
          break

        default:
          break
      }
    }

    // Add event listener
    document.addEventListener('keydown', handleKeyDown)

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handlers])
}
