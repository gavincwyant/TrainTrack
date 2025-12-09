import type { CalendarEvent, CalendarSettings } from '../types/calendar'
import {
  parseTimeString,
  combineDateAndTime,
  getDurationInMinutes,
  startOfDay,
  addDays,
} from './dateHelpers'

/**
 * Snap time to nearest grid interval
 * @param time - Time to snap
 * @param intervalMinutes - Grid interval in minutes (default: 30)
 * @returns Snapped time
 */
export function snapToGrid(time: Date, intervalMinutes = 30): Date {
  const minutes = time.getMinutes()
  const hours = time.getHours()

  // Round to nearest interval
  const roundedMinutes = Math.round(minutes / intervalMinutes) * intervalMinutes

  if (roundedMinutes >= 60) {
    return new Date(
      time.getFullYear(),
      time.getMonth(),
      time.getDate(),
      hours + 1,
      0,
      0,
      0
    )
  }

  return new Date(
    time.getFullYear(),
    time.getMonth(),
    time.getDate(),
    hours,
    roundedMinutes,
    0,
    0
  )
}

/**
 * Snap time down to grid interval (floor)
 * @param time - Time to snap
 * @param intervalMinutes - Grid interval in minutes (default: 30)
 * @returns Snapped time
 */
export function snapToGridFloor(time: Date, intervalMinutes = 30): Date {
  const minutes = time.getMinutes()
  const hours = time.getHours()

  const floorMinutes = Math.floor(minutes / intervalMinutes) * intervalMinutes

  return new Date(
    time.getFullYear(),
    time.getMonth(),
    time.getDate(),
    hours,
    floorMinutes,
    0,
    0
  )
}

/**
 * Snap time up to grid interval (ceiling)
 * @param time - Time to snap
 * @param intervalMinutes - Grid interval in minutes (default: 30)
 * @returns Snapped time
 */
export function snapToGridCeil(time: Date, intervalMinutes = 30): Date {
  const minutes = time.getMinutes()
  const hours = time.getHours()

  const ceilMinutes = Math.ceil(minutes / intervalMinutes) * intervalMinutes

  if (ceilMinutes >= 60) {
    return new Date(
      time.getFullYear(),
      time.getMonth(),
      time.getDate(),
      hours + 1,
      0,
      0,
      0
    )
  }

  return new Date(
    time.getFullYear(),
    time.getMonth(),
    time.getDate(),
    hours,
    ceilMinutes,
    0,
    0
  )
}

/**
 * Detect conflicts between a new event and existing events
 * @param newEvent - New event to check (or partial event with startTime and endTime)
 * @param existingEvents - Array of existing events
 * @param allowSameTimeSlots - Allow events in the same time slot (default: false)
 * @returns Array of conflicting events
 */
export function detectConflicts(
  newEvent: { startTime: Date; endTime: Date; id?: string },
  existingEvents: CalendarEvent[],
  allowSameTimeSlots = false
): CalendarEvent[] {
  const conflicts: CalendarEvent[] = []

  existingEvents.forEach((event) => {
    // Skip if it's the same event (for updates)
    if (newEvent.id && event.id === newEvent.id) {
      return
    }

    // Check for overlap
    if (allowSameTimeSlots) {
      // Strict overlap (events can share boundaries)
      if (
        (newEvent.startTime >= event.startTime && newEvent.startTime < event.endTime) ||
        (newEvent.endTime > event.startTime && newEvent.endTime <= event.endTime) ||
        (newEvent.startTime <= event.startTime && newEvent.endTime >= event.endTime)
      ) {
        conflicts.push(event)
      }
    } else {
      // No overlap allowed at all
      if (newEvent.startTime < event.endTime && newEvent.endTime > event.startTime) {
        conflicts.push(event)
      }
    }
  })

  return conflicts
}

/**
 * Check if there are any conflicts
 * @param newEvent - New event to check
 * @param existingEvents - Array of existing events
 * @returns True if there are conflicts
 */
export function hasConflicts(
  newEvent: { startTime: Date; endTime: Date; id?: string },
  existingEvents: CalendarEvent[]
): boolean {
  return detectConflicts(newEvent, existingEvents).length > 0
}

/**
 * Find next available time slot
 * @param events - Array of existing events
 * @param duration - Duration in minutes
 * @param workingHours - Working hours settings (optional)
 * @param startSearchFrom - Date to start searching from (default: now)
 * @param intervalMinutes - Grid interval in minutes (default: 30)
 * @returns Next available slot or null if not found within reasonable range
 */
export function findNextAvailableSlot(
  events: CalendarEvent[],
  duration: number,
  workingHours?: { dayStartTime: string; dayEndTime: string },
  startSearchFrom?: Date,
  intervalMinutes = 30
): { start: Date; end: Date } | null {
  const searchStart = startSearchFrom ? new Date(startSearchFrom) : new Date()
  const maxDaysToSearch = 30 // Search up to 30 days ahead

  // Default working hours if not provided
  const dayStart = workingHours?.dayStartTime || '06:00'
  const dayEnd = workingHours?.dayEndTime || '22:00'

  const { hours: startHour, minutes: startMinutes } = parseTimeString(dayStart)
  const { hours: endHour, minutes: endMinutes } = parseTimeString(dayEnd)

  // Start searching from the current time or next interval
  let currentSlot = snapToGridCeil(searchStart, intervalMinutes)

  // Search for up to maxDaysToSearch days
  const endSearchDate = addDays(searchStart, maxDaysToSearch)

  while (currentSlot < endSearchDate) {
    // Check if current slot is within working hours
    const slotHour = currentSlot.getHours()
    const slotMinute = currentSlot.getMinutes()

    // Convert times to minutes for comparison
    const slotTime = slotHour * 60 + slotMinute
    const workingStartTime = startHour * 60 + startMinutes
    const workingEndTime = endHour * 60 + endMinutes

    if (slotTime < workingStartTime) {
      // Jump to start of working hours
      currentSlot = new Date(
        currentSlot.getFullYear(),
        currentSlot.getMonth(),
        currentSlot.getDate(),
        startHour,
        startMinutes,
        0,
        0
      )
      continue
    }

    if (slotTime >= workingEndTime) {
      // Jump to next day's start of working hours
      const nextDay = addDays(startOfDay(currentSlot), 1)
      currentSlot = new Date(
        nextDay.getFullYear(),
        nextDay.getMonth(),
        nextDay.getDate(),
        startHour,
        startMinutes,
        0,
        0
      )
      continue
    }

    // Calculate end time for this slot
    const slotEnd = new Date(currentSlot.getTime() + duration * 60 * 1000)

    // Check if slot end is still within working hours
    const slotEndHour = slotEnd.getHours()
    const slotEndMinute = slotEnd.getMinutes()
    const slotEndTime = slotEndHour * 60 + slotEndMinute

    if (slotEndTime > workingEndTime) {
      // Slot extends beyond working hours, jump to next day
      const nextDay = addDays(startOfDay(currentSlot), 1)
      currentSlot = new Date(
        nextDay.getFullYear(),
        nextDay.getMonth(),
        nextDay.getDate(),
        startHour,
        startMinutes,
        0,
        0
      )
      continue
    }

    // Check for conflicts with existing events
    const tempEvent = { startTime: currentSlot, endTime: slotEnd }
    if (!hasConflicts(tempEvent, events)) {
      // Found an available slot!
      return { start: currentSlot, end: slotEnd }
    }

    // Move to next interval
    currentSlot = new Date(currentSlot.getTime() + intervalMinutes * 60 * 1000)
  }

  // No available slot found
  return null
}

/**
 * Check if time is within working hours
 * @param time - Time to check
 * @param settings - Calendar settings with working hours
 * @returns True if within working hours
 */
export function isWithinWorkingHours(time: Date, settings: CalendarSettings): boolean {
  const { dayStartTime, dayEndTime, workingDays } = settings

  // Check if day of week is a working day (0 = Sunday, 6 = Saturday)
  const dayOfWeek = time.getDay()
  if (!workingDays.includes(dayOfWeek)) {
    return false
  }

  // Parse working hours
  const { hours: startHour, minutes: startMinutes } = parseTimeString(dayStartTime)
  const { hours: endHour, minutes: endMinutes } = parseTimeString(dayEndTime)

  // Get time components
  const timeHour = time.getHours()
  const timeMinute = time.getMinutes()

  // Convert to minutes for comparison
  const timeInMinutes = timeHour * 60 + timeMinute
  const startInMinutes = startHour * 60 + startMinutes
  const endInMinutes = endHour * 60 + endMinutes

  return timeInMinutes >= startInMinutes && timeInMinutes < endInMinutes
}

/**
 * Check if time range is within working hours
 * @param startTime - Start time
 * @param endTime - End time
 * @param settings - Calendar settings
 * @returns True if entire range is within working hours
 */
export function isRangeWithinWorkingHours(
  startTime: Date,
  endTime: Date,
  settings: CalendarSettings
): boolean {
  // Check if both start and end are within working hours
  // and they're on the same day
  if (startTime.toDateString() !== endTime.toDateString()) {
    return false
  }

  return (
    isWithinWorkingHours(startTime, settings) && isWithinWorkingHours(endTime, settings)
  )
}

/**
 * Get available time slots for a day
 * @param date - Date to get slots for
 * @param events - Existing events on this day
 * @param settings - Calendar settings
 * @param intervalMinutes - Slot interval in minutes (default: 30)
 * @param minDuration - Minimum slot duration in minutes (default: 30)
 * @returns Array of available time slots
 */
export function getAvailableSlots(
  date: Date,
  events: CalendarEvent[],
  settings: CalendarSettings,
  intervalMinutes = 30,
  minDuration = 30
): Array<{ start: Date; end: Date }> {
  const availableSlots: Array<{ start: Date; end: Date }> = []

  const { dayStartTime, dayEndTime } = settings
  const dayStart = combineDateAndTime(date, dayStartTime)
  const dayEnd = combineDateAndTime(date, dayEndTime)

  let currentTime = dayStart

  while (currentTime < dayEnd) {
    const slotEnd = new Date(currentTime.getTime() + minDuration * 60 * 1000)

    // Check if slot would extend beyond day end
    if (slotEnd > dayEnd) {
      break
    }

    // Check for conflicts
    const tempEvent = { startTime: currentTime, endTime: slotEnd }
    if (!hasConflicts(tempEvent, events)) {
      availableSlots.push({ start: new Date(currentTime), end: new Date(slotEnd) })
    }

    // Move to next interval
    currentTime = new Date(currentTime.getTime() + intervalMinutes * 60 * 1000)
  }

  return availableSlots
}

/**
 * Calculate available time in a day (in minutes)
 * @param date - Date to calculate for
 * @param events - Events on this day
 * @param settings - Calendar settings
 * @returns Available minutes
 */
export function getAvailableTimeInDay(
  date: Date,
  events: CalendarEvent[],
  settings: CalendarSettings
): number {
  const { dayStartTime, dayEndTime } = settings
  const dayStart = combineDateAndTime(date, dayStartTime)
  const dayEnd = combineDateAndTime(date, dayEndTime)

  // Total working minutes in the day
  const totalMinutes = getDurationInMinutes(dayStart, dayEnd)

  // Calculate booked minutes
  let bookedMinutes = 0
  events.forEach((event) => {
    // Only count events on this day and within working hours
    if (
      event.startTime.toDateString() === date.toDateString() &&
      event.startTime >= dayStart &&
      event.endTime <= dayEnd
    ) {
      bookedMinutes += getDurationInMinutes(event.startTime, event.endTime)
    }
  })

  return totalMinutes - bookedMinutes
}

/**
 * Get buffer time around an event
 * @param event - Calendar event
 * @param bufferMinutes - Buffer time in minutes
 * @returns Object with buffered start and end times
 */
export function getEventWithBuffer(
  event: CalendarEvent,
  bufferMinutes: number
): { start: Date; end: Date } {
  return {
    start: new Date(event.startTime.getTime() - bufferMinutes * 60 * 1000),
    end: new Date(event.endTime.getTime() + bufferMinutes * 60 * 1000),
  }
}

/**
 * Check if event respects buffer time with other events
 * @param newEvent - New event to check
 * @param existingEvents - Existing events
 * @param bufferMinutes - Required buffer time in minutes
 * @returns True if buffer is respected
 */
export function hasBufferSpace(
  newEvent: { startTime: Date; endTime: Date; id?: string },
  existingEvents: CalendarEvent[],
  bufferMinutes: number
): boolean {
  const bufferedEvent = {
    startTime: new Date(newEvent.startTime.getTime() - bufferMinutes * 60 * 1000),
    endTime: new Date(newEvent.endTime.getTime() + bufferMinutes * 60 * 1000),
    id: newEvent.id,
  }

  return !hasConflicts(bufferedEvent, existingEvents)
}
