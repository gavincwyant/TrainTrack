"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

type WorkoutSession = {
  id: string
  date: string
  notes: string | null
  exercises: Array<{
    name: string
    sets: number
    reps: number
    weight?: number
    notes?: string
  }>
  customMetrics: Record<string, string | number | boolean>
  appointment: {
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
}

export default function WorkoutHistoryPage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [selectedClient, setSelectedClient] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)

  useEffect(() => {
    fetchSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClient])

  const fetchSessions = async () => {
    setIsLoading(true)
    try {
      const url = selectedClient
        ? `/api/workout-sessions?clientId=${selectedClient}`
        : "/api/workout-sessions"

      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch workout sessions")
      }

      setSessions(data.sessions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const uniqueClients = Array.from(
    new Map(
      sessions.map((s) => [s.appointment.client.id, s.appointment.client])
    ).values()
  )

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Workout History</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">View and manage all logged workout sessions</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Export
          </button>
          <Link
            href="/trainer/workouts/log"
            className="px-4 py-2 min-h-[44px] flex items-center bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
          >
            + Log Workout
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-4 border border-red-200 dark:border-red-800">
          <div className="text-sm text-red-800 dark:text-red-300">{error}</div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="clientFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter by Client
            </label>
            <select
              id="clientFilter"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 sm:text-sm"
            >
              <option value="">All Clients</option>
              {uniqueClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Workout Sessions ({sessions.length})
        </h2>

        {isLoading ? (
          <p className="text-gray-600 dark:text-gray-400">Loading workout sessions...</p>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No workout sessions logged yet.
            </p>
            <Link
              href="/trainer/workouts/log"
              className="inline-block px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
            >
              Log Your First Workout
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {sessions.map((session) => (
              <div key={session.id} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg p-6">
                {/* Session Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {session.appointment.client.fullName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(session.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <Link
                    href={`/trainer/clients/${session.appointment.client.id}`}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    View Client Profile →
                  </Link>
                </div>

                {/* Session Notes */}
                {session.notes && (
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Session Notes:</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{session.notes}</p>
                  </div>
                )}

                {/* Exercises */}
                {session.exercises && session.exercises.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Exercises:</h4>
                    <div className="space-y-2">
                      {session.exercises.map((exercise, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-start p-3 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-md"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-gray-100">{exercise.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {exercise.sets} sets × {exercise.reps} reps
                              {exercise.weight && exercise.weight > 0
                                ? ` @ ${exercise.weight} lbs`
                                : ""}
                            </p>
                            {exercise.notes && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{exercise.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Metrics */}
                {session.customMetrics &&
                  Object.keys(session.customMetrics).length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Metrics:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(session.customMetrics).map(([key, value]) => (
                          <div key={key} className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md">
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{key}</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                              {typeof value === "boolean"
                                ? value
                                  ? "Yes"
                                  : "No"
                                : value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          clientId={selectedClient}
        />
      )}
    </div>
  )
}

// Export Modal Component
function ExportModal({
  onClose,
  clientId,
}: {
  onClose: () => void
  clientId?: string
}) {
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("xlsx")
  const [exportPeriod, setExportPeriod] = useState<"month" | "year" | "all" | "custom">("month")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ]

  const handleExport = () => {
    const params = new URLSearchParams({
      format: exportFormat,
      period: exportPeriod,
    })

    if (exportPeriod === "month") {
      params.append("year", selectedYear.toString())
      params.append("month", selectedMonth.toString())
    } else if (exportPeriod === "year") {
      params.append("year", selectedYear.toString())
    } else if (exportPeriod === "custom") {
      if (customStartDate) params.append("startDate", customStartDate)
      if (customEndDate) params.append("endDate", customEndDate)
    }

    if (clientId) {
      params.append("clientId", clientId)
    }

    window.location.href = `/api/workout-sessions/export?${params.toString()}`
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl dark:shadow-2xl dark:shadow-black/40 border border-gray-200 dark:border-gray-700 max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Export Workout History
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Export your workout session data for record keeping or analysis.
        </p>

        {/* Format Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            File Format
          </label>
          <div className="flex gap-4">
            <button
              onClick={() => setExportFormat("xlsx")}
              className={`flex-1 py-2 px-4 rounded-md font-medium ${
                exportFormat === "xlsx"
                  ? "bg-blue-600 dark:bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              Excel (.xlsx)
            </button>
            <button
              onClick={() => setExportFormat("csv")}
              className={`flex-1 py-2 px-4 rounded-md font-medium ${
                exportFormat === "csv"
                  ? "bg-blue-600 dark:bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              CSV (.csv)
            </button>
          </div>
        </div>

        {/* Time Range Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Time Range
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setExportPeriod("month")}
              className={`py-2 px-4 rounded-md font-medium text-sm ${
                exportPeriod === "month"
                  ? "bg-blue-600 dark:bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setExportPeriod("year")}
              className={`py-2 px-4 rounded-md font-medium text-sm ${
                exportPeriod === "year"
                  ? "bg-blue-600 dark:bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              Year
            </button>
            <button
              onClick={() => setExportPeriod("all")}
              className={`py-2 px-4 rounded-md font-medium text-sm ${
                exportPeriod === "all"
                  ? "bg-blue-600 dark:bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              All History
            </button>
            <button
              onClick={() => setExportPeriod("custom")}
              className={`py-2 px-4 rounded-md font-medium text-sm ${
                exportPeriod === "custom"
                  ? "bg-blue-600 dark:bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              Custom Range
            </button>
          </div>
        </div>

        {/* Month/Year Selectors */}
        {exportPeriod === "month" && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {exportPeriod === "year" && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        )}

        {exportPeriod === "custom" && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Export Details */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-4 mb-6">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
            Export will include:
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
            <li>Session date and client info</li>
            <li>All exercises with sets, reps, and weights</li>
            <li>Session notes and custom metrics</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="flex-1 px-4 py-2 min-h-[44px] bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 font-medium"
          >
            Download {exportFormat.toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  )
}
