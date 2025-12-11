"use client"

import { useMemo } from "react"
import { format, isSameDay, addDays } from "date-fns"
import { Navigate, View } from "react-big-calendar"

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  type?: "appointment" | "blocked"
  resource?: {
    type: "appointment" | "blocked"
    status?: string
    clientName?: string
    appointmentType?: string
  }
}

interface CustomAgendaProps {
  events: CalendarEvent[]
  date: Date
  length: number
  accessors: {
    start: (event: CalendarEvent) => Date
    end: (event: CalendarEvent) => Date
    title: (event: CalendarEvent) => string
  }
  localizer: {
    messages: Record<string, string>
    format: (date: Date, formatStr: string) => string
  }
  onSelectEvent?: (event: CalendarEvent) => void
  onNavigate?: (date: Date) => void
  onView?: (view: View) => void
}

// Color mapping for event statuses
const statusColors: Record<string, { bg: string; text: string }> = {
  SCHEDULED: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
  COMPLETED: { bg: "bg-green-500/10", text: "text-green-600 dark:text-green-400" },
  CANCELLED: { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400" },
  RESCHEDULED: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
  blocked: { bg: "bg-gray-500/10", text: "text-gray-500 dark:text-gray-400" },
}

function getEventColors(event: CalendarEvent) {
  // Check both event.type and resource.type for blocked
  if (event.type === "blocked" || event.resource?.type === "blocked") {
    return statusColors.blocked
  }
  const status = event.resource?.status || "SCHEDULED"
  return statusColors[status] || statusColors.SCHEDULED
}

function CustomAgendaComponent({
  events,
  date,
  length,
  accessors,
  onSelectEvent,
  onNavigate,
  onView,
}: CustomAgendaProps) {
  const handleDateClick = (clickedDate: Date) => {
    onNavigate?.(clickedDate)
    onView?.("day" as View)
  }
  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups: { date: Date; events: CalendarEvent[] }[] = []

    // Sort events by start time
    const sortedEvents = [...events].sort(
      (a, b) => accessors.start(a).getTime() - accessors.start(b).getTime()
    )

    sortedEvents.forEach((event) => {
      const eventDate = accessors.start(event)
      const existingGroup = groups.find((g) => isSameDay(g.date, eventDate))

      if (existingGroup) {
        existingGroup.events.push(event)
      } else {
        groups.push({ date: eventDate, events: [event] })
      }
    })

    return groups
  }, [events, accessors])

  if (events.length === 0) {
    return (
      <div className="rbc-agenda-empty p-8 text-center text-[var(--text-secondary)]">
        No events in this range.
      </div>
    )
  }

  return (
    <div className="rbc-agenda-view">
      <table className="rbc-agenda-table w-full">
        <thead>
          <tr>
            <th className="rbc-header">Date</th>
            <th className="rbc-header">Time</th>
            <th className="rbc-header">Event</th>
          </tr>
        </thead>
        <tbody>
          {groupedEvents.map((group) => (
            group.events.map((event, eventIndex) => {
              const colors = getEventColors(event)
              return (
                <tr
                  key={event.id}
                  className={`rbc-agenda-row cursor-pointer transition-colors ${colors.bg} hover:opacity-80`}
                  onClick={() => onSelectEvent?.(event)}
                >
                  {eventIndex === 0 && (
                    <td
                      className="rbc-agenda-date-cell cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                      rowSpan={group.events.length}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDateClick(group.date)
                      }}
                    >
                      {format(group.date, "EEE, MMM d")}
                    </td>
                  )}
                  <td className={`rbc-agenda-time-cell ${colors.text}`}>
                    {format(accessors.start(event), "h:mm a")} - {format(accessors.end(event), "h:mm a")}
                  </td>
                  <td className="rbc-agenda-event-cell">
                    <span className={`font-medium ${colors.text}`}>
                      {accessors.title(event)}
                    </span>
                  </td>
                </tr>
              )
            })
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Static properties required by react-big-calendar for custom views
CustomAgendaComponent.title = (date: Date) => {
  return format(date, "MMMM yyyy")
}

CustomAgendaComponent.navigate = (date: Date, action: string) => {
  switch (action) {
    case Navigate.PREVIOUS:
      return addDays(date, -30)
    case Navigate.NEXT:
      return addDays(date, 30)
    default:
      return date
  }
}

CustomAgendaComponent.range = (date: Date, { length = 30 }: { length?: number } = {}) => {
  const start = date
  const end = addDays(date, length)
  return { start, end }
}

export const CustomAgenda = CustomAgendaComponent as typeof CustomAgendaComponent & {
  title: (date: Date) => string
  navigate: (date: Date, action: string) => Date
  range: (date: Date, options?: { length?: number }) => { start: Date; end: Date }
}
