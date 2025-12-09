'use client'

import { useState } from 'react'
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { format } from 'date-fns'
import { CompletionAnimation } from './CompletionAnimation'

type Appointment = {
  id: string
  startTime: string
  endTime: string
  status: string
  client: {
    id: string
    fullName: string
    email: string
  }
}

interface UpcomingAppointmentCardProps {
  appointment: Appointment
  onComplete: (id: string) => void
  onCancel: (id: string) => void
  onClick?: (id: string) => void
}

export function UpcomingAppointmentCard({
  appointment,
  onComplete,
  onCancel,
  onClick,
}: UpcomingAppointmentCardProps) {
  const [isCompleting, setIsCompleting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const x = useMotionValue(0)

  // Transform x position to icon opacity
  const leftIconOpacity = useTransform(x, [-200, -50, 0], [1, 0.5, 0])
  const rightIconOpacity = useTransform(x, [0, 50, 200], [0, 0.5, 1])

  // Determine swipe direction and color
  const backgroundColor = useTransform(x, (value) => {
    if (value < -50) return 'rgba(239, 68, 68, 0.1)' // Red for cancel
    if (value > 50) return 'rgba(16, 185, 129, 0.1)' // Green for complete
    return 'rgba(0, 0, 0, 0)'
  })

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100 // Threshold in pixels
    const velocity = Math.abs(info.velocity.x)

    setIsDragging(false)

    // Check if threshold is met or velocity is high enough
    if (Math.abs(info.offset.x) > threshold || velocity > 500) {
      if (info.offset.x > 0) {
        // Swiped right - Complete
        handleComplete()
      } else {
        // Swiped left - Cancel
        handleCancelAppointment()
      }
    } else {
      // Snap back
      x.set(0)
    }
  }

  const handleComplete = () => {
    setIsCompleting(true)
    // Don't call onComplete yet - wait for animation
  }

  const handleCancelAppointment = () => {
    onCancel(appointment.id)
  }

  const handleAnimationComplete = () => {
    onComplete(appointment.id)
  }

  const handleClick = () => {
    if (!isDragging && onClick) {
      onClick(appointment.id)
    }
  }

  return (
    <div className="relative">
      {/* Background action indicators */}
      <motion.div
        className="absolute inset-0 rounded-xl overflow-hidden"
        style={{ backgroundColor }}
      >
        {/* Left icon (Cancel) */}
        <motion.div
          className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2"
          style={{ opacity: leftIconOpacity }}
        >
          <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <span className="text-red-600 font-semibold">Cancel</span>
        </motion.div>

        {/* Right icon (Complete) */}
        <motion.div
          className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2"
          style={{ opacity: rightIconOpacity }}
        >
          <span className="text-green-600 font-semibold">Complete</span>
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </motion.div>
      </motion.div>

      {/* Main card */}
      <motion.div
        className="relative bg-white p-5 border-2 border-gray-100 rounded-xl hover:border-blue-500/30 hover:shadow-lg transition-shadow duration-200 cursor-pointer touch-pan-y"
        style={{
          x,
          willChange: 'transform',
        }}
        drag="x"
        dragConstraints={{ left: -300, right: 300 }}
        dragElastic={0.2}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        whileTap={{ scale: isDragging ? 1 : 0.98 }}
      >
        {/* Completion animation overlay */}
        {isCompleting && (
          <CompletionAnimation
            onComplete={handleAnimationComplete}
            intensity="subtle"
          />
        )}

        <div className="flex justify-between items-center">
          <div className="flex-1">
            <div className="font-semibold text-lg text-gray-900">
              {appointment.client.fullName}
            </div>
            <div className="text-sm text-gray-600 mt-1 flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {format(new Date(appointment.startTime), 'EEEE, MMM d')} at{' '}
              {format(new Date(appointment.startTime), 'h:mm a')} -{' '}
              {format(new Date(appointment.endTime), 'h:mm a')}
            </div>
          </div>

          {/* Swipe indicator - only show on mobile */}
          <div className="md:hidden text-gray-400">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 9l4-4 4 4m0 6l-4 4-4-4"
              />
            </svg>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
