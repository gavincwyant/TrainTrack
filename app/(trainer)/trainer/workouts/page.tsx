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

  const exportToCSV = () => {
    // Prepare CSV data
    const csvRows = []

    // Headers
    csvRows.push([
      "Date",
      "Client Name",
      "Client Email",
      "Trainer Name",
      "Session Notes",
      "Exercise Name",
      "Sets",
      "Reps",
      "Weight (lbs)",
      "Exercise Notes",
      "Custom Metrics",
    ].join(","))

    // Data rows
    sessions.forEach((session) => {
      const baseInfo = [
        new Date(session.date).toLocaleDateString(),
        `"${session.appointment.client.fullName}"`,
        session.appointment.client.email,
        `"${session.appointment.trainer.fullName}"`,
        session.notes ? `"${session.notes.replace(/"/g, '""')}"` : "",
      ]

      const metrics = session.customMetrics
        ? Object.entries(session.customMetrics)
            .map(([key, value]) => `${key}: ${value}`)
            .join("; ")
        : ""

      if (session.exercises && session.exercises.length > 0) {
        session.exercises.forEach((exercise) => {
          csvRows.push([
            ...baseInfo,
            `"${exercise.name}"`,
            exercise.sets,
            exercise.reps,
            exercise.weight || "",
            exercise.notes ? `"${exercise.notes.replace(/"/g, '""')}"` : "",
            `"${metrics}"`,
          ].join(","))
        })
      } else {
        csvRows.push([
          ...baseInfo,
          "",
          "",
          "",
          "",
          "",
          `"${metrics}"`,
        ].join(","))
      }
    })

    // Create and download file
    const csvContent = csvRows.join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)

    link.setAttribute("href", url)
    link.setAttribute(
      "download",
      `workout-history-${new Date().toISOString().split("T")[0]}.csv`
    )
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Workout History</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">View and manage all logged workout sessions</p>
        </div>
        <div className="flex gap-3">
          {sessions.length > 0 && (
            <button
              onClick={exportToCSV}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Export CSV
            </button>
          )}
          <Link
            href="/trainer/workouts/log"
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
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
    </div>
  )
}
