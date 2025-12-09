'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { CalendarEvent, CalendarSettings, EventLayoutInfo } from '../../types/calendar'
import { EventCard } from './EventCard'
import { format, isSameDay, addDays, startOfDay } from 'date-fns'

interface CalendarTimelineProps {
  view: 'day' | 'agenda'
  currentDate: Date
  events: CalendarEvent[]
  onSlotClick?: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  onQuickAction?: (action: 'complete' | 'cancel' | 'edit', event: CalendarEvent) => void
  settings: CalendarSettings
}

export function CalendarTimeline({
  view,
  currentDate,
  events,
  onSlotClick,
  onEventClick,
  onQuickAction,
  settings,
}: CalendarTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  // Scroll to current time on mount (day view only)
  useEffect(() => {
    if (view === 'day' && containerRef.current) {
      const currentHour = new Date().getHours()
      const scrollPosition = (currentHour - 6) * 60 * 2 // 2px per minute, starting from 6am

      setTimeout(() => {
        containerRef.current?.scrollTo({
          top: Math.max(0, scrollPosition - 200),
          behavior: 'smooth',
        })
      }, 100)
    }
  }, [view])

  if (view === 'day') {
    return <DayView
      currentDate={currentDate}
      events={events}
      currentTime={currentTime}
      onSlotClick={onSlotClick}
      onEventClick={onEventClick}
      onQuickAction={onQuickAction}
      settings={settings}
      containerRef={containerRef}
    />
  }

  return <AgendaView
    currentDate={currentDate}
    events={events}
    onEventClick={onEventClick}
    onQuickAction={onQuickAction}
    containerRef={containerRef}
  />
}

// Day View Component
interface DayViewProps {
  currentDate: Date
  events: CalendarEvent[]
  currentTime: Date
  onSlotClick?: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  onQuickAction?: (action: 'complete' | 'cancel' | 'edit', event: CalendarEvent) => void
  settings: CalendarSettings
  containerRef: React.RefObject<HTMLDivElement | null>
}

function DayView({
  currentDate,
  events,
  currentTime,
  onSlotClick,
  onEventClick,
  onQuickAction,
  settings,
  containerRef,
}: DayViewProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const isToday = isSameDay(currentDate, new Date())

  // Filter events for current day
  const dayEvents = events.filter(event => isSameDay(event.startTime, currentDate))

  // Calculate event positions
  const eventLayouts = calculateEventLayout(dayEvents)

  // Calculate current time position
  const getCurrentTimePosition = () => {
    const hours = currentTime.getHours()
    const minutes = currentTime.getMinutes()
    return hours * 120 + minutes * 2 // 120px per hour (2px per minute)
  }

  const handleSlotClick = (hour: number) => {
    if (onSlotClick) {
      const slotDate = new Date(currentDate)
      slotDate.setHours(hour, 0, 0, 0)
      onSlotClick(slotDate)
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto overflow-x-hidden"
      style={{
        scrollBehavior: 'smooth',
        backgroundColor: 'var(--calendar-bg-primary)',
      }}
    >
      <div className="relative min-h-full">
        {/* Time column and grid */}
        <div className="flex">
          {/* Time labels */}
          <div className="flex-shrink-0 w-20 relative">
            {hours.map(hour => (
              <div
                key={hour}
                className="h-[120px] flex items-start justify-end pr-3 pt-1 text-xs text-gray-500 font-medium"
              >
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
            ))}
          </div>

          {/* Events area */}
          <div className="flex-1 relative border-l border-gray-200">
            {/* Time slot grid */}
            {hours.map(hour => (
              <div key={hour}>
                {/* Full hour slot */}
                <motion.div
                  className="h-[60px] border-b border-gray-200 cursor-pointer hover:bg-blue-50/50 transition-colors"
                  whileTap={{ backgroundColor: 'rgba(59, 130, 246, 0.08)' }}
                  onClick={() => handleSlotClick(hour)}
                />
                {/* Half hour slot */}
                <motion.div
                  className="h-[60px] border-b border-gray-100 cursor-pointer hover:bg-blue-50/50 transition-colors"
                  whileTap={{ backgroundColor: 'rgba(59, 130, 246, 0.08)' }}
                  onClick={() => handleSlotClick(hour)}
                />
              </div>
            ))}

            {/* Events */}
            <AnimatePresence mode="popLayout">
              {eventLayouts.map((layout) => (
                <motion.div
                  key={layout.event.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="absolute"
                  style={{
                    top: `${layout.top}px`,
                    left: `${layout.left}%`,
                    width: `${layout.width}%`,
                    height: `${layout.height}px`,
                    padding: '4px',
                    zIndex: 10,
                  }}
                >
                  <EventCard
                    event={layout.event}
                    viewType="day"
                    onClick={onEventClick}
                    onQuickAction={onQuickAction}
                    style={{ height: '100%' }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Current time indicator */}
            {isToday && (
              <motion.div
                className="absolute left-0 right-0 z-20 pointer-events-none"
                style={{ top: `${getCurrentTimePosition()}px` }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {/* Red dot */}
                <div
                  className="absolute -left-1 -top-1.5 w-3 h-3 bg-red-500 rounded-full"
                  style={{
                    animation: 'time-dot-pulse 2s ease-in-out infinite',
                  }}
                />
                {/* Red line */}
                <div
                  className="w-full h-0.5 bg-red-500"
                  style={{
                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
                  }}
                />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Agenda View Component
interface AgendaViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
  onQuickAction?: (action: 'complete' | 'cancel' | 'edit', event: CalendarEvent) => void
  containerRef: React.RefObject<HTMLDivElement | null>
}

function AgendaView({
  currentDate,
  events,
  onEventClick,
  onQuickAction,
  containerRef,
}: AgendaViewProps) {
  // Group events by date for next 30 days
  const groupedEvents = groupEventsByDate(events, currentDate, 30)

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto"
      style={{ backgroundColor: 'var(--calendar-bg-primary)' }}
    >
      <div className="max-w-4xl mx-auto py-6 px-4">
        <AnimatePresence mode="popLayout">
          {groupedEvents.map((group, index) => (
            <motion.div
              key={group.date.toISOString()}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              className="mb-8"
            >
              {/* Date header */}
              <div className="sticky top-0 z-10 mb-4 pb-2 backdrop-blur-sm bg-white/80 dark:bg-gray-900/80">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {format(group.date, 'EEEE, MMMM d, yyyy')}
                </h3>
                <p className="text-sm text-gray-500">
                  {group.events.length} {group.events.length === 1 ? 'appointment' : 'appointments'}
                </p>
              </div>

              {/* Events list */}
              {group.events.length > 0 ? (
                <div className="space-y-3">
                  {group.events
                    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
                    .map(event => (
                      <motion.div
                        key={event.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <EventCard
                          event={event}
                          viewType="agenda"
                          onClick={onEventClick}
                          onQuickAction={onQuickAction}
                        />
                      </motion.div>
                    ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-12 text-center"
                >
                  <p className="text-gray-400 text-sm">No appointments scheduled</p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Helper: Calculate event layout for overlapping events
function calculateEventLayout(events: CalendarEvent[]): EventLayoutInfo[] {
  if (events.length === 0) return []

  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

  const layouts: EventLayoutInfo[] = []
  const columns: CalendarEvent[][] = []

  sortedEvents.forEach(event => {
    // Find a column where this event doesn't overlap
    let columnIndex = 0
    let placed = false

    for (let i = 0; i < columns.length; i++) {
      const column = columns[i]
      const lastEventInColumn = column[column.length - 1]

      // Check if event can be placed in this column
      if (lastEventInColumn.endTime <= event.startTime) {
        column.push(event)
        columnIndex = i
        placed = true
        break
      }
    }

    // If no suitable column found, create a new one
    if (!placed) {
      columns.push([event])
      columnIndex = columns.length - 1
    }

    // Calculate position
    const startMinutes = event.startTime.getHours() * 60 + event.startTime.getMinutes()
    const endMinutes = event.endTime.getHours() * 60 + event.endTime.getMinutes()
    const duration = endMinutes - startMinutes

    layouts.push({
      event,
      top: startMinutes * 2, // 2px per minute
      height: Math.max(duration * 2, 60), // Minimum 60px height
      left: (columnIndex / columns.length) * 100,
      width: 100 / columns.length - 1, // -1% for gap
      column: columnIndex,
      maxColumns: columns.length,
    })
  })

  return layouts
}

// Helper: Group events by date
interface DateGroup {
  date: Date
  events: CalendarEvent[]
}

function groupEventsByDate(events: CalendarEvent[], startDate: Date, days: number): DateGroup[] {
  const groups: DateGroup[] = []

  for (let i = 0; i < days; i++) {
    const date = addDays(startOfDay(startDate), i)
    const dayEvents = events.filter(event => isSameDay(event.startTime, date))

    groups.push({
      date,
      events: dayEvents,
    })
  }

  return groups
}
