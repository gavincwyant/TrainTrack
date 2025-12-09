'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useMemo, useState } from 'react'
import {
  CalendarView,
  CalendarEvent,
  CalendarSettings,
  FilterState,
  TimeSlot as TimeSlotType,
} from '../../types/calendar'
import CurrentTimeIndicator from './CurrentTimeIndicator'
import TimeSlot from './TimeSlot'

interface CalendarGridProps {
  view: CalendarView
  currentDate: Date
  events: CalendarEvent[]
  onSlotClick?: (date: Date, time?: string) => void
  onEventClick?: (event: CalendarEvent) => void
  onContextMenu?: (e: React.MouseEvent, target: { type: 'slot' | 'event'; data: any }) => void
  settings: CalendarSettings
  filters: FilterState
  dragHandlers?: {
    onMouseDown: (e: React.MouseEvent, slot: Date) => void
    onMouseMove: (e: React.MouseEvent, slot: Date) => void
    onMouseUp: () => void
    onTouchStart: (e: React.TouchEvent, slot: Date) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: () => void
  }
}

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function CalendarGrid({
  view,
  currentDate,
  events,
  onSlotClick,
  onEventClick,
  onContextMenu,
  settings,
  filters,
  dragHandlers,
}: CalendarGridProps) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)

  // Calculate month grid
  const monthGrid = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - startDate.getDay()) // Start from Sunday

    const weeks: Date[][] = []
    let currentWeek: Date[] = []

    for (let i = 0; i < 42; i++) {
      // 6 weeks max
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      currentWeek.push(date)

      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }

      // Stop if we've filled enough weeks
      if (date > lastDay && date.getDay() === 6) break
    }

    return weeks
  }, [currentDate])

  // Calculate week grid
  const weekGrid = useMemo(() => {
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())

    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(day.getDate() + i)
      days.push(day)
    }

    return days
  }, [currentDate])

  // Generate time slots for week/day view
  const timeSlots = useMemo(() => {
    const [startHour, startMinute] = settings.dayStartTime.split(':').map(Number)
    const [endHour, endMinute] = settings.dayEndTime.split(':').map(Number)

    const slots: { time: string; hour: number }[] = []
    let currentHour = startHour
    let currentMinute = startMinute

    while (currentHour < endHour || (currentHour === endHour && currentMinute <= endMinute)) {
      slots.push({
        time: `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`,
        hour: currentHour,
      })

      currentMinute += 30
      if (currentMinute >= 60) {
        currentMinute = 0
        currentHour++
      }
    }

    return slots
  }, [settings.dayStartTime, settings.dayEndTime])

  // Filter events based on filters
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (event.type === 'blocked') return filters.blocked
      switch (event.status) {
        case 'SCHEDULED':
          return filters.scheduled
        case 'COMPLETED':
          return filters.completed
        case 'CANCELLED':
          return filters.cancelled
        case 'RESCHEDULED':
          return filters.rescheduled
        default:
          return true
      }
    })
  }, [events, filters])

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return filteredEvents.filter((event) => {
      const eventDate = new Date(event.startTime)
      return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
      )
    })
  }

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    )
  }

  // Check if date is in current month
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth()
  }

  // Format date for key
  const dateKey = (date: Date) => {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
  }

  // Handle cell click
  const handleCellClick = (date: Date, time?: string) => {
    if (onSlotClick) {
      onSlotClick(date, time)
    }
  }

  // Render month view
  const renderMonthView = () => {
    return (
      <div className="flex-1 overflow-auto">
        <div className="min-w-[600px]">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10">
            {DAYS_SHORT.map((day) => (
              <div
                key={day}
                className="px-2 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            <AnimatePresence mode="wait">
              {monthGrid.map((week, weekIndex) =>
                week.map((date, dayIndex) => {
                  const dayEvents = getEventsForDate(date)
                  const isCurrentDay = isToday(date)
                  const isInCurrentMonth = isCurrentMonth(date)
                  const key = dateKey(date)

                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, delay: (weekIndex * 7 + dayIndex) * 0.02 }}
                      className={`min-h-[120px] border-r border-b border-gray-200 dark:border-gray-800 p-2 cursor-pointer transition-all duration-[var(--timing-fast)] ${
                        isInCurrentMonth
                          ? 'bg-white dark:bg-gray-900'
                          : 'bg-gray-50 dark:bg-gray-900/30'
                      } ${
                        hoveredDate === key ? 'bg-[var(--calendar-bg-hover)]' : ''
                      } hover:bg-[var(--calendar-bg-hover)]`}
                      onClick={() => handleCellClick(date)}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        const endDate = new Date(date)
                        endDate.setHours(date.getHours() + 1)
                        onContextMenu?.(e, { type: 'slot', data: { start: date, end: endDate } })
                      }}
                      onMouseEnter={() => setHoveredDate(key)}
                      onMouseLeave={() => setHoveredDate(null)}
                      role="button"
                      tabIndex={0}
                      aria-label={`${date.toLocaleDateString()}, ${dayEvents.length} events`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleCellClick(date)
                        }
                      }}
                    >
                      {/* Date number */}
                      <div
                        className={`text-sm font-semibold mb-1 ${
                          isCurrentDay
                            ? 'w-7 h-7 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md'
                            : isInCurrentMonth
                            ? 'text-gray-900 dark:text-gray-100'
                            : 'text-gray-400 dark:text-gray-600'
                        }`}
                      >
                        {date.getDate()}
                      </div>

                      {/* Events */}
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <motion.div
                            key={event.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (onEventClick) onEventClick(event)
                            }}
                            onContextMenu={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                              onContextMenu?.(e, { type: 'event', data: event })
                            }}
                            className="px-2 py-1 rounded text-xs font-medium truncate cursor-pointer shadow-sm"
                            style={{
                              background:
                                event.status === 'SCHEDULED'
                                  ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                                  : event.status === 'COMPLETED'
                                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                  : event.status === 'CANCELLED'
                                  ? 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
                                  : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                              color: '#ffffff',
                              opacity: event.status === 'CANCELLED' ? 0.6 : 1,
                            }}
                            title={`${event.title} - ${event.clientName}`}
                          >
                            {event.startTime.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })}{' '}
                            {event.title}
                          </motion.div>
                        ))}

                        {/* Overflow indicator */}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium pl-2">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    )
  }

  // Render week view
  const renderWeekView = () => {
    const pixelsPerHour = 80
    const now = new Date()
    const isCurrentWeek = weekGrid.some((day) => isToday(day))

    return (
      <div className="flex-1 overflow-auto">
        <div className="min-w-[800px]">
          {/* Day headers */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10">
            <div className="px-2 py-3" />
            {weekGrid.map((day, index) => {
              const isCurrentDay = isToday(day)
              return (
                <div
                  key={index}
                  className="px-2 py-3 text-center border-l border-gray-200 dark:border-gray-800"
                >
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                    {DAYS_SHORT[day.getDay()]}
                  </div>
                  <div
                    className={`text-lg font-bold mt-1 ${
                      isCurrentDay
                        ? 'w-8 h-8 mx-auto flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {day.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Time grid */}
          <div className="relative">
            <div className="grid grid-cols-[60px_repeat(7,1fr)]">
              {timeSlots.map((slot, slotIndex) => (
                <div key={slot.time} className="contents">
                  {/* Time label */}
                  <div className="px-2 py-2 text-xs font-medium text-gray-500 dark:text-gray-500 text-right border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30">
                    {slotIndex % 2 === 0 &&
                      new Date(0, 0, 0, slot.hour).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        hour12: true,
                      })}
                  </div>

                  {/* Day columns */}
                  {weekGrid.map((day, dayIndex) => {
                    const slotDate = new Date(day)
                    const [hour, minute] = slot.time.split(':').map(Number)
                    slotDate.setHours(hour, minute, 0, 0)

                    const slotEvents = filteredEvents.filter((event) => {
                      const eventStart = new Date(event.startTime)
                      const eventEnd = new Date(event.endTime)
                      return eventStart <= slotDate && eventEnd > slotDate
                    })

                    const isPast = slotDate < now
                    const isWorkingHours = settings.workingDays.includes(day.getDay())

                    const timeSlot: TimeSlotType = {
                      start: slotDate,
                      end: new Date(slotDate.getTime() + 30 * 60000),
                      isEmpty: slotEvents.length === 0,
                      events: slotEvents,
                      isToday: isToday(day),
                      isPast,
                      isFuture: !isPast,
                      isWorkingHours,
                    }

                    return (
                      <div
                        key={`${slot.time}-${dayIndex}`}
                        className="border-l border-b border-gray-200 dark:border-gray-800 relative"
                        data-time-slot={slotDate.toISOString()}
                        onMouseDown={(e) => dragHandlers?.onMouseDown(e, slotDate)}
                        onMouseMove={(e) => dragHandlers?.onMouseMove(e, slotDate)}
                        onMouseUp={() => dragHandlers?.onMouseUp()}
                        onTouchStart={(e) => dragHandlers?.onTouchStart(e, slotDate)}
                        onTouchMove={(e) => dragHandlers?.onTouchMove(e)}
                        onTouchEnd={() => dragHandlers?.onTouchEnd()}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          onContextMenu?.(e, { type: 'slot', data: timeSlot })
                        }}
                      >
                        <TimeSlot
                          slot={timeSlot}
                          onClick={(slot) => handleCellClick(slot.start, slot.start.toTimeString())}
                          hasConflict={slotEvents.length > 1}
                        />

                        {/* Render events */}
                        {slotEvents.map((event) => {
                          const eventStart = new Date(event.startTime)
                          const eventEnd = new Date(event.endTime)
                          const durationMinutes =
                            (eventEnd.getTime() - eventStart.getTime()) / 60000
                          const height = (durationMinutes / 60) * pixelsPerHour

                          // Only render on the starting slot
                          if (
                            eventStart.getHours() === hour &&
                            eventStart.getMinutes() === minute
                          ) {
                            return (
                              <motion.div
                                key={event.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ scale: 1.02, zIndex: 30 }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (onEventClick) onEventClick(event)
                                }}
                                onContextMenu={(e) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  onContextMenu?.(e, { type: 'event', data: event })
                                }}
                                className="absolute left-1 right-1 rounded-md p-2 cursor-pointer overflow-hidden shadow-md z-10"
                                style={{
                                  top: 0,
                                  height: `${height}px`,
                                  background:
                                    event.status === 'SCHEDULED'
                                      ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                                      : event.status === 'COMPLETED'
                                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                      : event.status === 'CANCELLED'
                                      ? 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
                                      : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                  opacity: event.status === 'CANCELLED' ? 0.6 : 1,
                                }}
                              >
                                <div className="text-xs font-semibold text-white truncate">
                                  {event.title}
                                </div>
                                <div className="text-xs text-white/80 truncate">
                                  {event.clientName}
                                </div>
                              </motion.div>
                            )
                          }
                          return null
                        })}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Current time indicator */}
            {isCurrentWeek && (
              <CurrentTimeIndicator
                currentTime={now}
                dayStartTime={settings.dayStartTime}
                pixelsPerHour={pixelsPerHour}
              />
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
      {view === 'month' && renderMonthView()}
      {view === 'week' && renderWeekView()}
      {view === 'day' && <div className="p-8 text-center text-gray-500">Day view coming soon</div>}
      {view === 'agenda' && (
        <div className="p-8 text-center text-gray-500">Agenda view coming soon</div>
      )}
    </div>
  )
}
