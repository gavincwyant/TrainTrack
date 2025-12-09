'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, RefreshCw, Calendar } from 'lucide-react'
import { CalendarView } from '../../types/calendar'
import { useState } from 'react'

interface CalendarHeaderProps {
  view: CalendarView
  onViewChange: (view: CalendarView) => void
  currentDate: Date
  onDateChange: (date: Date) => void
  onSync?: () => void
  onToggleTemplates?: () => void
  stats?: {
    total: number
    completed: number
    upcoming: number
  }
}

const VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
  { value: 'day', label: 'Day' },
  { value: 'agenda', label: 'Agenda' },
]

export default function CalendarHeader({
  view,
  onViewChange,
  currentDate,
  onDateChange,
  onSync,
  onToggleTemplates,
  stats,
}: CalendarHeaderProps) {
  const [isSyncing, setIsSyncing] = useState(false)

  const handlePrevious = () => {
    const newDate = new Date(currentDate)
    switch (view) {
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1)
        break
      case 'week':
        newDate.setDate(newDate.getDate() - 7)
        break
      case 'day':
        newDate.setDate(newDate.getDate() - 1)
        break
      case 'agenda':
        newDate.setMonth(newDate.getMonth() - 1)
        break
    }
    onDateChange(newDate)
  }

  const handleNext = () => {
    const newDate = new Date(currentDate)
    switch (view) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1)
        break
      case 'week':
        newDate.setDate(newDate.getDate() + 7)
        break
      case 'day':
        newDate.setDate(newDate.getDate() + 1)
        break
      case 'agenda':
        newDate.setMonth(newDate.getMonth() + 1)
        break
    }
    onDateChange(newDate)
  }

  const handleToday = () => {
    onDateChange(new Date())
  }

  const handleSync = async () => {
    if (isSyncing || !onSync) return
    setIsSyncing(true)
    await onSync()
    setTimeout(() => setIsSyncing(false), 500)
  }

  const formatDateLabel = () => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    })
    return formatter.format(currentDate)
  }

  return (
    <header className="flex flex-col gap-4 pb-6 border-b border-gray-200 dark:border-gray-800">
      {/* Main header row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Left: Navigation */}
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePrevious}
            className="p-2 rounded-lg hover:bg-[var(--calendar-bg-hover)] transition-colors duration-[var(--timing-fast)]"
            aria-label="Previous period"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNext}
            className="p-2 rounded-lg hover:bg-[var(--calendar-bg-hover)] transition-colors duration-[var(--timing-fast)]"
            aria-label="Next period"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleToday}
            className="px-4 py-2 ml-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-[var(--timing-fast)] shadow-sm"
          >
            Today
          </motion.button>
        </div>

        {/* Center: Date label */}
        <motion.h1
          key={formatDateLabel()}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight"
        >
          {formatDateLabel()}
        </motion.h1>

        {/* Right: View switcher + Sync */}
        <div className="flex items-center gap-3">
          {/* View switcher - Desktop */}
          <div className="hidden md:flex relative bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                layoutId="activeView"
                className="absolute inset-y-1 bg-white dark:bg-gray-700 rounded-md shadow-sm"
                initial={false}
                animate={{
                  x: VIEW_OPTIONS.findIndex((v) => v.value === view) * 85,
                  width: 77,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 35,
                }}
              />
            </AnimatePresence>

            {VIEW_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onViewChange(option.value)}
                className={`relative z-10 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-[var(--timing-fast)] ${
                  view === option.value
                    ? 'text-gray-900 dark:text-gray-100'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                aria-current={view === option.value ? 'true' : undefined}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* View switcher - Mobile */}
          <select
            value={view}
            onChange={(e) => onViewChange(e.target.value as CalendarView)}
            className="md:hidden px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-[var(--timing-fast)]"
          >
            {VIEW_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Sync button */}
          {onSync && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSync}
              disabled={isSyncing}
              className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-[var(--timing-fast)] disabled:opacity-50"
              aria-label="Sync calendar"
            >
              <RefreshCw
                className={`w-5 h-5 text-blue-600 dark:text-blue-400 ${
                  isSyncing ? 'animate-spin' : ''
                }`}
              />
            </motion.button>
          )}

          {/* Templates button */}
          {onToggleTemplates && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggleTemplates}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-[var(--timing-fast)]"
              aria-label="Block time templates"
              title="Block Time Templates"
            >
              <Calendar className="w-5 h-5 text-gray-600" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400"
        >
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {stats.total}
              </span>{' '}
              appointments
            </span>
          </div>

          <div className="w-px h-4 bg-gray-300 dark:bg-gray-700" />

          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {stats.completed}
              </span>{' '}
              completed
            </span>
          </div>

          <div className="w-px h-4 bg-gray-300 dark:bg-gray-700" />

          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {stats.upcoming}
              </span>{' '}
              upcoming
            </span>
          </div>
        </motion.div>
      )}
    </header>
  )
}
