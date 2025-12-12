"use client"

import { useState, useEffect, useCallback } from "react"
import { View } from "react-big-calendar"
import { format, isBefore, isAfter } from "date-fns"
import { CalendarCore, CalendarEvent } from "./CalendarCore"
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

type BlockedTime = {
  id: string
  startTime: string
  endTime: string
  reason?: string
  isRecurring: boolean
}

type TrainerSettings = {
  dayStartTime: string
  dayEndTime: string
  timezone: string
}

type TabType = "calendar" | "upcoming" | "past"

export function ClientCalendar() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [settings, setSettings] = useState<TrainerSettings | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [view, setView] = useState<View>("week")
  const [date, setDate] = useState(new Date())
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>("calendar")

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [appointmentsRes, blockedTimesRes, settingsRes] = await Promise.all([
        fetch("/api/appointments"),
        fetch("/api/blocked-times"),
        fetch("/api/trainer-settings"),
      ])

      const [appointmentsData, blockedTimesData, settingsData] = await Promise.all([
        appointmentsRes.json(),
        blockedTimesRes.json(),
        settingsRes.json(),
      ])

      if (!appointmentsRes.ok || !blockedTimesRes.ok || !settingsRes.ok) {
        throw new Error("Failed to fetch data")
      }

      setAppointments(appointmentsData.appointments)
      setSettings(settingsData.settings)

      // Convert to calendar events
      const appointmentEvents: CalendarEvent[] = appointmentsData.appointments.map((apt: Appointment) => ({
        id: apt.id,
        title: `Training with ${apt.trainer.fullName}`,
        start: new Date(apt.startTime),
        end: new Date(apt.endTime),
        resource: apt,
        type: "appointment",
      }))

      // Generate blocked time events, including recurring instances
      const blockedEvents: CalendarEvent[] = []

      blockedTimesData.blockedTimes.forEach((blocked: BlockedTime) => {
        if (blocked.isRecurring) {
          // Generate recurring instances for a reasonable time range
          const today = new Date()
          const startDate = new Date(today)
          startDate.setDate(startDate.getDate() - 84) // 12 weeks before
          const endDate = new Date(today)
          endDate.setDate(endDate.getDate() + 84) // 12 weeks after

          const originalStart = new Date(blocked.startTime)
          const originalEnd = new Date(blocked.endTime)
          const duration = originalEnd.getTime() - originalStart.getTime()

          const startHours = originalStart.getHours()
          const startMinutes = originalStart.getMinutes()
          const startSeconds = originalStart.getSeconds()

          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            if (d.getDay() === originalStart.getDay()) {
              const instanceStart = new Date(d)
              instanceStart.setHours(startHours, startMinutes, startSeconds, 0)
              const instanceEnd = new Date(instanceStart.getTime() + duration)

              blockedEvents.push({
                id: `${blocked.id}-${instanceStart.toISOString()}`,
                title: "Unavailable",
                start: instanceStart,
                end: instanceEnd,
                resource: blocked,
                type: "blocked",
              })
            }
          }
        } else {
          blockedEvents.push({
            id: blocked.id,
            title: "Unavailable",
            start: new Date(blocked.startTime),
            end: new Date(blocked.endTime),
            resource: blocked,
            type: "blocked",
          })
        }
      })

      setEvents([...appointmentEvents, ...blockedEvents])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    if (isBefore(start, new Date())) {
      setError("Cannot book appointments in the past")
      setTimeout(() => setError(null), 3000)
      return
    }

    const overlaps = events.some((event) => {
      return (
        (isAfter(start, event.start) && isBefore(start, event.end)) ||
        (isAfter(end, event.start) && isBefore(end, event.end)) ||
        (isBefore(start, event.start) && isAfter(end, event.end))
      )
    })

    if (overlaps) {
      setError("This time slot is not available")
      setTimeout(() => setError(null), 3000)
      return
    }

    setSelectedSlot({ start, end })
  }

  const handleBookAppointment = async () => {
    if (!selectedSlot) return

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: selectedSlot.start.toISOString(),
          endTime: selectedSlot.end.toISOString(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to book appointment")
      }

      setSuccess("Appointment booked successfully!")
      setSelectedSlot(null)
      fetchData()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setTimeout(() => setError(null), 3000)
    }
  }

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to cancel appointment")
      }

      setSuccess("Appointment cancelled successfully!")
      fetchData()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setTimeout(() => setError(null), 3000)
    }
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    if (event.type === "appointment") {
      const apt = event.resource as Appointment
      const canCancel = isAfter(new Date(apt.startTime), new Date()) && apt.status === "SCHEDULED"

      if (canCancel && confirm("Would you like to cancel this appointment?")) {
        handleCancelAppointment(apt.id)
      }
    }
  }

  const eventStyleGetter = (event: CalendarEvent) => {
    if (event.type === "blocked") {
      return {
        style: {
          backgroundColor: "rgba(107, 114, 128, 0.85)",
          borderRadius: "6px",
          opacity: 1,
          color: "white",
          borderLeft: "4px solid #4b5563",
          display: "block",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        },
      }
    }

    if (event.type === "appointment") {
      const status = (event.resource as Appointment).status
      let backgroundColor = "#3b82f6"
      let borderColor = "#2563eb"

      switch (status) {
        case "SCHEDULED":
          backgroundColor = "rgba(59, 130, 246, 0.9)"
          borderColor = "#2563eb"
          break
        case "COMPLETED":
          backgroundColor = "rgba(16, 185, 129, 0.9)"
          borderColor = "#059669"
          break
        case "CANCELLED":
          backgroundColor = "rgba(239, 68, 68, 0.85)"
          borderColor = "#dc2626"
          break
        case "RESCHEDULED":
          backgroundColor = "rgba(245, 158, 11, 0.9)"
          borderColor = "#d97706"
          break
      }

      return {
        style: {
          backgroundColor,
          borderRadius: "6px",
          opacity: 1,
          color: "white",
          borderLeft: `4px solid ${borderColor}`,
          display: "block",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        },
      }
    }

    return { style: {} }
  }

  const getCalendarHours = () => {
    if (!settings) return { min: new Date(0, 0, 0, 6, 0, 0), max: new Date(0, 0, 0, 22, 0, 0) }

    const [startHour, startMin] = settings.dayStartTime.split(":").map(Number)
    const [endHour, endMin] = settings.dayEndTime.split(":").map(Number)

    return {
      min: new Date(0, 0, 0, startHour, startMin, 0),
      max: new Date(0, 0, 0, endHour, endMin, 0),
    }
  }

  const { min, max } = getCalendarHours()

  const upcomingAppointments = appointments
    .filter((apt) => new Date(apt.startTime) > new Date() && apt.status === "SCHEDULED")
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  const pastAppointments = appointments
    .filter((apt) => new Date(apt.startTime) <= new Date() || apt.status !== "SCHEDULED")
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">My Appointments</h1>
        <p className="mt-2 sm:mt-3 text-base sm:text-lg text-gray-600 dark:text-gray-400">View and manage your training sessions</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
          <div className="text-sm text-red-800 dark:text-red-300">{error}</div>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-800">
          <div className="text-sm text-green-800 dark:text-green-300">{success}</div>
        </div>
      )}

      {/* Booking Modal */}
      {selectedSlot && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          style={{ touchAction: "none" }}
          onClick={() => setSelectedSlot(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 p-6 border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Book Appointment</h3>
            <div className="space-y-3 mb-6">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Date:</span>
                <p className="text-gray-900 dark:text-gray-100">{format(selectedSlot.start, "EEEE, MMMM d, yyyy")}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Time:</span>
                <p className="text-gray-900 dark:text-gray-100">
                  {format(selectedSlot.start, "h:mm a")} - {format(selectedSlot.end, "h:mm a")}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Duration:</span>
                <p className="text-gray-900 dark:text-gray-100">
                  {(selectedSlot.end.getTime() - selectedSlot.start.getTime()) / (1000 * 60)} minutes
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedSlot(null)}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleBookAppointment}
                className="flex-1 px-4 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
              >
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {(["calendar", "upcoming", "past"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              {tab === "calendar" ? "Calendar" : tab === "upcoming" ? "Upcoming" : "Past"}
              {tab === "upcoming" && upcomingAppointments.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded-full">
                  {upcomingAppointments.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Calendar Tab */}
      {activeTab === "calendar" && (
        <>
          {/* Legend */}
          <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Legend:</h3>
            <div className="flex gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500 border-l-4 border-blue-700"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Scheduled</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500 border-l-4 border-green-700"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-500 border-l-4 border-gray-700"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Unavailable</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-500">
              Tap an empty time slot to book. Tap your appointments to cancel.
            </p>
          </div>

          <CalendarCore
            events={events}
            view={view}
            onViewChange={setView}
            date={date}
            onDateChange={setDate}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            eventStyleGetter={eventStyleGetter}
            minTime={min}
            maxTime={max}
            isLoading={isLoading}
            dayStartTime={settings?.dayStartTime || "06:00"}
            dayEndTime={settings?.dayEndTime || "22:00"}
            enableDragToCreate={true}
            enableSwipe={true}
            views={["day", "agenda", "week", "month"]}
          />
        </>
      )}

      {/* Upcoming Tab */}
      {activeTab === "upcoming" && (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Upcoming Appointments ({upcomingAppointments.length})
          </h2>
          {upcomingAppointments.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="mt-2 text-gray-600 dark:text-gray-400">No upcoming appointments</p>
              <button
                onClick={() => setActiveTab("calendar")}
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
              >
                Book an Appointment
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="group flex justify-between items-center p-5 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500/30 hover:shadow-lg transition-all duration-200 bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                        Training with {apt.trainer.fullName}
                      </div>
                      <StatusBadge status={apt.status} type="appointment" />
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {format(new Date(apt.startTime), "EEEE, MMM d")} at{" "}
                      {format(new Date(apt.startTime), "h:mm a")} -{" "}
                      {format(new Date(apt.endTime), "h:mm a")}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCancelAppointment(apt.id)}
                    className="ml-4 px-4 py-2 text-sm font-medium text-red-600 hover:text-white hover:bg-red-500 border-2 border-red-500 rounded-lg transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Past Tab */}
      {activeTab === "past" && (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Past Appointments ({pastAppointments.length})
          </h2>
          {pastAppointments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">No past appointments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pastAppointments.slice(0, 20).map((apt) => (
                <div
                  key={apt.id}
                  className="flex justify-between items-center p-5 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                        Training with {apt.trainer.fullName}
                      </div>
                      <StatusBadge status={apt.status} type="appointment" />
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {format(new Date(apt.startTime), "EEEE, MMM d, yyyy")} at{" "}
                      {format(new Date(apt.startTime), "h:mm a")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
