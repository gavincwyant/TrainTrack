'use client'

import { motion } from 'framer-motion'
import { TimeSlot as TimeSlotType } from '../../types/calendar'

interface TimeSlotProps {
  slot: TimeSlotType
  onClick?: (slot: TimeSlotType) => void
  isHovered?: boolean
  hasConflict?: boolean
  showTimeLabel?: boolean
}

export default function TimeSlot({
  slot,
  onClick,
  isHovered = false,
  hasConflict = false,
  showTimeLabel = false,
}: TimeSlotProps) {
  const handleClick = () => {
    if (onClick && !slot.isPast) {
      onClick(slot)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  return (
    <motion.div
      whileHover={!slot.isPast ? { scale: 1.01 } : undefined}
      whileTap={!slot.isPast ? { scale: 0.99 } : undefined}
      onClick={handleClick}
      className={`relative min-h-[48px] border-b border-gray-200 dark:border-gray-800 transition-all duration-[var(--timing-fast)] ${
        slot.isPast
          ? 'bg-gray-50 dark:bg-gray-900/50 cursor-not-allowed opacity-60'
          : slot.isEmpty && slot.isWorkingHours
          ? 'cursor-pointer hover:bg-[var(--calendar-bg-hover)]'
          : slot.isEmpty
          ? 'bg-gray-50 dark:bg-gray-900/30 cursor-not-allowed'
          : ''
      } ${hasConflict ? 'bg-amber-50 dark:bg-amber-900/10' : ''} ${
        isHovered && !slot.isPast ? 'bg-[var(--calendar-bg-selected)]' : ''
      }`}
      role="button"
      tabIndex={slot.isPast ? -1 : 0}
      aria-label={`Time slot ${formatTime(slot.start)} to ${formatTime(slot.end)}${
        slot.isEmpty ? ', empty' : `, ${slot.events.length} events`
      }`}
      aria-disabled={slot.isPast}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !slot.isPast) {
          e.preventDefault()
          handleClick()
        }
      }}
    >
      {/* Time label */}
      {showTimeLabel && (
        <div className="absolute -left-14 top-0 text-xs font-medium text-gray-500 dark:text-gray-500 pr-2 text-right w-12">
          {formatTime(slot.start)}
        </div>
      )}

      {/* Conflict indicator */}
      {hasConflict && (
        <div className="absolute top-1 right-1">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        </div>
      )}

      {/* Click pulse animation */}
      {!slot.isPast && (
        <motion.div
          className="absolute inset-0 rounded-sm pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0 }}
          whileTap={{
            opacity: [0, 0.12, 0],
            transition: { duration: 0.5 },
          }}
          style={{
            background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
          }}
        />
      )}
    </motion.div>
  )
}
