"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const appointmentSchema = z.object({
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
})

type AppointmentFormData = z.infer<typeof appointmentSchema>

type Client = {
  id: string
  fullName: string
  email: string
}

type AppointmentModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  preselectedDate?: Date
  preselectedEndDate?: Date
  preselectedClient?: string
}

export default function AppointmentModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedDate,
  preselectedEndDate,
  preselectedClient,
}: AppointmentModalProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClients, setSelectedClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPastConfirmation, setShowPastConfirmation] = useState(false)
  const [pendingSubmitData, setPendingSubmitData] = useState<AppointmentFormData | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      date: preselectedDate
        ? preselectedDate.toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      startTime: preselectedDate
        ? `${String(preselectedDate.getHours()).padStart(2, '0')}:${String(preselectedDate.getMinutes()).padStart(2, '0')}`
        : "09:00",
      endTime: preselectedDate
        ? (() => {
            const endDate = new Date(preselectedDate.getTime() + 60 * 60 * 1000)
            return `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`
          })()
        : "10:00",
    },
  })

  useEffect(() => {
    if (isOpen) {
      fetchClients()
      if (preselectedDate) {
        setValue("date", preselectedDate.toISOString().split("T")[0])
        setValue("startTime", `${String(preselectedDate.getHours()).padStart(2, '0')}:${String(preselectedDate.getMinutes()).padStart(2, '0')}`)

        // Use preselectedEndDate if provided, otherwise default to 1 hour later
        const endDate = preselectedEndDate || new Date(preselectedDate.getTime() + 60 * 60 * 1000)
        setValue("endTime", `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`)
      }
    }
  }, [isOpen, preselectedDate, preselectedEndDate, setValue])

  // Handle preselected client after clients are loaded
  useEffect(() => {
    if (preselectedClient && clients.length > 0) {
      const client = clients.find(c => c.id === preselectedClient)
      if (client && !selectedClients.some(sc => sc.id === client.id)) {
        setSelectedClients([client])
      }
    }
  }, [preselectedClient, clients, selectedClients])

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

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch clients")
      }

      setClients(data.clients || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleAddClient = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    if (client && !selectedClients.some(sc => sc.id === clientId)) {
      setSelectedClients([...selectedClients, client])
    }
  }

  const handleRemoveClient = (clientId: string) => {
    setSelectedClients(selectedClients.filter(c => c.id !== clientId))
  }

  const onSubmit = async (data: AppointmentFormData) => {
    if (selectedClients.length === 0) {
      setError("Please select at least one client")
      return
    }

    // Combine date and time into ISO datetime strings
    const startDateTime = new Date(`${data.date}T${data.startTime}`)
    const endDateTime = new Date(`${data.date}T${data.endTime}`)

    // Validate end time is after start time
    if (endDateTime <= startDateTime) {
      setError("End time must be after start time")
      return
    }

    // Check if appointment is in the past
    const now = new Date()
    if (endDateTime < now && !showPastConfirmation) {
      setPendingSubmitData(data)
      setShowPastConfirmation(true)
      return
    }

    await createAppointments(startDateTime, endDateTime)
  }

  const createAppointments = async (startDateTime: Date, endDateTime: Date) => {
    setIsLoading(true)
    setError(null)

    try {
      // Create appointments for all selected clients
      const appointmentPromises = selectedClients.map(client =>
        fetch("/api/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: client.id,
            startTime: startDateTime.toISOString(),
            endTime: endDateTime.toISOString(),
          }),
        })
      )

      const results = await Promise.all(appointmentPromises)
      const failedResults = results.filter(r => !r.ok)

      if (failedResults.length > 0) {
        throw new Error(`Failed to create ${failedResults.length} appointment(s)`)
      }

      reset()
      setSelectedClients([])
      setShowPastConfirmation(false)
      setPendingSubmitData(null)
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmPastAppointment = async () => {
    if (!pendingSubmitData) return

    const startDateTime = new Date(`${pendingSubmitData.date}T${pendingSubmitData.startTime}`)
    const endDateTime = new Date(`${pendingSubmitData.date}T${pendingSubmitData.endTime}`)

    await createAppointments(startDateTime, endDateTime)
  }

  const handleCancelPastConfirmation = () => {
    setShowPastConfirmation(false)
    setPendingSubmitData(null)
  }

  const handleClose = () => {
    reset()
    setSelectedClients([])
    setError(null)
    setShowPastConfirmation(false)
    setPendingSubmitData(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
      style={{ touchAction: "none" }}
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl dark:shadow-2xl dark:shadow-black/40 max-w-md w-full border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Schedule Appointment</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
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

          {/* Past Appointment Confirmation Dialog */}
          {showPastConfirmation && (
            <div className="mb-4 rounded-md bg-amber-50 dark:bg-amber-950/30 p-4 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-3 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Scheduling a Past Session
                  </h3>
                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                    This appointment is in the past. It will be automatically marked as completed and the client{selectedClients.length > 1 ? "s" : ""} will be billed accordingly.
                  </p>
                  <div className="mt-3 flex gap-3">
                    <button
                      type="button"
                      onClick={handleConfirmPastAppointment}
                      disabled={isLoading}
                      className="px-3 py-1.5 text-sm font-medium bg-amber-600 dark:bg-amber-500 text-white rounded-md hover:bg-amber-700 dark:hover:bg-amber-600 disabled:opacity-50"
                    >
                      {isLoading ? "Creating..." : "Yes, Create Session"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelPastConfirmation}
                      disabled={isLoading}
                      className="px-3 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Client Selection */}
            <div>
              <label htmlFor="clientSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {selectedClients.length > 1 ? "Clients *" : "Client *"}
              </label>
              <select
                id="clientSelect"
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddClient(e.target.value)
                  }
                }}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 sm:text-sm"
              >
                <option value="">
                  {selectedClients.length === 0 ? "Select a client" : "Add another client"}
                </option>
                {clients
                  .filter(client => !selectedClients.some(sc => sc.id === client.id))
                  .map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.fullName}
                    </option>
                  ))}
              </select>

              {/* Selected Clients List */}
              {selectedClients.length > 0 && (
                <div className="mt-2 space-y-2">
                  {selectedClients.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {client.fullName}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          {client.email}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveClient(client.id)}
                        className="ml-2 p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
                        aria-label={`Remove ${client.fullName}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedClients.length > 1 && (
                <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                  This will create a group session with {selectedClients.length} clients
                </p>
              )}
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Date *
              </label>
              <input
                {...register("date")}
                type="date"
                id="date"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 sm:text-sm"
              />
              {errors.date && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.date.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Start Time *
                </label>
                <input
                  {...register("startTime")}
                  type="time"
                  id="startTime"
                  className="mt-1 block w-full px-3 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-base sm:text-sm"
                />
                {errors.startTime && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.startTime.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  End Time *
                </label>
                <input
                  {...register("endTime")}
                  type="time"
                  id="endTime"
                  className="mt-1 block w-full px-3 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-base sm:text-sm"
                />
                {errors.endTime && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.endTime.message}</p>
                )}
              </div>
            </div>

            {!showPastConfirmation && (
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || selectedClients.length === 0}
                  className="px-4 py-2 min-h-[44px] bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading
                    ? "Scheduling..."
                    : selectedClients.length > 1
                      ? `Schedule Group Session (${selectedClients.length})`
                      : "Schedule Appointment"}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
