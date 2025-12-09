"use client"

import { motion } from 'framer-motion'
import { DragSelection } from '../../types/calendar'

interface DragToBlockOverlayProps {
  dragSelection: DragSelection
  calendarRef?: React.RefObject<HTMLDivElement>
}

export function DragToBlockOverlay({ dragSelection, calendarRef }: DragToBlockOverlayProps) {
  const { startSlot, endSlot, isValid } = dragSelection

  // Format time for display
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  // Calculate position and size based on time slots
  const calculateOverlayStyle = (): React.CSSProperties => {
    if (!calendarRef?.current) return {}

    // Find the time slot elements
    const startElement = calendarRef.current.querySelector(
      `[data-time-slot="${startSlot.toISOString()}"]`
    ) as HTMLElement
    const endElement = calendarRef.current.querySelector(
      `[data-time-slot="${endSlot.toISOString()}"]`
    ) as HTMLElement

    if (!startElement || !endElement) return {}

    const containerRect = calendarRef.current.getBoundingClientRect()
    const startRect = startElement.getBoundingClientRect()
    const endRect = endElement.getBoundingClientRect()

    // Calculate top, left, width, height relative to container
    const top = startRect.top - containerRect.top
    const left = startRect.left - containerRect.left
    const width = startRect.width
    const height = endRect.bottom - startRect.top

    return {
      position: 'absolute',
      top: `${top}px`,
      left: `${left}px`,
      width: `${width}px`,
      height: `${height}px`,
      pointerEvents: 'none',
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      style={calculateOverlayStyle()}
      className="z-30"
    >
      {/* Semi-transparent overlay with diagonal stripes */}
      <div
        className="absolute inset-0 rounded-lg overflow-hidden"
        style={{
          backgroundColor: isValid ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          backgroundImage: isValid
            ? 'repeating-linear-gradient(45deg, rgba(59, 130, 246, 0.05) 0px, rgba(59, 130, 246, 0.05) 10px, transparent 10px, transparent 20px)'
            : 'repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.05) 0px, rgba(239, 68, 68, 0.05) 10px, transparent 10px, transparent 20px)',
        }}
      />

      {/* Animated dashed border */}
      <motion.div
        className="absolute inset-0 rounded-lg"
        style={{
          border: `2px dashed ${isValid ? 'rgb(59, 130, 246)' : 'rgb(239, 68, 68)'}`,
        }}
        animate={{
          borderColor: isValid
            ? ['rgba(59, 130, 246, 0.5)', 'rgba(59, 130, 246, 1)', 'rgba(59, 130, 246, 0.5)']
            : ['rgba(239, 68, 68, 0.5)', 'rgba(239, 68, 68, 1)', 'rgba(239, 68, 68, 0.5)'],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Time range label */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
      >
        <div
          className={`px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm ${
            isValid
              ? 'bg-blue-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          <div className="text-xs font-medium whitespace-nowrap">
            {isValid ? (
              <>
                {formatTime(startSlot)} - {formatTime(endSlot)}
              </>
            ) : (
              'Invalid Selection'
            )}
          </div>
        </div>
      </motion.div>

      {/* Corner indicators */}
      {isValid && (
        <>
          {/* Top-left corner */}
          <motion.div
            className="absolute top-0 left-0 w-3 h-3 bg-blue-600 rounded-full"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [1, 0.6, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Bottom-right corner */}
          <motion.div
            className="absolute bottom-0 right-0 w-3 h-3 bg-blue-600 rounded-full"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [1, 0.6, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.5,
            }}
          />
        </>
      )}
    </motion.div>
  )
}

// Simplified version for when calendar ref is not available
export function SimpleDragOverlay({ dragSelection }: { dragSelection: DragSelection }) {
  const { startSlot, endSlot, isValid } = dragSelection

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50"
    >
      <div
        className={`px-6 py-3 rounded-xl shadow-2xl backdrop-blur-sm ${
          isValid
            ? 'bg-blue-600 text-white'
            : 'bg-red-600 text-white'
        }`}
      >
        <div className="flex items-center gap-3">
          {isValid ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <div className="text-xs font-medium opacity-80">Blocking Time</div>
                <div className="text-sm font-semibold">
                  {formatTime(startSlot)} - {formatTime(endSlot)}
                </div>
              </div>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span className="text-sm font-semibold">Invalid Selection</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}
