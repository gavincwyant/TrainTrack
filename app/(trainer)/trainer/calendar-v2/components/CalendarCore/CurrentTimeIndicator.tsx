'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface CurrentTimeIndicatorProps {
  currentTime: Date
  dayStartTime: string // "06:00"
  pixelsPerHour: number
}

export default function CurrentTimeIndicator({
  currentTime,
  dayStartTime,
  pixelsPerHour,
}: CurrentTimeIndicatorProps) {
  const [position, setPosition] = useState(0)

  useEffect(() => {
    const calculatePosition = () => {
      const [startHour, startMinute] = dayStartTime.split(':').map(Number)
      const dayStartMinutes = startHour * 60 + startMinute

      const currentHour = currentTime.getHours()
      const currentMinute = currentTime.getMinutes()
      const currentMinutes = currentHour * 60 + currentMinute

      const minutesSinceDayStart = currentMinutes - dayStartMinutes
      const hoursSinceDayStart = minutesSinceDayStart / 60

      return hoursSinceDayStart * pixelsPerHour
    }

    setPosition(calculatePosition())

    // Update position every minute
    const interval = setInterval(() => {
      const now = new Date()
      const [startHour, startMinute] = dayStartTime.split(':').map(Number)
      const dayStartMinutes = startHour * 60 + startMinute
      const currentMinutes = now.getHours() * 60 + now.getMinutes()
      const minutesSinceDayStart = currentMinutes - dayStartMinutes
      const hoursSinceDayStart = minutesSinceDayStart / 60

      setPosition(hoursSinceDayStart * pixelsPerHour)
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [currentTime, dayStartTime, pixelsPerHour])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{
        top: `${position}px`,
      }}
    >
      {/* Pulsing dot */}
      <div className="absolute -left-[5px] -top-[5px] w-[10px] h-[10px] rounded-full bg-red-500 shadow-lg animate-[time-dot-pulse_2s_ease-in-out_infinite]" />

      {/* Red line with glow */}
      <div className="h-[2px] w-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-[time-indicator-pulse_2s_ease-in-out_infinite]" />

      {/* Optional time label */}
      <div className="absolute left-2 -top-2.5 px-2 py-0.5 bg-red-500 text-white text-[10px] font-semibold rounded shadow-md">
        {currentTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })}
      </div>
    </motion.div>
  )
}
