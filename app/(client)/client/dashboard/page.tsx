"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import Link from "next/link"
import { OverviewCard } from "@/components/OverviewCard"
import { StatusBadge } from "@/components/StatusBadge"

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

type DashboardData = {
  upcomingAppointments: Appointment[]
  stats: {
    upcomingCount: number
    totalWorkouts: number
    lastWorkoutDate: string | null
    outstandingInvoices: number
    outstandingAmount: number
  }
  trainerEmail: string | null
}

export default function ClientDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      // Fetch all data in parallel
      const [appointmentsRes, workoutsRes, invoicesRes, settingsRes] = await Promise.all([
        fetch("/api/appointments?status=SCHEDULED&upcoming=true"),
        fetch("/api/client/workouts?limit=1"),
        fetch("/api/client/invoices"),
        fetch("/api/client-settings"),
      ])

      const [appointmentsData, workoutsData, invoicesData, settingsData] = await Promise.all([
        appointmentsRes.json(),
        workoutsRes.json(),
        invoicesRes.json(),
        settingsRes.json(),
      ])

      if (!appointmentsRes.ok) throw new Error(appointmentsData.error)

      setData({
        upcomingAppointments: appointmentsData.appointments?.slice(0, 3) || [],
        stats: {
          upcomingCount: appointmentsData.appointments?.length || 0,
          totalWorkouts: workoutsData.summary?.totalWorkouts || 0,
          lastWorkoutDate: workoutsData.summary?.lastWorkout || null,
          outstandingInvoices: invoicesData.invoices?.filter(
            (i: { status: string }) => i.status === "SENT" || i.status === "OVERDUE"
          ).length || 0,
          outstandingAmount: invoicesData.summary?.outstanding || 0,
        },
        trainerEmail: settingsData.settings?.trainerEmail || null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading your training overview...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Welcome back! Here&apos;s your training overview.</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
          <div className="text-sm text-red-800 dark:text-red-300">{error}</div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <OverviewCard
          title="Upcoming Appointments"
          value={data?.stats.upcomingCount || 0}
          subtitle={
            data?.upcomingAppointments[0]
              ? `Next: ${format(new Date(data.upcomingAppointments[0].startTime), "MMM d")}`
              : "No upcoming sessions"
          }
          href="/client/appointments"
          icon={
            <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />

        <OverviewCard
          title="Total Workouts"
          value={data?.stats.totalWorkouts || 0}
          subtitle={
            data?.stats.lastWorkoutDate
              ? `Last: ${format(new Date(data.stats.lastWorkoutDate), "MMM d")}`
              : "No workouts yet"
          }
          href="/client/workouts"
          icon={
            <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h2m12 0h2M6 8v8m12-8v8M9 8h6M9 16h6M6 12h12" />
            </svg>
          }
        />

        <OverviewCard
          title="Outstanding Invoices"
          value={data?.stats.outstandingInvoices || 0}
          subtitle={
            data?.stats.outstandingAmount
              ? `$${data.stats.outstandingAmount.toFixed(2)} due`
              : "All paid"
          }
          href="/client/invoices"
          highlight={(data?.stats.outstandingInvoices || 0) > 0}
          icon={
            <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          }
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/client/appointments"
            className="flex items-center justify-center px-4 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Book Appointment
          </Link>

          <Link
            href="/client/invoices"
            className="flex items-center justify-center px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            View Invoices
          </Link>

          {data?.trainerEmail && (
            <a
              href={`mailto:${data.trainerEmail}`}
              className="flex items-center justify-center px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact Trainer
            </a>
          )}
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Upcoming Sessions</h2>
          <Link
            href="/client/appointments"
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            View all
          </Link>
        </div>

        {(data?.upcomingAppointments?.length || 0) === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="mt-2 text-gray-600 dark:text-gray-400">No upcoming sessions scheduled</p>
            <Link
              href="/client/appointments"
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
            >
              Book a Session
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {data?.upcomingAppointments.map((apt) => (
              <div
                key={apt.id}
                className="flex justify-between items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      Training with {apt.trainer.fullName}
                    </div>
                    <StatusBadge status={apt.status} type="appointment" />
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {format(new Date(apt.startTime), "EEEE, MMM d")} at{" "}
                    {format(new Date(apt.startTime), "h:mm a")} -{" "}
                    {format(new Date(apt.endTime), "h:mm a")}
                  </div>
                </div>
                <Link
                  href="/client/appointments"
                  className="ml-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
