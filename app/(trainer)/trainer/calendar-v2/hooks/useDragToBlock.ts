"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import { DragSelection } from '../types/calendar'

interface UseDragToBlockReturn {
  isDragging: boolean
  dragSelection: DragSelection | null
  showQuickMenu: boolean
  handlers: {
    onMouseDown: (e: React.MouseEvent, slot: Date) => void
    onMouseMove: (e: React.MouseEvent, slot: Date) => void
    onMouseUp: () => void
    onTouchStart: (e: React.TouchEvent, slot: Date) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: () => void
  }
  clearDrag: () => void
  confirmSelection: (reason?: string) => Promise<void>
  cancelSelection: () => void
}

export function useDragToBlock(
  enabled: boolean,
  onBlockCreated?: () => void
): UseDragToBlockReturn {
  const [isDragging, setIsDragging] = useState(false)
  const [dragSelection, setDragSelection] = useState<DragSelection | null>(null)
  const [showQuickMenu, setShowQuickMenu] = useState(false)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const dragStartSlot = useRef<Date | null>(null)

  // Snap time to 15-minute intervals
  const snapToInterval = useCallback((date: Date): Date => {
    const minutes = date.getMinutes()
    const snappedMinutes = Math.round(minutes / 15) * 15
    const snapped = new Date(date)
    snapped.setMinutes(snappedMinutes, 0, 0)
    return snapped
  }, [])

  // Calculate if selection is valid (end after start)
  const isValidSelection = useCallback((start: Date, end: Date): boolean => {
    return end > start
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, slot: Date) => {
      if (!enabled) return

      // Only start drag on Shift+Click
      if (e.shiftKey) {
        e.preventDefault()
        const snappedSlot = snapToInterval(slot)
        setIsDragging(true)
        dragStartSlot.current = snappedSlot
        setDragSelection({
          startSlot: snappedSlot,
          endSlot: snappedSlot,
          isValid: false,
        })
        setShowQuickMenu(false)
      }
    },
    [enabled, snapToInterval]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, slot: Date) => {
      if (!enabled || !isDragging || !dragStartSlot.current) return

      const snappedSlot = snapToInterval(slot)
      const start = dragStartSlot.current
      const end = snappedSlot

      // Determine correct order (allow dragging up or down)
      const actualStart = start <= end ? start : end
      const actualEnd = start <= end ? end : start

      setDragSelection({
        startSlot: actualStart,
        endSlot: actualEnd,
        isValid: isValidSelection(actualStart, actualEnd),
      })
    },
    [enabled, isDragging, snapToInterval, isValidSelection]
  )

  const handleMouseUp = useCallback(() => {
    if (!enabled || !isDragging) return

    setIsDragging(false)

    // Show quick menu if valid selection
    if (dragSelection && dragSelection.isValid) {
      setShowQuickMenu(true)
    } else {
      setDragSelection(null)
    }

    dragStartSlot.current = null
  }, [enabled, isDragging, dragSelection])

  // Touch handlers for mobile
  const handleTouchStart = useCallback(
    (e: React.TouchEvent, slot: Date) => {
      if (!enabled) return

      const snappedSlot = snapToInterval(slot)

      // Start long-press timer
      longPressTimer.current = setTimeout(() => {
        setIsDragging(true)
        dragStartSlot.current = snappedSlot
        setDragSelection({
          startSlot: snappedSlot,
          endSlot: snappedSlot,
          isValid: false,
        })
        setShowQuickMenu(false)

        // Haptic feedback if available
        if ('vibrate' in navigator) {
          navigator.vibrate(50)
        }
      }, 500) // 500ms long press
    },
    [enabled, snapToInterval]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || !isDragging || !dragStartSlot.current) return

      // Clear long press timer if user moves before timer completes
      if (longPressTimer.current && !isDragging) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
        return
      }

      // Find the element under the touch point
      const touch = e.touches[0]
      const element = document.elementFromPoint(touch.clientX, touch.clientY)

      // Get the time slot from the element's data attribute
      const timeSlotStr = element?.getAttribute('data-time-slot')
      if (!timeSlotStr) return

      const slot = new Date(timeSlotStr)
      const snappedSlot = snapToInterval(slot)
      const start = dragStartSlot.current
      const end = snappedSlot

      const actualStart = start <= end ? start : end
      const actualEnd = start <= end ? end : start

      setDragSelection({
        startSlot: actualStart,
        endSlot: actualEnd,
        isValid: isValidSelection(actualStart, actualEnd),
      })
    },
    [enabled, isDragging, snapToInterval, isValidSelection]
  )

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }

    if (!enabled || !isDragging) return

    setIsDragging(false)

    if (dragSelection && dragSelection.isValid) {
      setShowQuickMenu(true)
    } else {
      setDragSelection(null)
    }

    dragStartSlot.current = null
  }, [enabled, isDragging, dragSelection])

  const clearDrag = useCallback(() => {
    setIsDragging(false)
    setDragSelection(null)
    setShowQuickMenu(false)
    dragStartSlot.current = null

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const confirmSelection = useCallback(
    async (reason?: string) => {
      if (!dragSelection || !dragSelection.isValid) return

      try {
        const response = await fetch('/api/blocked-times', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startTime: dragSelection.startSlot.toISOString(),
            endTime: dragSelection.endSlot.toISOString(),
            reason: reason || 'Blocked Time',
            isRecurring: false,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to block time')
        }

        clearDrag()
        onBlockCreated?.()
      } catch (err) {
        console.error('Failed to create blocked time:', err)
        throw err
      }
    },
    [dragSelection, clearDrag, onBlockCreated]
  )

  const cancelSelection = useCallback(() => {
    clearDrag()
  }, [clearDrag])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
    }
  }, [])

  return {
    isDragging,
    dragSelection,
    showQuickMenu,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    clearDrag,
    confirmSelection,
    cancelSelection,
  }
}
