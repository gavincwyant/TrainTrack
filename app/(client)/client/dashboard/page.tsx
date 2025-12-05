"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import Link from "next/link"

type Appointment = {
  id: string
  startTime: string
  endTime: string
  status: string
  trainer: {
    id: string
    fullName: string
  }
}

export default function ClientDashboardPage() {
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUpcomingAppointments()
  }, [])

  const fetchUpcomingAppointments = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/appointments?status=SCHEDULED&upcoming=true")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch appointments")
      }

      setUpcomingAppointments(data.appointments.slice(0, 5))
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome back! Here&apos;s your training overview.</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/client/schedule"
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900">Book Session</h3>
          <p className="mt-2 text-sm text-gray-600">Schedule your next training session</p>
        </Link>

        <Link
          href="/client/schedule"
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900">My Schedule</h3>
          <p className="mt-2 text-sm text-gray-600">View all your appointments</p>
        </Link>

        <Link
          href="/client/history"
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900">Workout History</h3>
          <p className="mt-2 text-sm text-gray-600">Track your progress and past sessions</p>
        </Link>
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Sessions</h2>
        {isLoading ? (
          <p className="text-gray-600">Loading...</p>
        ) : upcomingAppointments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">No upcoming sessions scheduled</p>
            <Link
              href="/client/schedule"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Book a Session
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingAppointments.map((apt) => (
              <div
                key={apt.id}
                className="flex justify-between items-center p-3 border border-gray-200 rounded-md"
              >
                <div>
                  <div className="font-medium text-gray-900">
                    Training with {apt.trainer.fullName}
                  </div>
                  <div className="text-sm text-gray-600">
                    {format(new Date(apt.startTime), "EEEE, MMM d")} at{" "}
                    {format(new Date(apt.startTime), "h:mm a")} -{" "}
                    {format(new Date(apt.endTime), "h:mm a")}
                  </div>
                </div>
                <Link
                  href="/client/schedule"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Details
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
