"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const blockTimeSchema = z.object({
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  reason: z.string().optional(),
  isRecurring: z.boolean(),
})

type BlockTimeFormData = z.infer<typeof blockTimeSchema>

type BlockTimeModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  preselectedDate?: Date
  preselectedEndDate?: Date
}

export default function BlockTimeModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedDate,
  preselectedEndDate,
}: BlockTimeModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<BlockTimeFormData>({
    resolver: zodResolver(blockTimeSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      startTime: "09:00",
      endTime: "10:00",
      reason: "",
      isRecurring: false,
    },
  })

  useEffect(() => {
    if (isOpen && preselectedDate) {
      setValue("date", preselectedDate.toISOString().split("T")[0])
      setValue("startTime", `${String(preselectedDate.getHours()).padStart(2, '0')}:${String(preselectedDate.getMinutes()).padStart(2, '0')}`)

      // Use preselectedEndDate if provided, otherwise default to 1 hour later
      const endDate = preselectedEndDate || new Date(preselectedDate.getTime() + 60 * 60 * 1000)
      setValue("endTime", `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`)
    } else if (isOpen) {
      setValue("date", new Date().toISOString().split("T")[0])
      setValue("startTime", "09:00")
      setValue("endTime", "10:00")
    }
  }, [isOpen, preselectedDate, preselectedEndDate, setValue])

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

  const onSubmit = async (data: BlockTimeFormData) => {
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

      const payload: Record<string, unknown> = {
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        isRecurring: data.isRecurring,
      }

      if (data.reason) {
        payload.reason = data.reason
      }

      if (data.isRecurring) {
        payload.dayOfWeek = startDateTime.getDay()
      }

      const response = await fetch("/api/blocked-times", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to block time")
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Block Time</h2>
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Date *
              </label>
              <input
                {...register("date")}
                type="date"
                id="date"
                className="mt-1 block w-full px-3 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-base sm:text-sm"
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

            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Reason (optional)
              </label>
              <input
                {...register("reason")}
                type="text"
                id="reason"
                className="mt-1 block w-full px-3 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-base sm:text-sm"
                placeholder="e.g., Lunch break, Personal time"
              />
            </div>

            <div className="flex items-center min-h-[44px]">
              <input
                {...register("isRecurring")}
                type="checkbox"
                id="isRecurring"
                className="h-5 w-5 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 rounded"
              />
              <label htmlFor="isRecurring" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Repeat weekly on this day
              </label>
            </div>

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
                disabled={isLoading}
                className="px-4 py-2 min-h-[44px] bg-red-600 dark:bg-red-500 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Blocking..." : "Block Time"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
