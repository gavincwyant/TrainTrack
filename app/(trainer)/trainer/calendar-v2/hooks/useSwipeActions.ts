'use client'

import { useCallback } from 'react'
import { useMotionValue, useTransform, MotionValue } from 'framer-motion'
import { PanInfo } from 'framer-motion'

interface UseSwipeActionsReturn {
  x: MotionValue<number>
  backgroundColor: MotionValue<string>
  leftIconOpacity: MotionValue<number>
  rightIconOpacity: MotionValue<number>
  handleDragEnd: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void
  resetPosition: () => void
}

export function useSwipeActions(
  onComplete: () => void,
  onCancel: () => void,
  threshold: number = 100
): UseSwipeActionsReturn {
  const x = useMotionValue(0)

  // Transform x position to background color for visual feedback
  const backgroundColor = useTransform(x, (value): string => {
    if (value < -50) return 'rgba(239, 68, 68, 0.1)' // Red for cancel
    if (value > 50) return 'rgba(16, 185, 129, 0.1)' // Green for complete
    return 'rgba(0, 0, 0, 0)'
  })

  // Transform x position to icon opacity
  const leftIconOpacity = useTransform(x, [-200, -50, 0], [1, 0.5, 0])
  const rightIconOpacity = useTransform(x, [0, 50, 200], [0, 0.5, 1])

  const resetPosition = useCallback(() => {
    x.set(0)
  }, [x])

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const velocity = Math.abs(info.velocity.x)
      const offset = info.offset.x

      // Haptic feedback when threshold is crossed
      if ('vibrate' in navigator) {
        if (Math.abs(offset) > threshold || velocity > 500) {
          navigator.vibrate(30)
        }
      }

      // Check if threshold is met or velocity is high enough
      if (Math.abs(offset) > threshold || velocity > 500) {
        if (offset > 0) {
          // Swiped right - Complete
          onComplete()
        } else {
          // Swiped left - Cancel
          onCancel()
        }
      } else {
        // Snap back with spring animation
        x.set(0)
      }
    },
    [x, threshold, onComplete, onCancel]
  )

  return {
    x,
    backgroundColor,
    leftIconOpacity,
    rightIconOpacity,
    handleDragEnd,
    resetPosition,
  }
}
