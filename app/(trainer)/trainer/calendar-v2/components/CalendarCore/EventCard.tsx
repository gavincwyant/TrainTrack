'use client'

import { motion } from 'framer-motion'
import { CalendarEvent, CalendarView, STATUS_COLORS, TIMING } from '../../types/calendar'
import { Check, Clock, Edit2, X } from 'lucide-react'
import { useState } from 'react'

interface EventCardProps {
  event: CalendarEvent
  viewType: CalendarView
  onClick?: (event: CalendarEvent) => void
  onQuickAction?: (action: 'complete' | 'cancel' | 'edit', event: CalendarEvent) => void
  style?: React.CSSProperties
}

export function EventCard({ event, viewType, onClick, onQuickAction, style }: EventCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const isMonthView = viewType === 'month'
  const isDetailedView = viewType === 'week' || viewType === 'day'
  const statusColors = STATUS_COLORS[event.status]

  // Calculate duration for vertical indicator
  const duration = (event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60) // in minutes

  // Format time display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const timeRange = `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`

  // Handle click with scale animation
  const handleClick = () => {
    if (onClick) onClick(event)
  }

  const handleQuickAction = (action: 'complete' | 'cancel' | 'edit', e: React.MouseEvent) => {
    e.stopPropagation()
    if (onQuickAction) onQuickAction(action, event)
  }

  // Get status indicator for different statuses
  const getStatusIndicator = () => {
    if (event.status === 'COMPLETED') {
      return (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-md z-10">
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </div>
      )
    }
    return null
  }

  // Diagonal stripe pattern for blocked time
  const getDiagonalPattern = () => {
    if (event.type === 'blocked') {
      return (
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, currentColor 10px, currentColor 12px)',
          }}
        />
      )
    }
    return null
  }

  // Month view - Compact layout
  if (isMonthView) {
    return (
      <motion.div
        className="relative cursor-pointer overflow-hidden rounded-md"
        style={{
          background: statusColors.bg,
          height: '24px',
          padding: '2px 6px',
          opacity: 'opacity' in statusColors ? statusColors.opacity : 1,
          border: event.status === 'CANCELLED' ? '1px dashed rgba(255,255,255,0.5)' : 'none',
          boxShadow: 'var(--shadow-sm)',
          ...style,
        }}
        whileHover={{
          scale: 1.02,
          y: -2,
          boxShadow: `0 4px 12px ${'glow' in statusColors ? statusColors.glow : 'rgba(0,0,0,0.15)'}`,
        }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: TIMING.fast / 1000, ease: [0.175, 0.885, 0.32, 1.275] }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {getDiagonalPattern()}
        <div className="flex items-center gap-1.5 h-full">
          {/* Client avatar */}
          {event.clientAvatar ? (
            <img
              src={event.clientAvatar}
              alt={event.clientName}
              className="w-4 h-4 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-semibold"
              style={{
                backgroundColor: 'rgba(255,255,255,0.3)',
                color: statusColors.text
              }}
            >
              {event.clientName.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Client name - truncated */}
          <span
            className="text-xs font-medium truncate flex-1"
            style={{ color: statusColors.text }}
          >
            {event.clientName}
          </span>
        </div>
        {getStatusIndicator()}
      </motion.div>
    )
  }

  // Week/Day view - Detailed layout
  if (isDetailedView) {
    return (
      <motion.div
        className="relative cursor-pointer overflow-hidden rounded-lg"
        style={{
          background: statusColors.bg,
          padding: '10px 12px',
          opacity: 'opacity' in statusColors ? statusColors.opacity : 1,
          border: event.status === 'CANCELLED' ? '1px dashed rgba(255,255,255,0.5)' : 'none',
          borderLeft: `4px solid ${statusColors.border}`,
          boxShadow: 'var(--shadow-md)',
          minHeight: '80px',
          ...style,
        }}
        whileHover={{
          scale: 1.02,
          y: -2,
          boxShadow: `var(--shadow-lg), 0 4px 20px ${'glow' in statusColors ? statusColors.glow : 'rgba(0,0,0,0.2)'}`,
        }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: TIMING.fast / 1000, ease: [0.175, 0.885, 0.32, 1.275] }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {getDiagonalPattern()}

        {/* Quick actions - Desktop only, on hover */}
        {isHovered && onQuickAction && (
          <motion.div
            className="absolute top-2 right-2 flex gap-1 z-20"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
          >
            {event.status === 'SCHEDULED' && (
              <motion.button
                className="w-6 h-6 rounded-md bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white shadow-sm"
                onClick={(e) => handleQuickAction('complete', e)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Mark as complete"
              >
                <Check className="w-3.5 h-3.5 text-green-600" strokeWidth={2.5} />
              </motion.button>
            )}
            <motion.button
              className="w-6 h-6 rounded-md bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white shadow-sm"
              onClick={(e) => handleQuickAction('edit', e)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Edit"
            >
              <Edit2 className="w-3.5 h-3.5 text-blue-600" strokeWidth={2.5} />
            </motion.button>
            {event.status === 'SCHEDULED' && (
              <motion.button
                className="w-6 h-6 rounded-md bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white shadow-sm"
                onClick={(e) => handleQuickAction('cancel', e)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Cancel"
              >
                <X className="w-3.5 h-3.5 text-red-600" strokeWidth={2.5} />
              </motion.button>
            )}
          </motion.div>
        )}

        {/* Client info */}
        <div className="flex items-center gap-2 mb-2">
          {event.clientAvatar ? (
            <img
              src={event.clientAvatar}
              alt={event.clientName}
              className="w-6 h-6 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold"
              style={{
                backgroundColor: 'rgba(255,255,255,0.3)',
                color: statusColors.text
              }}
            >
              {event.clientName.charAt(0).toUpperCase()}
            </div>
          )}
          <span
            className="font-semibold text-sm truncate"
            style={{ color: statusColors.text }}
          >
            {event.clientName}
          </span>
        </div>

        {/* Time display */}
        <div className="flex items-center gap-1.5 mb-1">
          <Clock className="w-3.5 h-3.5" style={{ color: statusColors.text, opacity: 0.8 }} />
          <span
            className="text-xs font-medium"
            style={{ color: statusColors.text, opacity: 0.9 }}
          >
            {timeRange}
          </span>
        </div>

        {/* Status indicator dot */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: statusColors.text,
              boxShadow: `0 0 8px ${'glow' in statusColors ? statusColors.glow : 'rgba(255,255,255,0.5)'}`,
            }}
          />
          <span
            className="text-xs font-medium capitalize"
            style={{ color: statusColors.text, opacity: 0.9 }}
          >
            {event.status.toLowerCase()}
          </span>
        </div>

        {/* Duration indicator - vertical bar on right */}
        <div
          className="absolute top-0 right-0 w-1 rounded-r-lg"
          style={{
            height: `${Math.min((duration / 60) * 50, 100)}%`,
            background: `linear-gradient(180deg, ${statusColors.text} 0%, transparent 100%)`,
            opacity: 0.3,
          }}
        />

        {getStatusIndicator()}
      </motion.div>
    )
  }

  // Default/Agenda view - similar to detailed but more compact
  return (
    <motion.div
      className="relative cursor-pointer overflow-hidden rounded-lg"
      style={{
        background: statusColors.bg,
        padding: '8px 12px',
        opacity: 'opacity' in statusColors ? statusColors.opacity : 1,
        border: event.status === 'CANCELLED' ? '1px dashed rgba(255,255,255,0.5)' : 'none',
        borderLeft: `3px solid ${statusColors.border}`,
        boxShadow: 'var(--shadow-sm)',
        ...style,
      }}
      whileHover={{
        scale: 1.01,
        boxShadow: `var(--shadow-md), 0 2px 12px ${'glow' in statusColors ? statusColors.glow : 'rgba(0,0,0,0.15)'}`,
      }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: TIMING.fast / 1000 }}
      onClick={handleClick}
    >
      {getDiagonalPattern()}

      <div className="flex items-center justify-between gap-3">
        {/* Client info */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {event.clientAvatar ? (
            <img
              src={event.clientAvatar}
              alt={event.clientName}
              className="w-5 h-5 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-semibold"
              style={{
                backgroundColor: 'rgba(255,255,255,0.3)',
                color: statusColors.text
              }}
            >
              {event.clientName.charAt(0).toUpperCase()}
            </div>
          )}
          <span
            className="font-medium text-sm truncate"
            style={{ color: statusColors.text }}
          >
            {event.clientName}
          </span>
        </div>

        {/* Time */}
        <span
          className="text-xs font-medium whitespace-nowrap"
          style={{ color: statusColors.text, opacity: 0.9 }}
        >
          {formatTime(event.startTime)}
        </span>
      </div>

      {getStatusIndicator()}
    </motion.div>
  )
}
