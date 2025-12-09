"use client"

import { useState, useEffect, useCallback } from "react"
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar"
import { format, parse, startOfWeek, getDay, isBefore, isAfter } from "date-fns"
import { enUS } from "date-fns/locale"
import "react-big-calendar/lib/css/react-big-calendar.css"

const locales = {
  "en-US": enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

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
}

type TrainerSettings = {
  dayStartTime: string
  dayEndTime: string
  timezone: string
}

type CalendarEvent = {
  id: string
  title: string
  start: Date
  end: Date
  resource: Appointment | BlockedTime | { type: "available" }
  type: "appointment" | "blocked" | "available"
}

export default function ClientSchedulePage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [settings, setSettings] = useState<TrainerSettings | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [view, setView] = useState<View>("week")
  const [date, setDate] = useState(new Date())
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null)

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
        type: "appointment" as const,
      }))

      const blockedEvents: CalendarEvent[] = blockedTimesData.blockedTimes.map((blocked: BlockedTime) => ({
        id: blocked.id,
        title: "Unavailable",
        start: new Date(blocked.startTime),
        end: new Date(blocked.endTime),
        resource: blocked,
        type: "blocked" as const,
      }))

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
    // Check if the slot is in the past
    if (isBefore(start, new Date())) {
      setError("Cannot book appointments in the past")
      setTimeout(() => setError(null), 3000)
      return
    }

    // Check if the slot overlaps with existing appointments or blocked times
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
      fetchData() // Refresh the calendar
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
      fetchData() // Refresh the calendar
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setTimeout(() => setError(null), 3000)
    }
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    if (event.type === "appointment") {
      const apt = event.resource as Appointment
      const canCancel = isAfter(new Date(apt.startTime), new Date())

      if (canCancel && confirm("Would you like to cancel this appointment?")) {
        handleCancelAppointment(apt.id)
      }
    }
  }

  const eventStyleGetter = (event: CalendarEvent) => {
    if (event.type === "blocked") {
      return {
        style: {
          backgroundColor: "#ef4444",
          borderRadius: "5px",
          opacity: 0.6,
          color: "white",
          border: "2px solid #dc2626",
          display: "block",
        },
      }
    }

    if (event.type === "appointment") {
      const status = (event.resource as Appointment).status

      let backgroundColor = "#3b82f6" // blue

      switch (status) {
        case "SCHEDULED":
          backgroundColor = "#3b82f6" // blue
          break
        case "COMPLETED":
          backgroundColor = "#10b981" // green
          break
        case "CANCELLED":
          backgroundColor = "#9ca3af" // gray
          break
        case "RESCHEDULED":
          backgroundColor = "#f59e0b" // amber
          break
      }

      return {
        style: {
          backgroundColor,
          borderRadius: "5px",
          opacity: 0.8,
          color: "white",
          border: "0px",
          display: "block",
        },
      }
    }

    return {}
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Schedule</h1>
        <p className="mt-2 text-gray-600">View and manage your training sessions</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="text-sm text-green-800">{success}</div>
        </div>
      )}

      {/* Booking Modal */}
      {selectedSlot && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Book Appointment</h3>
            <div className="space-y-3 mb-6">
              <div>
                <span className="text-sm font-medium text-gray-700">Date:</span>
                <p className="text-gray-900">{format(selectedSlot.start, "EEEE, MMMM d, yyyy")}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Time:</span>
                <p className="text-gray-900">
                  {format(selectedSlot.start, "h:mm a")} - {format(selectedSlot.end, "h:mm a")}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Duration:</span>
                <p className="text-gray-900">
                  {(selectedSlot.end.getTime() - selectedSlot.start.getTime()) / (1000 * 60)} minutes
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedSlot(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBookAppointment}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Legend:</h3>
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500"></div>
            <span className="text-sm text-gray-600">Your Appointments</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500 border-2 border-red-600"></div>
            <span className="text-sm text-gray-600">Unavailable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500"></div>
            <span className="text-sm text-gray-600">Completed</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Click on an empty time slot to book an appointment. Click on your appointments to cancel them.
        </p>
      </div>

      {/* Calendar */}
      <div className="bg-white p-6 rounded-lg shadow" style={{ height: "700px" }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600">Loading calendar...</p>
          </div>
        ) : (
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable
            eventPropGetter={eventStyleGetter}
            style={{ height: "100%" }}
            views={["month", "week", "day"]}
            defaultView="week"
            step={30}
            timeslots={2}
            min={min}
            max={max}
          />
        )}
      </div>

      {/* Upcoming Appointments List */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Appointments</h2>
        {appointments.filter((apt) =>
          new Date(apt.startTime) > new Date() && apt.status === "SCHEDULED"
        ).length === 0 ? (
          <p className="text-gray-600">No upcoming appointments</p>
        ) : (
          <div className="space-y-3">
            {appointments
              .filter((apt) => new Date(apt.startTime) > new Date() && apt.status === "SCHEDULED")
              .slice(0, 5)
              .map((apt) => (
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
                  <button
                    onClick={() => handleCancelAppointment(apt.id)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Cancel
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
