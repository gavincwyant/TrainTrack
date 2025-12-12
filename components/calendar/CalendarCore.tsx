"use client"

import { useRef, useMemo, ReactNode } from "react"
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar"
import { format, parse, startOfWeek, endOfWeek, getDay, addDays, addWeeks, addMonths } from "date-fns"
import { enUS } from "date-fns/locale"
import "react-big-calendar/lib/css/react-big-calendar.css"
import "./calendar.css"
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

export type CalendarEvent = {
  id: string
  title: string
  start: Date
  end: Date
  resource: unknown
  type: string
}

export type CalendarCoreProps = {
  events: CalendarEvent[]
  view: View
  onViewChange: (view: View) => void
  date: Date
  onDateChange: (date: Date) => void
  onSelectSlot?: (slot: { start: Date; end: Date }) => void
  onSelectEvent?: (event: CalendarEvent) => void
  eventStyleGetter?: (event: CalendarEvent) => { style: React.CSSProperties }
  minTime?: Date
  maxTime?: Date
  isLoading?: boolean
  dayStartTime?: string
  dayEndTime?: string
  enableDragToCreate?: boolean
  enableSwipe?: boolean
  selectable?: boolean
  views?: View[]
  step?: number
  timeslots?: number
  headerContent?: ReactNode
  mobileControls?: ReactNode
  showMobileControls?: boolean
  className?: string
}

export function CalendarCore({
  events,
  view,
  onViewChange,
  date,
  onDateChange,
  onSelectSlot,
  onSelectEvent,
  eventStyleGetter,
  minTime = new Date(0, 0, 0, 6, 0, 0),
  maxTime = new Date(0, 0, 0, 22, 0, 0),
  isLoading = false,
  dayStartTime = "06:00",
  dayEndTime = "22:00",
  enableDragToCreate = true,
  enableSwipe = true,
  selectable = true,
  views = ["month", "week", "day", "agenda"],
  step = 30,
  timeslots = 2,
  headerContent,
  mobileControls,
  showMobileControls = true,
  className = "",
}: CalendarCoreProps) {
  const calendarContainerRef = useRef<HTMLDivElement>(null)

  // Swipe gesture handlers for mobile calendar navigation
  const swipeHandlers = useCalendarSwipe(date, onDateChange, view)

  // Drag-to-create gesture handlers for mobile appointment creation
  const { dragHandlers, isDragging, selectionState, gutterInfo } = useDragToCreate({
    containerRef: calendarContainerRef,
    dayStartTime,
    dayEndTime,
    step,
    onSelectionComplete: (start: Date, end: Date) => {
      if (onSelectSlot) {
        onSelectSlot({ start, end })
      }
    },
    enabled: enableDragToCreate && (view === "day" || view === "week"),
    currentDate: date,
  })

  // Create wrapped agenda component with navigation handlers
  const WrappedAgenda = useMemo(() => {
    const AgendaWithNav = (props: React.ComponentProps<typeof CustomAgenda>) => (
      <CustomAgenda
        {...props}
        onNavigate={onDateChange}
        onView={onViewChange}
      />
    )
    // Copy static properties from CustomAgenda
    AgendaWithNav.title = CustomAgenda.title
    AgendaWithNav.navigate = CustomAgenda.navigate
    AgendaWithNav.range = CustomAgenda.range
    return AgendaWithNav
  }, [onDateChange, onViewChange])

  // Build views config
  const viewsConfig = useMemo(() => {
    const config: Record<string, boolean | typeof WrappedAgenda> = {}
    views.forEach((v) => {
      if (v === "agenda") {
        config[v] = WrappedAgenda
      } else {
        config[v] = true
      }
    })
    return config
  }, [views, WrappedAgenda])

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header Content (passed from parent) */}
      {headerContent}

      {/* Mobile Controls */}
      {showMobileControls && (
        <>
          {mobileControls || (
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
                  {(views as View[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => onViewChange(v)}
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
                    onClick={() => onDateChange(view === "month" ? addMonths(date, -1) : view === "week" ? addWeeks(date, -1) : addDays(date, -1))}
                    className="p-3 min-h-[44px] min-w-[44px] border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 flex items-center justify-center"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDateChange(new Date())}
                    className="px-6 py-2.5 min-h-[44px] border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 font-medium"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => onDateChange(view === "month" ? addMonths(date, 1) : view === "week" ? addWeeks(date, 1) : addDays(date, 1))}
                    className="p-3 min-h-[44px] min-w-[44px] border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 flex items-center justify-center"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Calendar Container */}
      <div
        ref={calendarContainerRef}
        {...(enableSwipe ? swipeHandlers() : {})}
        {...(enableDragToCreate ? dragHandlers() : {})}
        className={`bg-white dark:bg-gray-900 p-1 sm:p-4 md:p-6 lg:p-8 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 sm:shadow-xl border border-gray-200 dark:border-gray-700 -mx-4 sm:mx-0 overflow-hidden ${
          view === "month"
            ? "h-auto min-h-[300px] sm:h-[calc(100vh-200px)] md:h-[750px]"
            : "h-[calc(100vh-280px)] sm:h-[calc(100vh-200px)] md:h-[750px] min-h-[400px] max-h-[1000px]"
        } ${isDragging ? "calendar-dragging" : ""} ${className}`}
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
              events={events}
              startAccessor="start"
              endAccessor="end"
              view={view}
              onView={onViewChange}
              date={date}
              onNavigate={onDateChange}
              onSelectSlot={onSelectSlot}
              onSelectEvent={onSelectEvent}
              selectable={selectable && !isDragging}
              eventPropGetter={eventStyleGetter}
              style={{ height: "100%" }}
              views={viewsConfig}
              defaultView="week"
              step={step}
              timeslots={timeslots}
              min={minTime}
              max={maxTime}
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
    </div>
  )
}

// Export utility functions
export { format, startOfWeek, endOfWeek, addDays, addWeeks, addMonths }
