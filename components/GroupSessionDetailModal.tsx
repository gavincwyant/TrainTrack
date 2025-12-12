"use client"

import { useState, useEffect } from "react"
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

type GroupSessionDetailModalProps = {
  isOpen: boolean
  onClose: () => void
  appointments: Appointment[]
  onUpdate: () => void
}

export default function GroupSessionDetailModal({
  isOpen,
  onClose,
  appointments,
  onUpdate,
}: GroupSessionDetailModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow
      document.body.style.overflow = "hidden"

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

  if (!isOpen || appointments.length === 0) return null

  const firstAppointment = appointments[0]
  const activeAppointments = appointments.filter(apt => apt.status !== "CANCELLED")
  const cancelledAppointments = appointments.filter(apt => apt.status === "CANCELLED")
  const allScheduled = activeAppointments.every(apt => apt.status === "SCHEDULED")

  const handleCancelOne = async (appointmentId: string, clientName: string) => {
    if (!confirm(`Cancel appointment for ${clientName}? The other participants will not be affected.`)) {
      return
    }

    setIsLoading(true)
    setLoadingAction(`cancel-${appointmentId}`)
    setError(null)

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to cancel appointment")
      }

      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
      setLoadingAction(null)
    }
  }

  const handleCompleteAll = async () => {
    if (!confirm("Mark all participants as complete?")) {
      return
    }

    setIsLoading(true)
    setLoadingAction("complete-all")
    setError(null)

    try {
      // Update all active appointments to COMPLETED
      const updatePromises = activeAppointments.map(apt =>
        fetch(`/api/appointments/${apt.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "COMPLETED" }),
        })
      )

      const results = await Promise.all(updatePromises)
      const failedResults = results.filter(r => !r.ok)

      if (failedResults.length > 0) {
        throw new Error(`Failed to complete ${failedResults.length} appointment(s)`)
      }

      onUpdate()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
      setLoadingAction(null)
    }
  }

  const handleCancelAll = async () => {
    if (!confirm("Cancel appointments for all participants?")) {
      return
    }

    setIsLoading(true)
    setLoadingAction("cancel-all")
    setError(null)

    try {
      const updatePromises = activeAppointments.map(apt =>
        fetch(`/api/appointments/${apt.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "CANCELLED" }),
        })
      )

      const results = await Promise.all(updatePromises)
      const failedResults = results.filter(r => !r.ok)

      if (failedResults.length > 0) {
        throw new Error(`Failed to cancel ${failedResults.length} appointment(s)`)
      }

      onUpdate()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
      setLoadingAction(null)
    }
  }

  const handleDeleteAll = async () => {
    if (!confirm("Delete this entire group session? This will remove all appointments without tracking cancellations.")) {
      return
    }

    setIsLoading(true)
    setLoadingAction("delete-all")
    setError(null)

    try {
      const deletePromises = appointments.map(apt =>
        fetch(`/api/appointments/${apt.id}`, {
          method: "DELETE",
        })
      )

      const results = await Promise.all(deletePromises)
      const failedResults = results.filter(r => !r.ok)

      if (failedResults.length > 0) {
        throw new Error(`Failed to delete ${failedResults.length} appointment(s)`)
      }

      onUpdate()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
      setLoadingAction(null)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
      style={{ touchAction: "none" }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl dark:shadow-2xl dark:shadow-black/40 max-w-lg w-full border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Group Session</h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                  {activeAppointments.length} {activeAppointments.length === 1 ? "Client" : "Clients"}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {format(new Date(firstAppointment.startTime), "EEEE, MMMM d, yyyy")}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {format(new Date(firstAppointment.startTime), "h:mm a")} -{" "}
                {format(new Date(firstAppointment.endTime), "h:mm a")}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
              type="button"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 dark:bg-red-950/30 p-4 border border-red-200 dark:border-red-800">
              <div className="text-sm text-red-800 dark:text-red-300">{error}</div>
            </div>
          )}

          {/* Participants List */}
          <div className="space-y-3 mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Participants</h3>

            {/* Active Participants */}
            {activeAppointments.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {apt.client.fullName}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {apt.client.email}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      apt.status === "SCHEDULED"
                        ? "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300"
                        : apt.status === "COMPLETED"
                        ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300"
                        : "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300"
                    }`}
                  >
                    {apt.status}
                  </span>
                  {apt.status === "SCHEDULED" && (
                    <button
                      onClick={() => handleCancelOne(apt.id, apt.client.fullName)}
                      disabled={isLoading}
                      className="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Cancelled Participants */}
            {cancelledAppointments.length > 0 && (
              <>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-4">
                  Cancelled
                </div>
                {cancelledAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 opacity-60"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate line-through">
                        {apt.client.fullName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {apt.client.email}
                      </div>
                    </div>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 ml-3">
                    CANCELLED
                  </span>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Bulk Actions */}
          {allScheduled && activeAppointments.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Group Actions</h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleCompleteAll}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 min-h-[44px] bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {loadingAction === "complete-all" ? "Completing..." : "Complete All"}
                </button>
                <button
                  onClick={handleCancelAll}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 min-h-[44px] bg-gray-600 dark:bg-gray-500 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {loadingAction === "cancel-all" ? "Cancelling..." : "Cancel All"}
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleDeleteAll}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 min-h-[44px] bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {loadingAction === "delete-all" ? "Deleting..." : "Delete Session"}
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 min-h-[44px] border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
