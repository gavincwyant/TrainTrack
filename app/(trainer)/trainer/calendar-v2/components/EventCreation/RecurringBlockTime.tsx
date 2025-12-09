"use client"

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TIMING } from '../../types/calendar'

interface RecurringBlockTimeProps {
  initialDates?: Date[]
  onSubmit: (dates: Date[], reason?: string) => Promise<void>
  onCancel: () => void
  timeRange: { start: Date; end: Date }
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function RecurringBlockTime({
  initialDates,
  onSubmit,
  onCancel,
  timeRange,
}: RecurringBlockTimeProps) {
  const [selectedDay, setSelectedDay] = useState<number>(timeRange.start.getDay())
  const [weeks, setWeeks] = useState(4)
  const [selectedDates, setSelectedDates] = useState<Set<string>>(
    new Set(initialDates?.map((d) => d.toISOString().split('T')[0]) || [])
  )
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Generate dates for the next N weeks
  const generatedDates = useMemo(() => {
    const dates: Date[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let week = 0; week < weeks; week++) {
      const date = new Date(today)
      const daysToAdd = ((selectedDay - today.getDay() + 7) % 7) + (week * 7)
      date.setDate(today.getDate() + daysToAdd)

      // Set the time from timeRange
      date.setHours(timeRange.start.getHours(), timeRange.start.getMinutes(), 0, 0)

      dates.push(date)
    }

    return dates
  }, [selectedDay, weeks, timeRange])

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const toggleDate = (dateStr: string) => {
    setSelectedDates((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(dateStr)) {
        newSet.delete(dateStr)
      } else {
        newSet.add(dateStr)
      }
      return newSet
    })
  }

  const selectAll = () => {
    setSelectedDates(new Set(generatedDates.map((d) => d.toISOString().split('T')[0])))
  }

  const deselectAll = () => {
    setSelectedDates(new Set())
  }

  const handleQuickSelect = () => {
    selectAll()
  }

  const handleSubmit = async () => {
    if (selectedDates.size === 0) return

    setIsSubmitting(true)
    try {
      const dates = generatedDates.filter((d) =>
        selectedDates.has(d.toISOString().split('T')[0])
      )
      await onSubmit(dates, reason || undefined)
    } catch (error) {
      console.error('Failed to create recurring blocked times:', error)
      setIsSubmitting(false)
    }
  }

  // Calculate weeks grid (4 weeks view)
  const weeksGrid = useMemo(() => {
    const weeks: Date[][] = []
    let currentWeek: Date[] = []
    const startDate = new Date()
    startDate.setHours(0, 0, 0, 0)

    // Start from the beginning of the current week
    const firstDay = new Date(startDate)
    firstDay.setDate(startDate.getDate() - startDate.getDay())

    for (let i = 0; i < 28; i++) {
      const date = new Date(firstDay)
      date.setDate(firstDay.getDate() + i)
      currentWeek.push(date)

      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    }

    return weeks
  }, [])

  const isDateSelected = (date: Date): boolean => {
    return selectedDates.has(date.toISOString().split('T')[0])
  }

  const isDateInGenerated = (date: Date): boolean => {
    return generatedDates.some(
      (d) => d.toISOString().split('T')[0] === date.toISOString().split('T')[0]
    )
  }

  const isToday = (date: Date): boolean => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: TIMING.normal / 1000 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Recurring Block Time</h2>
              <p className="text-sm text-gray-600 mt-1">
                {formatTime(timeRange.start)} - {formatTime(timeRange.end)}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Quick Select */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Every</label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DAY_NAMES.map((name, idx) => (
                  <option key={idx} value={idx}>
                    {name}
                  </option>
                ))}
              </select>
              <label className="text-sm font-medium text-gray-700">for next</label>
              <input
                type="number"
                min="1"
                max="52"
                value={weeks}
                onChange={(e) => setWeeks(parseInt(e.target.value) || 1)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <label className="text-sm font-medium text-gray-700">weeks</label>
            </div>

            <button
              onClick={handleQuickSelect}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Quick Select
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Select Dates</h3>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={deselectAll}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {DAY_NAMES.map((day) => (
                <div key={day} className="text-xs font-semibold text-gray-600 text-center py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Weeks grid */}
            <div className="space-y-2">
              {weeksGrid.map((week, weekIdx) => (
                <div key={weekIdx} className="grid grid-cols-7 gap-2">
                  {week.map((date, dayIdx) => {
                    const dateStr = date.toISOString().split('T')[0]
                    const isGenerated = isDateInGenerated(date)
                    const isSelected = isDateSelected(date)
                    const isTodayDate = isToday(date)

                    return (
                      <button
                        key={dayIdx}
                        onClick={() => isGenerated && toggleDate(dateStr)}
                        disabled={!isGenerated}
                        className={`
                          aspect-square rounded-lg text-sm font-medium transition-all
                          ${isSelected
                            ? 'bg-blue-600 text-white shadow-md scale-105'
                            : isGenerated
                            ? 'bg-white border-2 border-blue-300 text-gray-900 hover:border-blue-500'
                            : 'bg-white border border-gray-200 text-gray-400'
                          }
                          ${isTodayDate && !isSelected ? 'ring-2 ring-blue-400' : ''}
                          disabled:cursor-not-allowed
                        `}
                      >
                        {date.getDate()}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Selected dates preview */}
          {selectedDates.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                Selected Dates ({selectedDates.size})
              </h4>
              <div className="flex flex-wrap gap-2">
                {generatedDates
                  .filter((d) => selectedDates.has(d.toISOString().split('T')[0]))
                  .map((date) => (
                    <div
                      key={date.toISOString()}
                      className="px-3 py-1 bg-white rounded-lg text-xs font-medium text-gray-700 shadow-sm"
                    >
                      {formatDate(date)}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
              Reason (optional)
            </label>
            <input
              id="reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Weekly team meeting"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedDates.size} date{selectedDates.size !== 1 ? 's' : ''} selected
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={selectedDates.size === 0 || isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
            >
              {isSubmitting ? 'Creating...' : 'Create Blocks'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
