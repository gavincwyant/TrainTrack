"use client"

import { useState } from "react"
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Blocked Time Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
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
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          <div className="space-y-4">
            {blockedTime.reason && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <div className="text-gray-900">{blockedTime.reason}</div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date & Time
              </label>
              <div className="text-gray-900">
                {format(new Date(blockedTime.startTime), "EEEE, MMMM d, yyyy")}
              </div>
              <div className="text-sm text-gray-600">
                {format(new Date(blockedTime.startTime), "h:mm a")} -{" "}
                {format(new Date(blockedTime.endTime), "h:mm a")}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <span
                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  blockedTime.isRecurring
                    ? "bg-purple-100 text-purple-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {blockedTime.isRecurring ? "Recurring" : "One-time"}
              </span>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Deleting..." : "Delete"}
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
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
