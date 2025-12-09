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

type Settings = {
  dayStartTime: string
  dayEndTime: string
  timezone: string
  googleCalendarConnected: boolean
  googleCalendarEmail: string | null
  autoSyncEnabled: boolean
  lastSyncedAt: string | null
  autoInvoicingEnabled: boolean
  monthlyInvoiceDay: number
  defaultInvoiceDueDays: number
}

export default function TrainerSettingsPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchSettings = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/trainer-settings")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch settings")
      }

      setSettings(data.settings)
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

  const handleConnectGoogle = () => {
    window.location.href = "/api/calendar/connect"
  }

  const handleDisconnectGoogle = async () => {
    if (!confirm("Are you sure you want to disconnect your Google Calendar?")) {
      return
    }

    try {
      const response = await fetch("/api/calendar/disconnect", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to disconnect calendar")
      }

      await fetchSettings()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleToggleAutoSync = async (enabled: boolean) => {
    try {
      const response = await fetch("/api/trainer-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoSyncEnabled: enabled }),
      })

      if (!response.ok) {
        throw new Error("Failed to update auto-sync setting")
      }

      await fetchSettings()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleManualSync = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch("/api/calendar/sync", {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to sync calendar")
      }

      await fetchSettings()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSyncing(false)
    }
  }

  const handleToggleAutoInvoicing = async (enabled: boolean) => {
    try {
      const response = await fetch("/api/trainer-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoInvoicingEnabled: enabled }),
      })

      if (!response.ok) {
        throw new Error("Failed to update auto-invoicing setting")
      }

      await fetchSettings()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleMonthlyInvoiceDayChange = async (day: number) => {
    try {
      const response = await fetch("/api/trainer-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyInvoiceDay: day }),
      })

      if (!response.ok) {
        throw new Error("Failed to update monthly invoice day")
      }

      await fetchSettings()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleDefaultDueDaysChange = async (days: number) => {
    try {
      const response = await fetch("/api/trainer-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultInvoiceDueDays: days }),
      })

      if (!response.ok) {
        throw new Error("Failed to update default due days")
      }

      await fetchSettings()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
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

      {/* Google Calendar Integration */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Calendar Integration</h2>

        {isLoading ? (
          <p className="text-gray-600">Loading...</p>
        ) : settings?.googleCalendarConnected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-md border border-green-200">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                </svg>
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Google Calendar Connected
                  </p>
                  <p className="text-sm text-green-600">
                    {settings.googleCalendarEmail}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDisconnectGoogle}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Disconnect
              </button>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Auto-sync enabled
                </label>
                <p className="text-sm text-gray-500">
                  Automatically sync appointments and blocked times with Google Calendar
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoSyncEnabled}
                onChange={(e) => handleToggleAutoSync(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            {settings.lastSyncedAt && (
              <p className="text-xs text-gray-500">
                Last synced: {new Date(settings.lastSyncedAt).toLocaleString()}
              </p>
            )}

            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSyncing ? "Syncing..." : "Sync Now"}
            </button>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">How sync works:</h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Your appointments automatically appear in Google Calendar</li>
                <li>Events in Google Calendar create blocked times here</li>
                <li>Prevents double-booking across both calendars</li>
                <li>Auto-sync runs every 15 minutes when enabled</li>
              </ul>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Connect your Google Calendar to automatically sync appointments and prevent double-booking.
            </p>
            <button
              onClick={handleConnectGoogle}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
              </svg>
              Connect Google Calendar
            </button>
          </div>
        )}
      </div>

      {/* Invoice Settings */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Invoice Settings</h2>

        {isLoading ? (
          <p className="text-gray-600">Loading...</p>
        ) : (
          <div className="space-y-6">
            {/* Auto-invoicing toggle */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Automatic Invoicing
                </label>
                <p className="text-sm text-gray-500">
                  Automatically generate and send invoices to clients based on their billing frequency
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings?.autoInvoicingEnabled ?? true}
                onChange={(e) => handleToggleAutoInvoicing(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            {/* Monthly invoice day */}
            <div>
              <label htmlFor="monthlyInvoiceDay" className="block text-sm font-medium text-gray-700">
                Monthly Invoice Day
              </label>
              <p className="text-sm text-gray-500 mb-2">
                Day of month to generate invoices for monthly billing clients
              </p>
              <select
                id="monthlyInvoiceDay"
                value={settings?.monthlyInvoiceDay ?? 1}
                onChange={(e) => handleMonthlyInvoiceDayChange(Number(e.target.value))}
                className="mt-1 block w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {day}
                    {day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th"} of the month
                  </option>
                ))}
              </select>
            </div>

            {/* Default due days */}
            <div>
              <label htmlFor="defaultDueDays" className="block text-sm font-medium text-gray-700">
                Default Payment Terms
              </label>
              <p className="text-sm text-gray-500 mb-2">
                Number of days until invoice is due after generation
              </p>
              <select
                id="defaultDueDays"
                value={settings?.defaultInvoiceDueDays ?? 30}
                onChange={(e) => handleDefaultDueDaysChange(Number(e.target.value))}
                className="mt-1 block w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value={7}>Net 7 (Due in 7 days)</option>
                <option value={15}>Net 15 (Due in 15 days)</option>
                <option value={30}>Net 30 (Due in 30 days)</option>
                <option value={60}>Net 60 (Due in 60 days)</option>
              </select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">How invoicing works:</h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Per-session clients: Invoice generated immediately when appointment is marked completed</li>
                <li>Monthly clients: Invoices generated on your chosen day of the month</li>
                <li>All invoices are automatically emailed to clients</li>
                <li>You can disable auto-invoicing for specific clients in their profile</li>
                <li>View and manage all invoices in the Invoices section</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
