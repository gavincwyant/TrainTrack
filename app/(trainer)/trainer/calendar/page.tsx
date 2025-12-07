"use client"

import { useState, useEffect, useCallback } from "react"
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar"
import { format, parse, startOfWeek, getDay } from "date-fns"
import { enUS } from "date-fns/locale"
import "react-big-calendar/lib/css/react-big-calendar.css"
import Link from "next/link"
import AppointmentModal from "@/components/AppointmentModal"
import BlockTimeModal from "@/components/BlockTimeModal"
import AppointmentDetailModal from "@/components/AppointmentDetailModal"
import BlockedTimeDetailModal from "@/components/BlockedTimeDetailModal"

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

type CalendarEvent = {
  id: string
  title: string
  start: Date
  end: Date
  resource: Appointment | BlockedTime
  type: "appointment" | "blocked"
}

type FilterOption = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "RESCHEDULED" | "BLOCKED"

export default function TrainerCalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([])
  const [settings, setSettings] = useState<TrainerSettings | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>("week")
  const [date, setDate] = useState(new Date())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false)
  const [showActionChoice, setShowActionChoice] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showAppointmentDetail, setShowAppointmentDetail] = useState(false)
  const [showBlockedTimeDetail, setShowBlockedTimeDetail] = useState(false)
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>(["SCHEDULED", "COMPLETED", "BLOCKED"])

  const toggleFilter = (filter: FilterOption) => {
    setActiveFilters(prev =>
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    )
  }

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
      setBlockedTimes(blockedTimesData.blockedTimes)
      setSettings(settingsData.settings)

      // Convert to calendar events
      const appointmentEvents: CalendarEvent[] = appointmentsData.appointments.map((apt: Appointment) => ({
        id: apt.id,
        title: `${apt.client.fullName} - ${apt.status}`,
        start: new Date(apt.startTime),
        end: new Date(apt.endTime),
        resource: apt,
        type: "appointment" as const,
      }))

      // Generate blocked time events, including recurring instances
      const blockedEvents: CalendarEvent[] = []

      blockedTimesData.blockedTimes.forEach((blocked: BlockedTime) => {
        if (blocked.isRecurring) {
          // Generate recurring instances for a reasonable time range
          // We'll generate instances for 12 weeks before and after the current date
          const today = new Date()
          const startDate = new Date(today)
          startDate.setDate(startDate.getDate() - 84) // 12 weeks before
          const endDate = new Date(today)
          endDate.setDate(endDate.getDate() + 84) // 12 weeks after

          const originalStart = new Date(blocked.startTime)
          const originalEnd = new Date(blocked.endTime)
          const duration = originalEnd.getTime() - originalStart.getTime()

          // Get the time of day from the original blocked time
          const startHours = originalStart.getHours()
          const startMinutes = originalStart.getMinutes()
          const startSeconds = originalStart.getSeconds()

          // Generate an instance for each week in the range
          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            if (d.getDay() === originalStart.getDay()) {
              const instanceStart = new Date(d)
              instanceStart.setHours(startHours, startMinutes, startSeconds, 0)

              const instanceEnd = new Date(instanceStart.getTime() + duration)

              blockedEvents.push({
                id: `${blocked.id}-${instanceStart.toISOString()}`,
                title: `${blocked.reason || "Blocked"} (Recurring)`,
                start: instanceStart,
                end: instanceEnd,
                resource: blocked,
                type: "blocked" as const,
              })
            }
          }
        } else {
          // Non-recurring blocked time
          blockedEvents.push({
            id: blocked.id,
            title: blocked.reason || "Blocked",
            start: new Date(blocked.startTime),
            end: new Date(blocked.endTime),
            resource: blocked,
            type: "blocked" as const,
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

  // Filter events based on active filters
  const filteredEvents = events.filter(event => {
    if (event.type === "blocked") {
      return activeFilters.includes("BLOCKED")
    }
    // For appointments, check the status
    const appointment = event.resource as Appointment
    return activeFilters.includes(appointment.status as FilterOption)
  })

  // Count only appointments (exclude blocked times)
  const appointmentCount = events.filter(event => event.type === "appointment").length
  const filteredAppointmentCount = filteredEvents.filter(event => event.type === "appointment").length

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setSelectedSlot({ start, end })
    setShowActionChoice(true)
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event)
    if (event.type === "appointment") {
      setShowAppointmentDetail(true)
    } else {
      setShowBlockedTimeDetail(true)
    }
  }

  const eventStyleGetter = (event: CalendarEvent) => {
    if (event.type === "blocked") {
      return {
        style: {
          backgroundColor: "#6b7280", // grey for blocked
          borderRadius: "5px",
          opacity: 0.8,
          color: "white",
          border: "2px solid #4b5563",
          display: "block",
        },
      }
    }

    // Appointment styling
    const status = (event.resource as Appointment).status
    let backgroundColor = "#3174ad"

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

  // Parse trainer's custom hours
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
          <Link
            href="/trainer/settings"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Settings
          </Link>
          <button
            onClick={() => {
              setSelectedSlot(null)
              setIsModalOpen(true)
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

      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Filter Calendar View:</h3>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => toggleFilter("SCHEDULED")}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              activeFilters.includes("SCHEDULED")
                ? "bg-blue-500 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded ${activeFilters.includes("SCHEDULED") ? "bg-blue-300" : "bg-blue-500"}`}></span>
              Scheduled
            </span>
          </button>
          <button
            onClick={() => toggleFilter("COMPLETED")}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              activeFilters.includes("COMPLETED")
                ? "bg-green-500 text-white border-green-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded ${activeFilters.includes("COMPLETED") ? "bg-green-300" : "bg-green-500"}`}></span>
              Completed
            </span>
          </button>
          <button
            onClick={() => toggleFilter("CANCELLED")}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              activeFilters.includes("CANCELLED")
                ? "bg-red-500 text-white border-red-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded ${activeFilters.includes("CANCELLED") ? "bg-red-300" : "bg-red-500"}`}></span>
              Cancelled
            </span>
          </button>
          <button
            onClick={() => toggleFilter("RESCHEDULED")}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              activeFilters.includes("RESCHEDULED")
                ? "bg-orange-500 text-white border-orange-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded ${activeFilters.includes("RESCHEDULED") ? "bg-orange-300" : "bg-orange-500"}`}></span>
              Rescheduled
            </span>
          </button>
          <button
            onClick={() => toggleFilter("BLOCKED")}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              activeFilters.includes("BLOCKED")
                ? "bg-gray-500 text-white border-gray-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded ${activeFilters.includes("BLOCKED") ? "bg-gray-300" : "bg-gray-500"}`}></span>
              Blocked Time
            </span>
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Click to toggle filters. Showing {filteredAppointmentCount} of {appointmentCount} appointments.
        </p>
      </div>

      {/* Legacy Legend - keeping for reference */}
      <div className="bg-white p-4 rounded-lg shadow hidden">
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
            <div className="w-4 h-4 rounded bg-gray-400"></div>
            <span className="text-sm text-gray-600">Cancelled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-500"></div>
            <span className="text-sm text-gray-600">Rescheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500 border-2 border-red-600"></div>
            <span className="text-sm text-gray-600">Blocked Time</span>
          </div>
        </div>
        {settings && (
          <p className="mt-2 text-xs text-gray-500">
            Calendar hours: {settings.dayStartTime} - {settings.dayEndTime}
          </p>
        )}
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
            events={filteredEvents}
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
                    <div className="font-medium text-gray-900">{apt.client.fullName}</div>
                    <div className="text-sm text-gray-600">
                      {format(new Date(apt.startTime), "EEEE, MMM d")} at{" "}
                      {format(new Date(apt.startTime), "h:mm a")} -{" "}
                      {format(new Date(apt.endTime), "h:mm a")}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        if (confirm("Mark this appointment as completed?")) {
                          try {
                            const response = await fetch(`/api/appointments/${apt.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: "COMPLETED" }),
                            })
                            if (response.ok) {
                              fetchData()
                            }
                          } catch (error) {
                            console.error("Failed to update appointment:", error)
                          }
                        }
                      }}
                      className="text-sm text-green-600 hover:text-green-700"
                    >
                      Complete
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm("Cancel this appointment?")) {
                          try {
                            const response = await fetch(`/api/appointments/${apt.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: "CANCELLED" }),
                            })
                            if (response.ok) {
                              fetchData()
                            }
                          } catch (error) {
                            console.error("Failed to cancel appointment:", error)
                          }
                        }
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

      {/* Action Choice Modal */}
      {showActionChoice && selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              What would you like to do?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {format(selectedSlot.start, "EEEE, MMMM d")} at{" "}
              {format(selectedSlot.start, "h:mm a")} - {format(selectedSlot.end, "h:mm a")}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowActionChoice(false)
                  setIsModalOpen(true)
                }}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Schedule Appointment
              </button>
              <button
                onClick={() => {
                  setShowActionChoice(false)
                  setIsBlockModalOpen(true)
                }}
                className="w-full px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  />
                </svg>
                Block Time
              </button>
              <button
                onClick={() => {
                  setShowActionChoice(false)
                  setSelectedSlot(null)
                }}
                className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedSlot(null)
        }}
        onSuccess={() => {
          fetchData()
        }}
        preselectedDate={selectedSlot?.start}
        preselectedEndDate={selectedSlot?.end}
      />

      {/* Block Time Modal */}
      <BlockTimeModal
        isOpen={isBlockModalOpen}
        onClose={() => {
          setIsBlockModalOpen(false)
          setSelectedSlot(null)
        }}
        onSuccess={() => {
          fetchData()
        }}
        preselectedDate={selectedSlot?.start}
        preselectedEndDate={selectedSlot?.end}
      />

      {/* Appointment Detail Modal */}
      {selectedEvent && selectedEvent.type === "appointment" && (
        <AppointmentDetailModal
          isOpen={showAppointmentDetail}
          onClose={() => {
            setShowAppointmentDetail(false)
            setSelectedEvent(null)
          }}
          appointment={selectedEvent.resource as Appointment}
          onUpdate={() => {
            fetchData()
          }}
        />
      )}

      {/* Blocked Time Detail Modal */}
      {selectedEvent && selectedEvent.type === "blocked" && (
        <BlockedTimeDetailModal
          isOpen={showBlockedTimeDetail}
          onClose={() => {
            setShowBlockedTimeDetail(false)
            setSelectedEvent(null)
          }}
          blockedTime={selectedEvent.resource as BlockedTime}
          onUpdate={() => {
            fetchData()
          }}
        />
      )}
    </div>
  )
}
