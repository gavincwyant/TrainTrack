"use client"

import { useDrag } from "@use-gesture/react"
import { addDays, addWeeks, addMonths } from "date-fns"
import { View } from "react-big-calendar"

interface UseCalendarSwipeOptions {
  disabled?: boolean
}

export function useCalendarSwipe(
  date: Date,
  setDate: (date: Date) => void,
  view: View,
  options: UseCalendarSwipeOptions = {}
) {
  const { disabled = false } = options

  const bind = useDrag(
    ({ swipe: [swipeX], direction: [dx], event }) => {
      // Skip if disabled (e.g., when scrolling to weekend)
      if (disabled) return

      // Only handle horizontal swipes
      if (swipeX === 0) return

      // Prevent default to avoid any unwanted scrolling
      event?.preventDefault()

      // Right swipe (dx > 0) = go to previous, Left swipe (dx < 0) = go to next
      const direction = dx > 0 ? -1 : 1

      switch (view) {
        case "month":
          setDate(addMonths(date, direction))
          break
        case "week":
          setDate(addWeeks(date, direction))
          break
        case "day":
        case "agenda":
          setDate(addDays(date, direction))
          break
        default:
          break
      }
    },
    {
      axis: "x",
      swipe: {
        distance: 50,
        velocity: 0.5,
      },
      filterTaps: true,
      pointer: {
        touch: true,
      },
      enabled: !disabled,
    }
  )

  return bind
}
