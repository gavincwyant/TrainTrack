import type { CalendarEvent, CalendarView, EventLayoutInfo } from '../types/calendar'
import { isSameDay, getMinutesFromMidnight, getDurationInMinutes } from './dateHelpers'

/**
 * Interface for an overlap group
 */
interface OverlapGroup {
  events: CalendarEvent[]
  startTime: Date
  endTime: Date
}

/**
 * Interface for event with column assignment
 */
interface EventWithColumn extends CalendarEvent {
  column: number
  maxColumns: number
}

/**
 * Calculate event positions for calendar grid
 * @param events - Array of calendar events
 * @param viewType - Current calendar view
 * @param containerHeight - Height of the container in pixels (for day/week views)
 * @param pixelsPerHour - Pixels per hour (default: 60)
 * @returns Array of event layout info with positions
 */
export function calculateEventPositions(
  events: CalendarEvent[],
  viewType: CalendarView,
  containerHeight: number,
  pixelsPerHour = 60
): EventLayoutInfo[] {
  if (viewType === 'month' || viewType === 'agenda') {
    // Month and agenda views don't need complex positioning
    return events.map((event) => ({
      event,
      top: 0,
      height: 0,
      left: 0,
      width: 100,
      column: 0,
      maxColumns: 1,
    }))
  }

  // For day and week views, calculate detailed positions
  const layoutInfos: EventLayoutInfo[] = []

  // Group events by day
  const eventsByDay = groupEventsByDay(events)

  // Process each day's events
  Object.values(eventsByDay).forEach((dayEvents) => {
    // Find overlapping groups
    const overlapGroups = groupOverlappingEvents(dayEvents)

    overlapGroups.forEach((group) => {
      // Assign columns to events in this overlap group
      const eventsWithColumns = assignColumns(group.events)

      eventsWithColumns.forEach((eventWithColumn) => {
        const { column, maxColumns } = eventWithColumn
        const event = eventWithColumn

        // Calculate vertical position and height
        const top = getEventTop(event.startTime, pixelsPerHour)
        const height = getEventHeight(event.startTime, event.endTime, pixelsPerHour)

        // Calculate horizontal position and width
        const columnWidth = 100 / maxColumns
        const left = column * columnWidth
        const width = columnWidth - 1 // Subtract 1% for gap between columns

        layoutInfos.push({
          event,
          top,
          height,
          left,
          width,
          column,
          maxColumns,
        })
      })
    })
  })

  return layoutInfos
}

/**
 * Group events by day
 * @param events - Array of events
 * @returns Object with date strings as keys and event arrays as values
 */
function groupEventsByDay(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const grouped: Record<string, CalendarEvent[]> = {}

  events.forEach((event) => {
    const dateKey = event.startTime.toDateString()

    if (!grouped[dateKey]) {
      grouped[dateKey] = []
    }

    grouped[dateKey].push(event)
  })

  return grouped
}

/**
 * Detect overlapping events
 * @param events - Array of events
 * @returns Array of overlap groups
 */
export function detectOverlaps(events: CalendarEvent[]): OverlapGroup[] {
  if (events.length <= 1) {
    return events.map((event) => ({
      events: [event],
      startTime: event.startTime,
      endTime: event.endTime,
    }))
  }

  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

  const groups: OverlapGroup[] = []

  sortedEvents.forEach((event) => {
    // Find if this event overlaps with any existing group
    let addedToGroup = false

    for (const group of groups) {
      if (eventsOverlap(event, group.startTime, group.endTime)) {
        group.events.push(event)
        // Update group time range
        group.startTime = new Date(Math.min(group.startTime.getTime(), event.startTime.getTime()))
        group.endTime = new Date(Math.max(group.endTime.getTime(), event.endTime.getTime()))
        addedToGroup = true
        break
      }
    }

    // If not added to any group, create a new group
    if (!addedToGroup) {
      groups.push({
        events: [event],
        startTime: event.startTime,
        endTime: event.endTime,
      })
    }
  })

  return groups
}

/**
 * Group overlapping events
 * @param events - Array of events
 * @returns Array of overlap groups
 */
export function groupOverlappingEvents(events: CalendarEvent[]): OverlapGroup[] {
  if (events.length <= 1) {
    return events.map((event) => ({
      events: [event],
      startTime: event.startTime,
      endTime: event.endTime,
    }))
  }

  // Sort events by start time, then by duration (longer first)
  const sortedEvents = [...events].sort((a, b) => {
    const startDiff = a.startTime.getTime() - b.startTime.getTime()
    if (startDiff !== 0) return startDiff

    // If start times are equal, longer events first
    const durationA = a.endTime.getTime() - a.startTime.getTime()
    const durationB = b.endTime.getTime() - b.startTime.getTime()
    return durationB - durationA
  })

  const groups: OverlapGroup[] = []

  sortedEvents.forEach((event) => {
    let merged = false

    // Try to merge with existing groups
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i]

      if (eventsOverlap(event, group.startTime, group.endTime)) {
        group.events.push(event)
        // Update group boundaries
        group.startTime = new Date(Math.min(group.startTime.getTime(), event.startTime.getTime()))
        group.endTime = new Date(Math.max(group.endTime.getTime(), event.endTime.getTime()))
        merged = true

        // Check if this merge causes overlap with other groups
        for (let j = i + 1; j < groups.length; j++) {
          const otherGroup = groups[j]
          if (eventsOverlap(event, otherGroup.startTime, otherGroup.endTime)) {
            // Merge the two groups
            group.events.push(...otherGroup.events)
            group.startTime = new Date(Math.min(group.startTime.getTime(), otherGroup.startTime.getTime()))
            group.endTime = new Date(Math.max(group.endTime.getTime(), otherGroup.endTime.getTime()))
            groups.splice(j, 1)
            j--
          }
        }

        break
      }
    }

    if (!merged) {
      groups.push({
        events: [event],
        startTime: event.startTime,
        endTime: event.endTime,
      })
    }
  })

  return groups
}

/**
 * Check if an event overlaps with a time range
 * @param event - Event to check
 * @param rangeStart - Range start time
 * @param rangeEnd - Range end time
 * @returns True if event overlaps with range
 */
function eventsOverlap(event: CalendarEvent, rangeStart: Date, rangeEnd: Date): boolean {
  return event.startTime < rangeEnd && event.endTime > rangeStart
}

/**
 * Assign columns to overlapping events
 * @param events - Array of overlapping events
 * @returns Array of events with column assignments
 */
export function assignColumns(events: CalendarEvent[]): EventWithColumn[] {
  if (events.length === 0) return []

  // Sort events by start time, then by duration (longer first)
  const sortedEvents = [...events].sort((a, b) => {
    const startDiff = a.startTime.getTime() - b.startTime.getTime()
    if (startDiff !== 0) return startDiff

    const durationA = a.endTime.getTime() - a.startTime.getTime()
    const durationB = b.endTime.getTime() - b.startTime.getTime()
    return durationB - durationA
  })

  const columns: Array<{ event: CalendarEvent; endTime: Date }> = []
  const result: EventWithColumn[] = []

  sortedEvents.forEach((event) => {
    // Find the first available column
    let columnIndex = 0

    for (let i = 0; i < columns.length; i++) {
      if (columns[i].endTime <= event.startTime) {
        // This column is available
        columnIndex = i
        columns[i] = { event, endTime: event.endTime }
        break
      } else if (i === columns.length - 1) {
        // Need a new column
        columnIndex = columns.length
        columns.push({ event, endTime: event.endTime })
        break
      }
    }

    // If no columns exist yet
    if (columns.length === 0) {
      columnIndex = 0
      columns.push({ event, endTime: event.endTime })
    }

    result.push({
      ...event,
      column: columnIndex,
      maxColumns: 0, // Will be updated after all events are processed
    })
  })

  // Update maxColumns for all events
  const maxColumns = columns.length
  result.forEach((eventWithColumn) => {
    eventWithColumn.maxColumns = maxColumns
  })

  return result
}

/**
 * Calculate event height in pixels
 * @param startTime - Event start time
 * @param endTime - Event end time
 * @param pixelsPerHour - Pixels per hour (default: 60)
 * @returns Height in pixels
 */
export function getEventHeight(startTime: Date, endTime: Date, pixelsPerHour = 60): number {
  const durationMinutes = getDurationInMinutes(startTime, endTime)
  const height = (durationMinutes / 60) * pixelsPerHour

  // Minimum height for visibility (e.g., 20 pixels for events < 30 minutes)
  return Math.max(height, 20)
}

/**
 * Calculate event top position in pixels
 * @param time - Event start time
 * @param pixelsPerHour - Pixels per hour (default: 60)
 * @param dayStartHour - Hour when the day starts (default: 0)
 * @returns Top position in pixels from day start
 */
export function getEventTop(time: Date, pixelsPerHour = 60, dayStartHour = 0): number {
  const minutesFromMidnight = getMinutesFromMidnight(time)
  const minutesFromDayStart = minutesFromMidnight - dayStartHour * 60
  return (minutesFromDayStart / 60) * pixelsPerHour
}

/**
 * Check if event is all-day (24 hours or more)
 * @param event - Calendar event
 * @returns True if all-day event
 */
export function isAllDayEvent(event: CalendarEvent): boolean {
  const durationMinutes = getDurationInMinutes(event.startTime, event.endTime)
  return durationMinutes >= 24 * 60
}

/**
 * Check if event spans multiple days
 * @param event - Calendar event
 * @returns True if event spans multiple days
 */
export function isMultiDayEvent(event: CalendarEvent): boolean {
  return !isSameDay(event.startTime, event.endTime)
}

/**
 * Get the visible portion of an event for a specific day
 * @param event - Calendar event
 * @param date - Date to get portion for
 * @param dayStartHour - Hour when the day starts (default: 0)
 * @param dayEndHour - Hour when the day ends (default: 24)
 * @returns Object with start and end times for the visible portion
 */
export function getEventPortionForDay(
  event: CalendarEvent,
  date: Date,
  dayStartHour = 0,
  dayEndHour = 24
): { start: Date; end: Date } | null {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), dayStartHour, 0, 0)
  const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), dayEndHour, 0, 0)

  // Check if event overlaps with this day
  if (event.endTime <= dayStart || event.startTime >= dayEnd) {
    return null
  }

  // Calculate visible portion
  const visibleStart = event.startTime < dayStart ? dayStart : event.startTime
  const visibleEnd = event.endTime > dayEnd ? dayEnd : event.endTime

  return {
    start: visibleStart,
    end: visibleEnd,
  }
}

/**
 * Sort events by start time, then by duration (longer first)
 * @param events - Array of events
 * @returns Sorted array of events
 */
export function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const startDiff = a.startTime.getTime() - b.startTime.getTime()
    if (startDiff !== 0) return startDiff

    const durationA = a.endTime.getTime() - a.startTime.getTime()
    const durationB = b.endTime.getTime() - b.startTime.getTime()
    return durationB - durationA
  })
}
