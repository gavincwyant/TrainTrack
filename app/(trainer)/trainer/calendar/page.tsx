"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar"
import { format, parse, startOfWeek, endOfWeek, getDay, addDays, addWeeks, addMonths } from "date-fns"
import { enUS } from "date-fns/locale"
import "react-big-calendar/lib/css/react-big-calendar.css"
import "./calendar-custom.css"
import Link from "next/link"
import AppointmentModal from "@/components/AppointmentModal"
import BlockTimeModal from "@/components/BlockTimeModal"
import AppointmentDetailModal from "@/components/AppointmentDetailModal"
import BlockedTimeDetailModal from "@/components/BlockedTimeDetailModal"
import GroupSessionDetailModal from "@/components/GroupSessionDetailModal"
import { useCalendarSwipe } from "@/hooks/useCalendarSwipe"
import { useDragToCreate } from "@/hooks/useDragToCreate"
import { CustomAgenda } from "@/components/calendar/CustomAgenda"
import { DragSelectionOverlay } from "@/components/calendar/DragSelectionOverlay"

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
  isGroupSession?: boolean
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
  resource: Appointment | BlockedTime | Appointment[]
  type: "appointment" | "blocked" | "group"
}

type FilterOption = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "RESCHEDULED" | "BLOCKED"

export default function TrainerCalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [settings, setSettings] = useState<TrainerSettings | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Default to week view on all devices
  const [view, setView] = useState<View>("week")
  const [date, setDate] = useState(new Date())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false)
  const [showActionChoice, setShowActionChoice] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showAppointmentDetail, setShowAppointmentDetail] = useState(false)
  const [showBlockedTimeDetail, setShowBlockedTimeDetail] = useState(false)
  const [showGroupSessionDetail, setShowGroupSessionDetail] = useState(false)
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
      setSettings(settingsData.settings)

      // Convert to calendar events, consolidating group sessions
      const allAppointments: Appointment[] = appointmentsData.appointments

      // Group appointments by matching start and end times (group sessions)
      const groupedByTime = new Map<string, Appointment[]>()
      allAppointments.forEach((apt: Appointment) => {
        const timeKey = `${apt.startTime}-${apt.endTime}`
        const existing = groupedByTime.get(timeKey) || []
        existing.push(apt)
        groupedByTime.set(timeKey, existing)
      })

      // Create calendar events - consolidate group sessions into single events
      const appointmentEvents: CalendarEvent[] = []
      groupedByTime.forEach((aptsAtTime) => {
        if (aptsAtTime.length > 1) {
          // This is a group session - create single consolidated event
          const firstApt = aptsAtTime[0]
          const activeCount = aptsAtTime.filter(a => a.status !== "CANCELLED").length
          appointmentEvents.push({
            id: `group-${firstApt.startTime}-${firstApt.endTime}`,
            title: `Group Session (${activeCount} ${activeCount === 1 ? "Client" : "Clients"})`,
            start: new Date(firstApt.startTime),
            end: new Date(firstApt.endTime),
            resource: aptsAtTime, // Store all appointments in the group
            type: "group" as const,
          })
        } else {
          // Individual appointment
          const apt = aptsAtTime[0]
          appointmentEvents.push({
            id: apt.id,
            title: apt.client.fullName,
            start: new Date(apt.startTime),
            end: new Date(apt.endTime),
            resource: apt,
            type: "appointment" as const,
          })
        }
      })

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
    if (event.type === "group") {
      // For group sessions, show if any appointment in the group matches the filter
      const groupAppointments = event.resource as Appointment[]
      return groupAppointments.some(apt => activeFilters.includes(apt.status as FilterOption))
    }
    // For individual appointments, check the status
    const appointment = event.resource as Appointment
    return activeFilters.includes(appointment.status as FilterOption)
  })

  // Count appointments (individual + group members, exclude blocked times)
  const appointmentCount = events.reduce((count, event) => {
    if (event.type === "group") {
      return count + (event.resource as Appointment[]).length
    }
    if (event.type === "appointment") {
      return count + 1
    }
    return count
  }, 0)
  const filteredAppointmentCount = filteredEvents.reduce((count, event) => {
    if (event.type === "group") {
      return count + (event.resource as Appointment[]).length
    }
    if (event.type === "appointment") {
      return count + 1
    }
    return count
  }, 0)

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Lock body scroll and calendar scroll when action choice modal is open
  useEffect(() => {
    if (showActionChoice) {
      const originalStyle = window.getComputedStyle(document.body).overflow
      document.body.style.overflow = "hidden"

      // Also disable calendar scroll container with touch-action for mobile
      const calendarContent = document.querySelector('.rbc-time-content') as HTMLElement
      const originalCalendarOverflow = calendarContent?.style.overflow
      const originalTouchAction = calendarContent?.style.touchAction
      if (calendarContent) {
        calendarContent.style.overflow = "hidden"
        calendarContent.style.touchAction = "none"
      }

      return () => {
        document.body.style.overflow = originalStyle
        if (calendarContent) {
          calendarContent.style.overflow = originalCalendarOverflow || ""
          calendarContent.style.touchAction = originalTouchAction || ""
        }
      }
    }
  }, [showActionChoice])

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setSelectedSlot({ start, end })
    setShowActionChoice(true)
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event)
    if (event.type === "group") {
      setShowGroupSessionDetail(true)
    } else if (event.type === "appointment") {
      setShowAppointmentDetail(true)
    } else {
      setShowBlockedTimeDetail(true)
    }
  }

  const eventStyleGetter = (event: CalendarEvent) => {
    if (event.type === "blocked") {
      return {
        style: {
          backgroundColor: "rgba(107, 114, 128, 0.85)", // grey for blocked
          borderRadius: "6px",
          opacity: 1,
          color: "white",
          borderLeft: "4px solid #4b5563",
          display: "block",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        },
      }
    }

    // Group session styling - polished blue gradient
    if (event.type === "group") {
      const groupAppointments = event.resource as Appointment[]
      const hasScheduled = groupAppointments.some(a => a.status === "SCHEDULED")
      const allCompleted = groupAppointments.every(a => a.status === "COMPLETED" || a.status === "CANCELLED")
      const allCancelled = groupAppointments.every(a => a.status === "CANCELLED")

      if (allCancelled) {
        return {
          style: {
            backgroundColor: "rgba(239, 68, 68, 0.85)",
            borderRadius: "6px",
            opacity: 1,
            color: "white",
            borderLeft: "4px solid #dc2626",
            display: "block",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          },
        }
      }

      if (allCompleted) {
        return {
          style: {
            backgroundColor: "rgba(16, 185, 129, 0.9)",
            borderRadius: "6px",
            opacity: 1,
            color: "white",
            borderLeft: "4px solid #059669",
            display: "block",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          },
        }
      }

      // Has scheduled appointments - show gradient
      return {
        style: {
          background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #2563eb 100%)",
          borderRadius: "6px",
          opacity: 1,
          color: "white",
          borderLeft: "4px solid #1e40af",
          display: "block",
          boxShadow: "0 2px 8px rgba(59, 130, 246, 0.4)",
        },
      }
    }

    // Individual appointment styling with status indicator border
    const appointment = event.resource as Appointment
    const status = appointment.status
    let backgroundColor = "#3b82f6"
    let borderColor = "#2563eb"
    let boxShadow = "0 1px 3px rgba(0,0,0,0.1)"

    switch (status) {
      case "SCHEDULED":
        backgroundColor = "rgba(59, 130, 246, 0.9)" // blue
        borderColor = "#2563eb" // blue-600
        break
      case "COMPLETED":
        backgroundColor = "rgba(16, 185, 129, 0.9)" // green
        borderColor = "#059669" // emerald-600
        break
      case "CANCELLED":
        backgroundColor = "rgba(239, 68, 68, 0.85)" // red
        borderColor = "#dc2626" // red-600
        break
      case "RESCHEDULED":
        backgroundColor = "rgba(245, 158, 11, 0.9)" // amber
        borderColor = "#d97706" // amber-600
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
        boxShadow,
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

  // Ref for the calendar container (used by drag-to-create)
  const calendarContainerRef = useRef<HTMLDivElement>(null)

  // Swipe gesture handlers for mobile calendar navigation
  const swipeHandlers = useCalendarSwipe(date, setDate, view)

  // Drag-to-create gesture handlers for mobile appointment creation
  const { dragHandlers, isDragging, selectionState, gutterInfo } = useDragToCreate({
    containerRef: calendarContainerRef,
    dayStartTime: settings?.dayStartTime || "06:00",
    dayEndTime: settings?.dayEndTime || "22:00",
    step: 30,
    onSelectionComplete: (start: Date, end: Date) => {
      setSelectedSlot({ start, end })
      setShowActionChoice(true)
    },
    enabled: view === "day" || view === "week",
    currentDate: date,
  })

  // Create wrapped agenda component with navigation handlers
  const WrappedAgenda = useMemo(() => {
    const AgendaWithNav = (props: React.ComponentProps<typeof CustomAgenda>) => (
      <CustomAgenda
        {...props}
        onNavigate={setDate}
        onView={setView}
      />
    )
    // Copy static properties from CustomAgenda
    AgendaWithNav.title = CustomAgenda.title
    AgendaWithNav.navigate = CustomAgenda.navigate
    AgendaWithNav.range = CustomAgenda.range
    return AgendaWithNav
  }, [setDate, setView])

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">Calendar</h1>
          <p className="mt-2 sm:mt-3 text-base sm:text-lg text-gray-600 dark:text-gray-400">View and manage your appointments</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={() => {
              setSelectedSlot(null)
              setIsModalOpen(true)
            }}
            className="order-first sm:order-last px-4 sm:px-6 py-2.5 min-h-[44px] bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:shadow-blue-600/30 hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="sm:hidden">New</span>
            <span className="hidden sm:inline">New Appointment</span>
          </button>
          <Link
            href="/trainer/availability"
            className="px-4 sm:px-5 py-2.5 min-h-[44px] border-2 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-blue-500/30 transition-all duration-200 font-medium flex items-center justify-center"
          >
            <span className="hidden sm:inline">Manage Availability</span>
            <span className="sm:hidden">Availability</span>
          </Link>
          <button
            onClick={async () => {
              try {
                const response = await fetch("/api/calendar/sync", { method: "POST" })
                if (!response.ok) throw new Error("Sync failed")
                await fetchData()
              } catch (err) {
                setError(err instanceof Error ? err.message : "Sync failed")
              }
            }}
            className="px-4 sm:px-5 py-2.5 min-h-[44px] border-2 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-green-500/30 transition-all duration-200 font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-4 border border-red-200 dark:border-red-800">
          <div className="text-sm text-red-800 dark:text-red-300">{error}</div>
        </div>
      )}

      {/* Mobile: Filters Card */}
      <div className="md:hidden bg-white dark:bg-gray-900 px-3 py-2 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700">
        <div className="flex gap-1.5 justify-between">
          <button
            onClick={() => toggleFilter("SCHEDULED")}
            className={`px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 font-medium ${
              activeFilters.includes("SCHEDULED")
                ? "bg-blue-500 text-white border-blue-600"
                : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700"
            }`}
          >
            Sched
          </button>
          <button
            onClick={() => toggleFilter("COMPLETED")}
            className={`px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 font-medium ${
              activeFilters.includes("COMPLETED")
                ? "bg-green-500 text-white border-green-600"
                : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700"
            }`}
          >
            Done
          </button>
          <button
            onClick={() => toggleFilter("CANCELLED")}
            className={`px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 font-medium ${
              activeFilters.includes("CANCELLED")
                ? "bg-red-500 text-white border-red-600"
                : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700"
            }`}
          >
            Cancel
          </button>
          <button
            onClick={() => toggleFilter("RESCHEDULED")}
            className={`px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 font-medium ${
              activeFilters.includes("RESCHEDULED")
                ? "bg-orange-500 text-white border-orange-600"
                : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700"
            }`}
          >
            Resched
          </button>
          <button
            onClick={() => toggleFilter("BLOCKED")}
            className={`px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 font-medium ${
              activeFilters.includes("BLOCKED")
                ? "bg-gray-500 text-white border-gray-600"
                : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700"
            }`}
          >
            Block
          </button>
        </div>
      </div>

      {/* Mobile: Controls Card */}
      <div className="md:hidden bg-white dark:bg-gray-900 p-4 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col gap-3">
          {/* Date Label */}
          <h2 className="text-xl font-bold text-center text-gray-900 dark:text-gray-100">
            {view === "day" || view === "agenda"
              ? format(date, "EEEE, MMMM d, yyyy")
              : view === "week"
              ? `${format(startOfWeek(date, { weekStartsOn: 0 }), "MMM d")} - ${format(endOfWeek(date, { weekStartsOn: 0 }), "MMM d, yyyy")}`
              : format(date, "MMMM yyyy")}
          </h2>

          {/* View Switcher */}
          <div className="flex rounded-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
            {(["day", "agenda", "week", "month"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex-1 py-2.5 min-h-[44px] text-sm font-medium transition-all duration-200 ${
                  view === v
                    ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white"
                    : "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center gap-2">
            <button
              onClick={() => setDate(view === "month" ? addMonths(date, -1) : view === "week" ? addWeeks(date, -1) : addDays(date, -1))}
              className="p-3 min-h-[44px] min-w-[44px] border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setDate(new Date())}
              className="px-6 py-2.5 min-h-[44px] border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 font-medium"
            >
              Today
            </button>
            <button
              onClick={() => setDate(view === "month" ? addMonths(date, 1) : view === "week" ? addWeeks(date, 1) : addDays(date, 1))}
              className="p-3 min-h-[44px] min-w-[44px] border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop: Filter Controls */}
      <div className="hidden md:block bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Filter Calendar View</h3>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => toggleFilter("SCHEDULED")}
            className={`px-4 py-2.5 min-h-[44px] text-sm rounded-lg border-2 transition-all duration-200 font-medium ${
              activeFilters.includes("SCHEDULED")
                ? "bg-blue-500 text-white border-blue-600 shadow-lg shadow-blue-500/30"
                : "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-500/30"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${activeFilters.includes("SCHEDULED") ? "bg-blue-200" : "bg-blue-500"}`}></span>
              Scheduled
            </span>
          </button>
          <button
            onClick={() => toggleFilter("COMPLETED")}
            className={`px-4 py-2.5 min-h-[44px] text-sm rounded-lg border-2 transition-all duration-200 font-medium ${
              activeFilters.includes("COMPLETED")
                ? "bg-green-500 text-white border-green-600 shadow-lg shadow-green-500/30"
                : "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 hover:bg-green-50 dark:hover:bg-green-950/30 hover:border-green-500/30"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${activeFilters.includes("COMPLETED") ? "bg-green-200" : "bg-green-500"}`}></span>
              Completed
            </span>
          </button>
          <button
            onClick={() => toggleFilter("CANCELLED")}
            className={`px-4 py-2.5 min-h-[44px] text-sm rounded-lg border-2 transition-all duration-200 font-medium ${
              activeFilters.includes("CANCELLED")
                ? "bg-red-500 text-white border-red-600 shadow-lg shadow-red-500/30"
                : "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-500/30"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${activeFilters.includes("CANCELLED") ? "bg-red-200" : "bg-red-500"}`}></span>
              Cancelled
            </span>
          </button>
          <button
            onClick={() => toggleFilter("RESCHEDULED")}
            className={`px-4 py-2.5 min-h-[44px] text-sm rounded-lg border-2 transition-all duration-200 font-medium ${
              activeFilters.includes("RESCHEDULED")
                ? "bg-orange-500 text-white border-orange-600 shadow-lg shadow-orange-500/30"
                : "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:border-orange-500/30"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${activeFilters.includes("RESCHEDULED") ? "bg-orange-200" : "bg-orange-500"}`}></span>
              Rescheduled
            </span>
          </button>
          <button
            onClick={() => toggleFilter("BLOCKED")}
            className={`px-4 py-2.5 min-h-[44px] text-sm rounded-lg border-2 transition-all duration-200 font-medium ${
              activeFilters.includes("BLOCKED")
                ? "bg-gray-500 text-white border-gray-600 shadow-lg shadow-gray-500/30"
                : "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-500/30"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${activeFilters.includes("BLOCKED") ? "bg-gray-200" : "bg-gray-500"}`}></span>
              Blocked Time
            </span>
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
          Click to toggle filters. Showing <span className="font-semibold text-gray-900 dark:text-gray-100">{filteredAppointmentCount}</span> of <span className="font-semibold text-gray-900 dark:text-gray-100">{appointmentCount}</span> appointments.
        </p>
      </div>

      {/* Calendar - edge-to-edge on mobile for max space */}
      <div
        ref={calendarContainerRef}
        {...swipeHandlers()}
        {...dragHandlers()}
        className={`bg-white dark:bg-gray-900 p-1 sm:p-4 md:p-6 lg:p-8 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 sm:shadow-xl border border-gray-200 dark:border-gray-700 -mx-4 sm:mx-0 overflow-hidden ${
          view === "month"
            ? "h-auto min-h-[300px] sm:h-[calc(100vh-200px)] md:h-[750px]"
            : "h-[calc(100vh-280px)] sm:h-[calc(100vh-200px)] md:h-[750px] min-h-[400px] max-h-[1000px]"
        } ${isDragging ? "calendar-dragging" : ""}`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">Loading calendar...</p>
            </div>
          </div>
        ) : (
          <>
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
              selectable={!isDragging}
              eventPropGetter={eventStyleGetter}
              style={{ height: "100%" }}
              views={{
                month: true,
                week: true,
                day: true,
                agenda: WrappedAgenda,
              }}
              defaultView="week"
              step={30}
              timeslots={2}
              min={min}
              max={max}
              formats={{
                selectRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
                  `${format(start, "h:mm a")}\u000A${format(end, "h:mm a")}`,
              }}
            />
            <DragSelectionOverlay
              bounds={selectionState.bounds}
              startTime={selectionState.startTime}
              endTime={selectionState.endTime}
              isActive={isDragging}
              gutterInfo={gutterInfo}
              containerRef={calendarContainerRef}
            />
          </>
        )}
      </div>

      {/* Upcoming Appointments List */}
      <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Upcoming Appointments</h2>
        {appointments.filter((apt) =>
          new Date(apt.startTime) > new Date() && apt.status === "SCHEDULED"
        ).length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 text-center py-8">No upcoming appointments</p>
        ) : (
          <div className="space-y-4">
            {appointments
              .filter((apt) => new Date(apt.startTime) > new Date() && apt.status === "SCHEDULED")
              .slice(0, 5)
              .map((apt) => (
                <div
                  key={apt.id}
                  className="group flex justify-between items-center p-5 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500/30 hover:shadow-lg transition-all duration-200 bg-gray-50 dark:bg-gray-800"
                >
                  <div>
                    <div className="font-semibold text-lg text-gray-900 dark:text-gray-100">{apt.client.fullName}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
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
                      className="px-4 py-2 text-sm font-medium text-green-600 hover:text-white hover:bg-green-500 border-2 border-green-500 rounded-lg transition-all duration-200"
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
                      className="px-4 py-2 text-sm font-medium text-red-600 hover:text-white hover:bg-red-500 border-2 border-red-500 rounded-lg transition-all duration-200"
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
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          style={{ touchAction: "none" }}
          onClick={() => {
            setShowActionChoice(false)
            setSelectedSlot(null)
          }}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 p-6 border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              What would you like to do?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {format(selectedSlot.start, "EEEE, MMMM d")} at{" "}
              {format(selectedSlot.start, "h:mm a")} - {format(selectedSlot.end, "h:mm a")}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowActionChoice(false)
                  setIsModalOpen(true)
                }}
                className="w-full px-4 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center justify-center gap-2"
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
                className="w-full px-4 py-3 bg-red-600 dark:bg-red-500 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600 flex items-center justify-center gap-2"
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
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
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

      {/* Group Session Detail Modal */}
      {selectedEvent && selectedEvent.type === "group" && (
        <GroupSessionDetailModal
          isOpen={showGroupSessionDetail}
          onClose={() => {
            setShowGroupSessionDetail(false)
            setSelectedEvent(null)
          }}
          appointments={selectedEvent.resource as Appointment[]}
          onUpdate={() => {
            fetchData()
          }}
        />
      )}
    </div>
  )
}
