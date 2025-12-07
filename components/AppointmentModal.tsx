"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const appointmentSchema = z.object({
  clientId: z.string().min(1, "Please select a client"),
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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      clientId: preselectedClient || "",
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
      if (preselectedClient) {
        setValue("clientId", preselectedClient)
      }
    }
  }, [isOpen, preselectedDate, preselectedEndDate, preselectedClient, setValue])

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

  const onSubmit = async (data: AppointmentFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      // Combine date and time into ISO datetime strings
      const startDateTime = new Date(`${data.date}T${data.startTime}`)
      const endDateTime = new Date(`${data.date}T${data.endTime}`)

      // Validate end time is after start time
      if (endDateTime <= startDateTime) {
        setError("End time must be after start time")
        setIsLoading(false)
        return
      }

      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: data.clientId,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create appointment")
      }

      reset()
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    reset()
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Schedule Appointment</h2>
            <button
              onClick={handleClose}
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="clientId" className="block text-sm font-medium text-gray-700">
                Client *
              </label>
              <select
                {...register("clientId")}
                id="clientId"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.fullName}
                  </option>
                ))}
              </select>
              {errors.clientId && (
                <p className="mt-1 text-sm text-red-600">{errors.clientId.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                Date *
              </label>
              <input
                {...register("date")}
                type="date"
                id="date"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {errors.date && (
                <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
                  Start Time *
                </label>
                <input
                  {...register("startTime")}
                  type="time"
                  id="startTime"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {errors.startTime && (
                  <p className="mt-1 text-sm text-red-600">{errors.startTime.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
                  End Time *
                </label>
                <input
                  {...register("endTime")}
                  type="time"
                  id="endTime"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {errors.endTime && (
                  <p className="mt-1 text-sm text-red-600">{errors.endTime.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Scheduling..." : "Schedule Appointment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
