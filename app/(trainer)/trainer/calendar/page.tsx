"use client"

import { useState, useEffect, useCallback } from "react"
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar"
import { format, parse, startOfWeek, getDay } from "date-fns"
import { enUS } from "date-fns/locale"
import "react-big-calendar/lib/css/react-big-calendar.css"
import Link from "next/link"

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

type CalendarEvent = {
  id: string
  title: string
  start: Date
  end: Date
  resource: Appointment
}

export default function TrainerCalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>("week")
  const [date, setDate] = useState(new Date())

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/appointments")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch appointments")
      }

      setAppointments(data.appointments)

      // Convert to calendar events
      const calendarEvents: CalendarEvent[] = data.appointments.map((apt: Appointment) => ({
        id: apt.id,
        title: `${apt.client.fullName} - ${apt.status}`,
        start: new Date(apt.startTime),
        end: new Date(apt.endTime),
        resource: apt,
      }))

      setEvents(calendarEvents)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    // TODO: Open modal to create new appointment
    console.log("Selected slot:", start, end)
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    // TODO: Open modal to view/edit appointment
    console.log("Selected event:", event)
  }

  const eventStyleGetter = (event: CalendarEvent) => {
    const status = event.resource.status
    let backgroundColor = "#3174ad"

    switch (status) {
      case "SCHEDULED":
        backgroundColor = "#3b82f6" // blue
        break
      case "COMPLETED":
        backgroundColor = "#10b981" // green
        break
      case "CANCELLED":
        backgroundColor = "#ef4444" // red
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
          <p className="mt-2 text-gray-600">View and manage your appointments</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/trainer/availability"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Manage Availability
          </Link>
          <button
            onClick={() => {
              // TODO: Open new appointment modal
              alert("New appointment modal coming soon!")
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            New Appointment
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {/* Legend */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Status Legend:</h3>
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500"></div>
            <span className="text-sm text-gray-600">Scheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500"></div>
            <span className="text-sm text-gray-600">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500"></div>
            <span className="text-sm text-gray-600">Cancelled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-500"></div>
            <span className="text-sm text-gray-600">Rescheduled</span>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white p-6 rounded-lg shadow" style={{ height: "700px" }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600">Loading appointments...</p>
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
            views={["month", "week", "day", "agenda"]}
            defaultView="week"
            step={30}
            timeslots={2}
            min={new Date(0, 0, 0, 6, 0, 0)} // 6 AM
            max={new Date(0, 0, 0, 22, 0, 0)} // 10 PM
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
                    <div className="font-medium text-gray-900">{apt.client.fullName}</div>
                    <div className="text-sm text-gray-600">
                      {format(new Date(apt.startTime), "EEEE, MMM d")} at{" "}
                      {format(new Date(apt.startTime), "h:mm a")} -{" "}
                      {format(new Date(apt.endTime), "h:mm a")}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        // TODO: Mark as completed
                        alert("Mark as completed coming soon!")
                      }}
                      className="text-sm text-green-600 hover:text-green-700"
                    >
                      Complete
                    </button>
                    <button
                      onClick={() => {
                        // TODO: Cancel appointment
                        alert("Cancel appointment coming soon!")
                      }}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
