'use client'

import type { CalendarView } from '../../types/calendar'

interface SkeletonCalendarProps {
  view: CalendarView
  rows?: number
}

export function SkeletonCalendar({ view, rows = 5 }: SkeletonCalendarProps) {
  // Skeleton shimmer gradient
  const shimmerClass = 'bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-[skeleton-shimmer_1.5s_ease-in-out_infinite]'

  if (view === 'month') {
    return (
      <div className="space-y-4">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className={`h-9 w-9 rounded-lg ${shimmerClass}`} />
            <div className={`h-9 w-9 rounded-lg ${shimmerClass}`} />
          </div>
          <div className={`h-8 w-48 rounded-lg ${shimmerClass}`} />
          <div className="flex items-center gap-2">
            <div className={`h-9 w-20 rounded-lg ${shimmerClass}`} />
            <div className={`h-9 w-24 rounded-lg ${shimmerClass}`} />
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className={`h-6 rounded ${shimmerClass}`} />
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg border border-gray-200 dark:border-gray-700 p-2 space-y-1"
            >
              <div className={`h-4 w-6 rounded ${shimmerClass}`} />
              {i % 3 === 0 && (
                <div className={`h-12 rounded-md ${shimmerClass}`} />
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (view === 'week') {
    return (
      <div className="space-y-4">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className={`h-9 w-9 rounded-lg ${shimmerClass}`} />
            <div className={`h-9 w-9 rounded-lg ${shimmerClass}`} />
          </div>
          <div className={`h-8 w-48 rounded-lg ${shimmerClass}`} />
          <div className="flex items-center gap-2">
            <div className={`h-9 w-20 rounded-lg ${shimmerClass}`} />
            <div className={`h-9 w-24 rounded-lg ${shimmerClass}`} />
          </div>
        </div>

        {/* Week Headers */}
        <div className="grid grid-cols-8 gap-2 mb-2">
          <div /> {/* Time column spacer */}
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className={`h-4 rounded ${shimmerClass}`} />
              <div className={`h-6 w-8 rounded mx-auto ${shimmerClass}`} />
            </div>
          ))}
        </div>

        {/* Time Grid */}
        <div className="grid grid-cols-8 gap-2">
          {Array.from({ length: rows * 8 }).map((_, i) => {
            const isTimeColumn = i % 8 === 0
            return (
              <div
                key={i}
                className={
                  isTimeColumn
                    ? `h-16 flex items-start justify-end pr-2`
                    : 'h-16 border border-gray-200 dark:border-gray-700 rounded-lg p-1'
                }
              >
                {isTimeColumn ? (
                  <div className={`h-4 w-12 rounded ${shimmerClass}`} />
                ) : (
                  i % 4 === 1 && (
                    <div className={`h-full rounded-md ${shimmerClass}`} />
                  )
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (view === 'day') {
    return (
      <div className="space-y-4">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className={`h-9 w-9 rounded-lg ${shimmerClass}`} />
            <div className={`h-9 w-9 rounded-lg ${shimmerClass}`} />
          </div>
          <div className={`h-8 w-48 rounded-lg ${shimmerClass}`} />
          <div className="flex items-center gap-2">
            <div className={`h-9 w-20 rounded-lg ${shimmerClass}`} />
          </div>
        </div>

        {/* Day Header */}
        <div className="mb-4 space-y-1">
          <div className={`h-6 w-24 rounded ${shimmerClass}`} />
          <div className={`h-8 w-16 rounded ${shimmerClass}`} />
        </div>

        {/* Time Slots */}
        <div className="space-y-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className={`h-4 w-16 rounded mt-1 ${shimmerClass}`} />
              <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg p-2 min-h-[80px]">
                {i % 3 === 0 && (
                  <div className={`h-full rounded-md ${shimmerClass}`} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Agenda view
  return (
    <div className="space-y-4">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className={`h-8 w-48 rounded-lg ${shimmerClass}`} />
        <div className="flex items-center gap-2">
          <div className={`h-9 w-24 rounded-lg ${shimmerClass}`} />
        </div>
      </div>

      {/* Agenda List */}
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className={`h-5 w-32 rounded ${shimmerClass}`} />
              <div className={`h-5 w-20 rounded ${shimmerClass}`} />
            </div>
            <div className={`h-4 w-48 rounded ${shimmerClass}`} />
            <div className="flex gap-2">
              <div className={`h-6 w-16 rounded-full ${shimmerClass}`} />
              <div className={`h-6 w-20 rounded-full ${shimmerClass}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
