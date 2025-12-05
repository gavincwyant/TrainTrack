"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"

const settingsSchema = z.object({
  dayStartTime: z.string().min(1, "Start time is required"),
  dayEndTime: z.string().min(1, "End time is required"),
  timezone: z.string(),
}).refine((data) => data.dayStartTime < data.dayEndTime, {
  message: "End time must be after start time",
  path: ["dayEndTime"],
})

type SettingsFormData = z.infer<typeof settingsSchema>

export default function TrainerSettingsPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      dayStartTime: "06:00",
      dayEndTime: "22:00",
      timezone: "America/New_York",
    },
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/trainer-settings")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch settings")
      }

      reset({
        dayStartTime: data.settings.dayStartTime,
        dayEndTime: data.settings.dayEndTime,
        timezone: data.settings.timezone,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: SettingsFormData) => {
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch("/api/trainer-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to update settings")
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">Configure your calendar and scheduling preferences</p>
        </div>
        <Link
          href="/trainer/calendar"
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Back to Calendar
        </Link>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="text-sm text-green-800">Settings saved successfully!</div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Calendar Hours</h2>

        {isLoading ? (
          <p className="text-gray-600">Loading settings...</p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="dayStartTime" className="block text-sm font-medium text-gray-700">
                  Day Start Time
                </label>
                <input
                  {...register("dayStartTime")}
                  type="time"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {errors.dayStartTime && (
                  <p className="mt-1 text-sm text-red-600">{errors.dayStartTime.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  When does your workday typically start?
                </p>
              </div>

              <div>
                <label htmlFor="dayEndTime" className="block text-sm font-medium text-gray-700">
                  Day End Time
                </label>
                <input
                  {...register("dayEndTime")}
                  type="time"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {errors.dayEndTime && (
                  <p className="mt-1 text-sm text-red-600">{errors.dayEndTime.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  When does your workday typically end?
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
                Timezone
              </label>
              <select
                {...register("timezone")}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="America/Anchorage">Alaska Time (AKT)</option>
                <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Your local timezone for scheduling
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">How this works:</h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Your calendar will only show hours between your start and end times</li>
                <li>Clients will see your availability within these hours</li>
                <li>You can still block specific times using the availability manager</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Link
                href="/trainer/calendar"
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
