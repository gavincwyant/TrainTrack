"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { EmptyState } from "@/components/EmptyState"

type Exercise = {
  name: string
  sets?: number
  reps?: number
  weight?: number
  notes?: string
}

type Workout = {
  id: string
  date: string
  notes: string | null
  exercises: Exercise[] | null
  trainer: {
    id: string
    fullName: string
  }
  appointment: {
    id: string
    startTime: string
    endTime: string
  } | null
  createdAt: string
}

type Summary = {
  totalWorkouts: number
  firstWorkout: string | null
  lastWorkout: string | null
}

export default function ClientWorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    fetchWorkouts()
  }, [])

  const fetchWorkouts = async (loadMore = false) => {
    const currentOffset = loadMore ? offset : 0
    setIsLoading(!loadMore)
    try {
      const response = await fetch(`/api/client/workouts?limit=20&offset=${currentOffset}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch workouts")
      }

      if (loadMore) {
        setWorkouts((prev) => [...prev, ...data.workouts])
      } else {
        setWorkouts(data.workouts)
      }
      setSummary(data.summary)
      setHasMore(data.pagination.hasMore)
      setOffset(currentOffset + data.workouts.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleExpand = (workoutId: string) => {
    setExpandedWorkout(expandedWorkout === workoutId ? null : workoutId)
  }

  if (isLoading && workouts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Workouts</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading your workout history...</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Workouts</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Track your progress and view past training sessions
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
          <div className="text-sm text-red-800 dark:text-red-300">{error}</div>
        </div>
      )}

      {/* Summary Stats */}
      {summary && summary.totalWorkouts > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Workouts</p>
              <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-gray-100">
                {summary.totalWorkouts}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">First Workout</p>
              <p className="mt-1 text-lg text-gray-900 dark:text-gray-100">
                {summary.firstWorkout ? format(new Date(summary.firstWorkout), "MMM d, yyyy") : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Workout</p>
              <p className="mt-1 text-lg text-gray-900 dark:text-gray-100">
                {summary.lastWorkout ? format(new Date(summary.lastWorkout), "MMM d, yyyy") : "-"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Workout List */}
      {workouts.length === 0 ? (
        <EmptyState
          icon={
            <svg className="h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8h2m12 0h2M6 8v8m12-8v8M9 8h6M9 16h6M6 12h12" />
            </svg>
          }
          title="No workouts yet"
          description="Your workout history will appear here after your training sessions are completed."
          action={{ label: "Book a Session", href: "/client/appointments" }}
        />
      ) : (
        <div className="space-y-4">
          {workouts.map((workout) => (
            <div
              key={workout.id}
              className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden"
            >
              <div
                className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                onClick={() => toggleExpand(workout.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {format(new Date(workout.date), "EEEE, MMMM d, yyyy")}
                      </h3>
                      <svg
                        className={`h-5 w-5 text-gray-400 dark:text-gray-500 transition-transform ${
                          expandedWorkout === workout.id ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Trainer: {workout.trainer.fullName}
                    </p>
                    {workout.exercises && workout.exercises.length > 0 && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {workout.exercises.length} exercise{workout.exercises.length !== 1 ? "s" : ""} logged
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedWorkout === workout.id && (
                <div className="px-6 pb-6 border-t border-gray-100 dark:border-gray-800">
                  {/* Session Notes */}
                  {workout.notes && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Session Notes</h4>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {workout.notes}
                      </p>
                    </div>
                  )}

                  {/* Exercises */}
                  {workout.exercises && workout.exercises.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Exercises</h4>
                      <div className="space-y-3">
                        {workout.exercises.map((exercise, index) => (
                          <div
                            key={index}
                            className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4"
                          >
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {exercise.name}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                              {exercise.sets !== undefined && (
                                <span>Sets: {exercise.sets}</span>
                              )}
                              {exercise.reps !== undefined && (
                                <span>Reps: {exercise.reps}</span>
                              )}
                              {exercise.weight !== undefined && (
                                <span>Weight: {exercise.weight} lbs</span>
                              )}
                            </div>
                            {exercise.notes && (
                              <p className="mt-2 text-sm text-gray-500 dark:text-gray-500 italic">
                                {exercise.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!workout.notes && (!workout.exercises || workout.exercises.length === 0) && (
                    <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
                      No details recorded for this session.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={() => fetchWorkouts(true)}
                className="px-6 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
