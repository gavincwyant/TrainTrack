"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

type WorkoutSession = {
  id: string
  date: string
  exercises: Array<{
    name: string
    sets: number
    reps: number
    weight?: number
  }>
  customMetrics: Record<string, string | number | boolean>
}

type Client = {
  id: string
  fullName: string
  email: string
}

export default function ClientProgressPage() {
  const params = useParams()
  const clientId = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [selectedExercise, setSelectedExercise] = useState<string>("")
  const [selectedMetric, setSelectedMetric] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Fetch client details
      const clientRes = await fetch(`/api/clients/${clientId}`)

      if (!clientRes.ok) {
        if (clientRes.status === 404) {
          throw new Error("Client not found")
        }
        throw new Error(`Failed to fetch client (${clientRes.status})`)
      }

      const clientData = await clientRes.json().catch(() => {
        throw new Error("Invalid response from server when fetching client")
      })

      setClient(clientData.client)

      // Fetch workout sessions for this client
      const sessionsRes = await fetch(`/api/workout-sessions?clientId=${clientId}`)

      if (!sessionsRes.ok) {
        if (sessionsRes.status === 404) {
          throw new Error("Sessions endpoint not found")
        }
        throw new Error(`Failed to fetch sessions (${sessionsRes.status})`)
      }

      const sessionsData = await sessionsRes.json().catch(() => {
        throw new Error("Invalid response from server when fetching sessions")
      })

      setSessions(sessionsData.sessions || [])
    } catch (err) {
      console.error("Fetch error:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  // Extract unique exercises from all sessions
  const uniqueExercises = Array.from(
    new Set(
      sessions.flatMap((s) => s.exercises?.map((e) => e.name) || [])
    )
  ).sort()

  // Extract unique metrics from all sessions
  const uniqueMetrics = Array.from(
    new Set(
      sessions.flatMap((s) => Object.keys(s.customMetrics || {}))
    )
  ).sort()

  // Prepare data for exercise progress chart
  const exerciseProgressData = sessions
    .filter((s) => s.exercises?.some((e) => e.name === selectedExercise))
    .map((s) => {
      const exercise = s.exercises?.find((e) => e.name === selectedExercise)
      return {
        date: new Date(s.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        weight: exercise?.weight || 0,
        volume: exercise ? exercise.sets * exercise.reps * (exercise.weight || 0) : 0,
        reps: exercise?.reps || 0,
        sets: exercise?.sets || 0,
      }
    })
    .reverse()

  // Prepare data for custom metric chart
  const metricProgressData = sessions
    .filter((s) => s.customMetrics && selectedMetric in s.customMetrics)
    .map((s) => ({
      date: new Date(s.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      value:
        typeof s.customMetrics[selectedMetric] === "boolean"
          ? s.customMetrics[selectedMetric]
            ? 1
            : 0
          : Number(s.customMetrics[selectedMetric]) || 0,
    }))
    .reverse()

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-800">{error || "Client not found"}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{client.fullName}&apos;s Progress</h1>
          <p className="mt-2 text-gray-600">Visualize workout progress and metrics over time</p>
        </div>
        <Link
          href={`/trainer/clients/${clientId}`}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          ← Back to Profile
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <p className="text-gray-600 mb-4">No workout sessions logged yet for this client.</p>
          <Link
            href="/trainer/workouts/log"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Log First Workout
          </Link>
        </div>
      ) : (
        <>
          {/* Exercise Progress */}
          {uniqueExercises.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Exercise Progress</h2>

              <div className="mb-6">
                <label htmlFor="exerciseSelect" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Exercise
                </label>
                <select
                  id="exerciseSelect"
                  value={selectedExercise}
                  onChange={(e) => setSelectedExercise(e.target.value)}
                  className="block w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">-- Select an exercise --</option>
                  {uniqueExercises.map((exercise) => (
                    <option key={exercise} value={exercise}>
                      {exercise}
                    </option>
                  ))}
                </select>
              </div>

              {selectedExercise && exerciseProgressData.length > 0 ? (
                <div className="space-y-8">
                  {/* Weight Progress */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Weight Progression</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={exerciseProgressData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="weight"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          name="Weight (lbs)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Volume Progress */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Total Volume (Sets × Reps × Weight)
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={exerciseProgressData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="volume" fill="#10b981" name="Volume (lbs)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Sets and Reps */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Sets & Reps</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={exerciseProgressData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="sets"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          name="Sets"
                        />
                        <Line
                          type="monotone"
                          dataKey="reps"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          name="Reps"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : selectedExercise ? (
                <p className="text-gray-600">No data available for this exercise.</p>
              ) : (
                <p className="text-gray-600">Select an exercise to view progress charts.</p>
              )}
            </div>
          )}

          {/* Custom Metrics Progress */}
          {uniqueMetrics.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Custom Metrics Progress</h2>

              <div className="mb-6">
                <label htmlFor="metricSelect" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Metric
                </label>
                <select
                  id="metricSelect"
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value)}
                  className="block w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">-- Select a metric --</option>
                  {uniqueMetrics.map((metric) => (
                    <option key={metric} value={metric}>
                      {metric}
                    </option>
                  ))}
                </select>
              </div>

              {selectedMetric && metricProgressData.length > 0 ? (
                <div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={metricProgressData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#ec4899"
                        strokeWidth={2}
                        name={selectedMetric}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : selectedMetric ? (
                <p className="text-gray-600">No data available for this metric.</p>
              ) : (
                <p className="text-gray-600">Select a metric to view progress chart.</p>
              )}
            </div>
          )}

          {/* Summary Stats */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Exercises Tracked</p>
                <p className="text-2xl font-bold text-gray-900">{uniqueExercises.length}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Metrics Tracked</p>
                <p className="text-2xl font-bold text-gray-900">{uniqueMetrics.length}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
