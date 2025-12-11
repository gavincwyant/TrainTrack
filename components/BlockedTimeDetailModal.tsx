"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"

type BlockedTime = {
  id: string
  startTime: string
  endTime: string
  reason?: string
  isRecurring: boolean
}

type BlockedTimeDetailModalProps = {
  isOpen: boolean
  onClose: () => void
  blockedTime: BlockedTime
  onUpdate: () => void
}

export default function BlockedTimeDetailModal({
  isOpen,
  onClose,
  blockedTime,
  onUpdate,
}: BlockedTimeDetailModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Lock body scroll and calendar scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow
      document.body.style.overflow = "hidden"

      // Also disable calendar scroll container with touch-action for mobile
      const calendarContent = document.querySelector('.rbc-time-content') as HTMLElement
      const originalCalendarOverflow = calendarContent?.style.overflow
      const originalTouchAction = calendarContent?.style.touchAction
      if (calendarContent) {
        calendarContent.style.overflow = "hidden"
        calendarContent.style.touchAction = "none"
      }

      return () => {
        document.body.style.overflow = originalStyle
        if (calendarContent) {
          calendarContent.style.overflow = originalCalendarOverflow || ""
          calendarContent.style.touchAction = originalTouchAction || ""
        }
      }
    }
  }, [isOpen])

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this blocked time?")) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/blocked-times/${blockedTime.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete blocked time")
      }

      onUpdate()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
      style={{ touchAction: "none" }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl dark:shadow-2xl dark:shadow-black/40 max-w-md w-full border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Blocked Time Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
              type="button"
            >
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 dark:bg-red-950/30 p-4 border border-red-200 dark:border-red-800">
              <div className="text-sm text-red-800 dark:text-red-300">{error}</div>
            </div>
          )}

          <div className="space-y-4">
            {blockedTime.reason && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason
                </label>
                <div className="text-gray-900 dark:text-gray-100">{blockedTime.reason}</div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date & Time
              </label>
              <div className="text-gray-900 dark:text-gray-100">
                {format(new Date(blockedTime.startTime), "EEEE, MMMM d, yyyy")}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {format(new Date(blockedTime.startTime), "h:mm a")} -{" "}
                {format(new Date(blockedTime.endTime), "h:mm a")}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <span
                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  blockedTime.isRecurring
                    ? "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300"
                    : "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300"
                }`}
              >
                {blockedTime.isRecurring ? "Recurring" : "One-time"}
              </span>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="flex-1 px-4 py-2 min-h-[44px] bg-red-600 dark:bg-red-500 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Deleting..." : "Delete"}
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
