"use client"

import { useState } from "react"
import { format } from "date-fns"

type Appointment = {
  id: string
  startTime: string
  endTime: string
  status: string
  client: {
    id: string
    fullName: string
    email: string
  }
  trainer: {
    id: string
    fullName: string
  }
}

type AppointmentDetailModalProps = {
  isOpen: boolean
  onClose: () => void
  appointment: Appointment
  onUpdate: () => void
}

export default function AppointmentDetailModal({
  isOpen,
  onClose,
  appointment,
  onUpdate,
}: AppointmentDetailModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this appointment?")) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete appointment")
      }

      onUpdate()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update appointment")
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
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl dark:shadow-2xl dark:shadow-black/40 max-w-md w-full border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Appointment Details</h2>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Client
              </label>
              <div className="text-gray-900 dark:text-gray-100">{appointment.client.fullName}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{appointment.client.email}</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date & Time
              </label>
              <div className="text-gray-900 dark:text-gray-100">
                {format(new Date(appointment.startTime), "EEEE, MMMM d, yyyy")}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {format(new Date(appointment.startTime), "h:mm a")} -{" "}
                {format(new Date(appointment.endTime), "h:mm a")}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <span
                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  appointment.status === "SCHEDULED"
                    ? "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300"
                    : appointment.status === "COMPLETED"
                    ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300"
                    : appointment.status === "CANCELLED"
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300"
                    : "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300"
                }`}
              >
                {appointment.status}
              </span>
            </div>

            {appointment.status === "SCHEDULED" && (
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  onClick={() => handleStatusChange("COMPLETED")}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 min-h-[44px] bg-green-600 dark:bg-green-500 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Mark Complete
                </button>
                <button
                  onClick={() => handleStatusChange("CANCELLED")}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 min-h-[44px] bg-gray-600 dark:bg-gray-500 text-white rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            )}

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
