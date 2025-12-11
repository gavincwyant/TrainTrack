"use client"

import { useState, useRef, useCallback, useEffect, RefObject } from "react"

const HOLD_THRESHOLD_MS = 150
const HORIZONTAL_SWIPE_THRESHOLD_PX = 10
const VERTICAL_DRAG_THRESHOLD_PX = 5

interface DragToCreateOptions {
  containerRef: RefObject<HTMLDivElement | null>
  dayStartTime: string // e.g., "06:00"
  dayEndTime: string // e.g., "22:00"
  step: number // minutes, e.g., 30
  onSelectionComplete: (start: Date, end: Date) => void
  enabled: boolean
  currentDate: Date // The date being viewed
}

interface SelectionState {
  startTime: Date | null
  endTime: Date | null
  bounds: {
    top: number
    height: number
    left: number
    width: number
  } | null
}

function triggerHapticFeedback() {
  try {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(15)
    }
  } catch {
    // Vibration not supported or blocked
  }
}

function parseTimeString(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(":").map(Number)
  return { hours, minutes }
}

function snapToStep(minutes: number, step: number): number {
  return Math.round(minutes / step) * step
}

export function useDragToCreate({
  containerRef,
  dayStartTime,
  dayEndTime,
  step,
  onSelectionComplete,
  enabled,
  currentDate,
}: DragToCreateOptions) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectionState, setSelectionState] = useState<SelectionState>({
    startTime: null,
    endTime: null,
    bounds: null,
  })
  const [gutterInfo, setGutterInfo] = useState({ width: 40, left: 0 }) // default fallback

  // Refs for tracking gesture state (using refs so we can access in native event listeners)
  const gestureRef = useRef({
    isHolding: false,
    isDragging: false, // Mirror of state for sync access
    holdTimer: null as ReturnType<typeof setTimeout> | null,
    startPosition: { x: 0, y: 0 },
    startTime: null as Date | null,
    gestureDecided: false,
    columnInfo: null as { left: number; width: number; date: Date } | null,
  })

  // Keep options in ref for native event listener access
  const optionsRef = useRef({ dayStartTime, dayEndTime, step, currentDate, enabled })
  useEffect(() => {
    optionsRef.current = { dayStartTime, dayEndTime, step, currentDate, enabled }
  }, [dayStartTime, dayEndTime, step, currentDate, enabled])

  const getTimeSlotContainer = useCallback((): HTMLElement | null => {
    if (!containerRef.current) return null
    return containerRef.current.querySelector(".rbc-time-content")
  }, [containerRef])

  const getGutterInfo = useCallback((): { width: number; left: number } => {
    if (!containerRef.current) return { width: 40, left: 0 } // default fallback
    const gutter = containerRef.current.querySelector(".rbc-time-gutter")
    if (!gutter) return { width: 40, left: 0 }
    const rect = gutter.getBoundingClientRect()
    return { width: rect.width, left: rect.left }
  }, [containerRef])

  const getDayColumnAtX = useCallback((clientX: number): { left: number; width: number; date: Date; dayIndex: number } | null => {
    if (!containerRef.current) return null

    const daySlots = containerRef.current.querySelectorAll(".rbc-day-slot")
    if (daySlots.length === 0) return null

    for (let i = 0; i < daySlots.length; i++) {
      const slot = daySlots[i] as HTMLElement
      const rect = slot.getBoundingClientRect()
      if (clientX >= rect.left && clientX <= rect.right) {
        const date = new Date(optionsRef.current.currentDate)
        const dayOfWeek = date.getDay()
        const startOfWeek = new Date(date)
        startOfWeek.setDate(date.getDate() - dayOfWeek)
        const columnDate = new Date(startOfWeek)
        columnDate.setDate(startOfWeek.getDate() + i)

        return {
          left: rect.left,
          width: rect.width,
          date: columnDate,
          dayIndex: i,
        }
      }
    }
    return null
  }, [containerRef])

  const yPositionToTime = useCallback((clientY: number): Date | null => {
    const timeContent = getTimeSlotContainer()
    if (!timeContent || !gestureRef.current.columnInfo) return null

    const rect = timeContent.getBoundingClientRect()
    const scrollTop = timeContent.scrollTop
    const relativeY = clientY - rect.top + scrollTop

    const start = parseTimeString(optionsRef.current.dayStartTime)
    const end = parseTimeString(optionsRef.current.dayEndTime)
    const totalMinutes = (end.hours * 60 + end.minutes) - (start.hours * 60 + start.minutes)

    const contentHeight = timeContent.scrollHeight
    const minutesPerPixel = totalMinutes / contentHeight

    const minutesFromStart = relativeY * minutesPerPixel
    const snappedMinutes = snapToStep(minutesFromStart, optionsRef.current.step)

    const clampedMinutes = Math.max(0, Math.min(totalMinutes, snappedMinutes))

    const resultDate = new Date(gestureRef.current.columnInfo.date)
    resultDate.setHours(start.hours, start.minutes + clampedMinutes, 0, 0)

    return resultDate
  }, [getTimeSlotContainer])

  const calculateBounds = useCallback((startTime: Date, endTime: Date): SelectionState["bounds"] => {
    const timeContent = getTimeSlotContainer()
    if (!timeContent || !gestureRef.current.columnInfo) return null

    const rect = timeContent.getBoundingClientRect()
    const scrollTop = timeContent.scrollTop

    const start = parseTimeString(optionsRef.current.dayStartTime)
    const end = parseTimeString(optionsRef.current.dayEndTime)
    const totalMinutes = (end.hours * 60 + end.minutes) - (start.hours * 60 + start.minutes)

    const contentHeight = timeContent.scrollHeight
    const pixelsPerMinute = contentHeight / totalMinutes

    const startMinutes = (startTime.getHours() * 60 + startTime.getMinutes()) - (start.hours * 60 + start.minutes)
    const endMinutes = (endTime.getHours() * 60 + endTime.getMinutes()) - (start.hours * 60 + start.minutes)

    const topOffset = startMinutes * pixelsPerMinute - scrollTop + rect.top
    const height = (endMinutes - startMinutes) * pixelsPerMinute

    return {
      top: topOffset,
      height: Math.max(height, optionsRef.current.step * pixelsPerMinute),
      left: gestureRef.current.columnInfo.left,
      width: gestureRef.current.columnInfo.width,
    }
  }, [getTimeSlotContainer])

  const cancelDrag = useCallback(() => {
    if (gestureRef.current.holdTimer) {
      clearTimeout(gestureRef.current.holdTimer)
      gestureRef.current.holdTimer = null
    }
    gestureRef.current.isHolding = false
    gestureRef.current.isDragging = false
    gestureRef.current.gestureDecided = false
    gestureRef.current.startTime = null
    gestureRef.current.columnInfo = null
    setIsDragging(false)
    setSelectionState({ startTime: null, endTime: null, bounds: null })
  }, [])

  // Store callbacks in refs for native event listeners
  const onSelectionCompleteRef = useRef(onSelectionComplete)
  useEffect(() => {
    onSelectionCompleteRef.current = onSelectionComplete
  }, [onSelectionComplete])

  const calculateBoundsRef = useRef(calculateBounds)
  const yPositionToTimeRef = useRef(yPositionToTime)
  const getDayColumnAtXRef = useRef(getDayColumnAtX)
  const getTimeSlotContainerRef = useRef(getTimeSlotContainer)
  const cancelDragRef = useRef(cancelDrag)
  const getGutterInfoRef = useRef(getGutterInfo)

  useEffect(() => {
    calculateBoundsRef.current = calculateBounds
    yPositionToTimeRef.current = yPositionToTime
    getDayColumnAtXRef.current = getDayColumnAtX
    getTimeSlotContainerRef.current = getTimeSlotContainer
    cancelDragRef.current = cancelDrag
    getGutterInfoRef.current = getGutterInfo
  }, [calculateBounds, yPositionToTime, getDayColumnAtX, getTimeSlotContainer, cancelDrag, getGutterInfo])

  // Track if container is mounted
  const [containerMounted, setContainerMounted] = useState(false)

  // Check for container mount
  useEffect(() => {
    if (containerRef.current && !containerMounted) {
      setContainerMounted(true)
    }
  })

  // Use native event listeners for touch events (to support non-passive)
  useEffect(() => {
    const container = containerRef.current
    if (!container || !containerMounted) return

    const handleTouchStart = (e: TouchEvent) => {
      if (!optionsRef.current.enabled) return
      if (e.touches.length !== 1) return

      const touch = e.touches[0]
      const target = e.target as HTMLElement

      // Don't intercept touches on events
      if (target.closest(".rbc-event")) return

      const columnInfo = getDayColumnAtXRef.current(touch.clientX)
      if (!columnInfo) return

      gestureRef.current.startPosition = { x: touch.clientX, y: touch.clientY }
      gestureRef.current.isHolding = true
      gestureRef.current.gestureDecided = false
      gestureRef.current.columnInfo = columnInfo

      // Start hold timer
      gestureRef.current.holdTimer = setTimeout(() => {
        if (gestureRef.current.isHolding && !gestureRef.current.gestureDecided) {
          triggerHapticFeedback()
          gestureRef.current.gestureDecided = true
          gestureRef.current.isDragging = true
          setIsDragging(true)

          // Capture gutter info when drag starts
          setGutterInfo(getGutterInfoRef.current())

          const time = yPositionToTimeRef.current(touch.clientY)
          if (time) {
            gestureRef.current.startTime = time
            const endTime = new Date(time)
            endTime.setMinutes(endTime.getMinutes() + optionsRef.current.step)

            setSelectionState({
              startTime: time,
              endTime,
              bounds: calculateBoundsRef.current(time, endTime),
            })
          }
        }
      }, HOLD_THRESHOLD_MS)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!optionsRef.current.enabled) return

      const touch = e.touches[0]

      // If not holding (touch started outside valid drag area), let native scroll handle it
      if (!gestureRef.current.isHolding) {
        return // Native scroll will work automatically
      }

      const deltaX = Math.abs(touch.clientX - gestureRef.current.startPosition.x)
      const deltaY = Math.abs(touch.clientY - gestureRef.current.startPosition.y)

      // If gesture not yet decided
      if (!gestureRef.current.gestureDecided) {
        // Any significant movement before hold threshold = scroll (cancel drag intent)
        if (deltaX > HORIZONTAL_SWIPE_THRESHOLD_PX || deltaY > VERTICAL_DRAG_THRESHOLD_PX) {
          // Clear hold timer
          if (gestureRef.current.holdTimer) {
            clearTimeout(gestureRef.current.holdTimer)
            gestureRef.current.holdTimer = null
          }
          // Switch to scroll mode - let native handle it
          gestureRef.current.gestureDecided = true
          gestureRef.current.isDragging = false
          gestureRef.current.isHolding = false
          return // Native scroll will handle it
        }
        // Still waiting for hold threshold, don't scroll yet
        return
      }

      // Gesture was decided - either scrolling or dragging
      if (!gestureRef.current.isDragging) {
        // Scroll mode - let native handle it
        return
      }

      // If we're in drag mode, prevent scrolling and update selection
      if (gestureRef.current.isDragging) {
        e.preventDefault()
        e.stopPropagation()

        if (gestureRef.current.startTime) {
          const currentTime = yPositionToTimeRef.current(touch.clientY)
          if (currentTime) {
            const startTime = gestureRef.current.startTime
            const [selStart, selEnd] = currentTime < startTime
              ? [currentTime, startTime]
              : [startTime, currentTime]

            const minEnd = new Date(selStart)
            minEnd.setMinutes(minEnd.getMinutes() + optionsRef.current.step)
            const finalEnd = selEnd < minEnd ? minEnd : selEnd

            setSelectionState({
              startTime: selStart,
              endTime: finalEnd,
              bounds: calculateBoundsRef.current(selStart, finalEnd),
            })
          }
        }
      }
    }

    const handleTouchEnd = () => {
      if (!optionsRef.current.enabled) return

      if (gestureRef.current.holdTimer) {
        clearTimeout(gestureRef.current.holdTimer)
        gestureRef.current.holdTimer = null
      }

      // If we have a valid selection, trigger the callback
      if (gestureRef.current.isDragging && gestureRef.current.startTime) {
        // Get the current selection state synchronously
        setSelectionState(current => {
          if (current.startTime && current.endTime) {
            // Use setTimeout to ensure state is updated before callback
            setTimeout(() => {
              onSelectionCompleteRef.current(current.startTime!, current.endTime!)
            }, 0)
          }
          return { startTime: null, endTime: null, bounds: null }
        })
      }

      // Reset state
      gestureRef.current.isHolding = false
      gestureRef.current.isDragging = false
      gestureRef.current.gestureDecided = false
      gestureRef.current.startTime = null
      gestureRef.current.columnInfo = null
      setIsDragging(false)
    }

    const handleTouchCancel = () => {
      cancelDragRef.current()
    }

    // Add listeners with { passive: false } to allow preventDefault
    container.addEventListener("touchstart", handleTouchStart, { passive: true })
    container.addEventListener("touchmove", handleTouchMove, { passive: false })
    container.addEventListener("touchend", handleTouchEnd, { passive: true })
    container.addEventListener("touchcancel", handleTouchCancel, { passive: true })

    return () => {
      container.removeEventListener("touchstart", handleTouchStart)
      container.removeEventListener("touchmove", handleTouchMove)
      container.removeEventListener("touchend", handleTouchEnd)
      container.removeEventListener("touchcancel", handleTouchCancel)
    }
  }, [containerRef, containerMounted])

  // Return empty handlers since we're using native event listeners
  const dragHandlers = useCallback(() => ({}), [])

  return {
    dragHandlers,
    isDragging,
    selectionState,
    gutterInfo,
  }
}
