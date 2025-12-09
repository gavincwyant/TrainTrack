import {
  format,
  addDays as dateFnsAddDays,
  addWeeks as dateFnsAddWeeks,
  addMonths as dateFnsAddMonths,
  startOfDay as dateFnsStartOfDay,
  endOfDay as dateFnsEndOfDay,
  startOfWeek as dateFnsStartOfWeek,
  endOfWeek as dateFnsEndOfWeek,
  startOfMonth,
  endOfMonth,
  isSameDay as dateFnsIsSameDay,
  isWithinInterval,
  eachDayOfInterval,
  getWeek,
  getDay,
} from 'date-fns'
import type { CalendarDay, CalendarWeek, CalendarMonth } from '../types/calendar'

/**
 * Get all days in a month with metadata
 * @param year - The year
 * @param month - The month (0-11)
 * @returns Calendar month with weeks and days
 */
export function getMonthDays(year: number, month: number): CalendarMonth {
  const date = new Date(year, month, 1)
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)

  // Get the first day to display (start of week containing first day of month)
  const calendarStart = dateFnsStartOfWeek(monthStart, { weekStartsOn: 0 })
  // Get the last day to display (end of week containing last day of month)
  const calendarEnd = dateFnsEndOfWeek(monthEnd, { weekStartsOn: 0 })

  const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  // Group days into weeks
  const weeks: CalendarWeek[] = []
  let currentWeek: CalendarDay[] = []
  let currentWeekNumber = getWeek(allDays[0])

  allDays.forEach((day) => {
    const weekNumber = getWeek(day)

    if (weekNumber !== currentWeekNumber && currentWeek.length > 0) {
      weeks.push({
        weekNumber: currentWeekNumber,
        days: currentWeek,
        startDate: currentWeek[0].date,
        endDate: currentWeek[currentWeek.length - 1].date,
      })
      currentWeek = []
      currentWeekNumber = weekNumber
    }

    currentWeek.push({
      date: day,
      isToday: isToday(day),
      isCurrentMonth: day.getMonth() === month,
      isPast: day < dateFnsStartOfDay(new Date()),
      events: [],
      slots: [],
    })
  })

  // Add the last week
  if (currentWeek.length > 0) {
    weeks.push({
      weekNumber: currentWeekNumber,
      days: currentWeek,
      startDate: currentWeek[0].date,
      endDate: currentWeek[currentWeek.length - 1].date,
    })
  }

  return {
    month,
    year,
    weeks,
    totalDays: allDays.length,
  }
}

/**
 * Get days in a week starting from date
 * @param date - Starting date
 * @returns Array of 7 days starting from the beginning of the week
 */
export function getWeekDays(date: Date): CalendarDay[] {
  const weekStart = dateFnsStartOfWeek(date, { weekStartsOn: 0 })
  const days: CalendarDay[] = []

  for (let i = 0; i < 7; i++) {
    const day = dateFnsAddDays(weekStart, i)
    days.push({
      date: day,
      isToday: isToday(day),
      isCurrentMonth: day.getMonth() === date.getMonth(),
      isPast: day < dateFnsStartOfDay(new Date()),
      events: [],
      slots: [],
    })
  }

  return days
}

/**
 * Compare if two dates are the same day
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return dateFnsIsSameDay(date1, date2)
}

/**
 * Check if date is today
 * @param date - Date to check
 * @returns True if date is today
 */
export function isToday(date: Date): boolean {
  return dateFnsIsSameDay(date, new Date())
}

/**
 * Check if date is within a range (inclusive)
 * @param date - Date to check
 * @param start - Start of range
 * @param end - End of range
 * @returns True if date is within range
 */
export function isWithinRange(date: Date, start: Date, end: Date): boolean {
  return isWithinInterval(date, { start, end })
}

/**
 * Format time as "2:00 PM"
 * @param date - Date to format
 * @returns Formatted time string
 */
export function formatTime(date: Date): string {
  return format(date, 'h:mm a')
}

/**
 * Format date as "Mon, Dec 9"
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  return format(date, 'EEE, MMM d')
}

/**
 * Format date as "Monday, December 9, 2024"
 * @param date - Date to format
 * @returns Formatted long date string
 */
export function formatLongDate(date: Date): string {
  return format(date, 'EEEE, MMMM d, yyyy')
}

/**
 * Format date as "Dec 9"
 * @param date - Date to format
 * @returns Formatted short date string
 */
export function formatShortDate(date: Date): string {
  return format(date, 'MMM d')
}

/**
 * Format date as "12/09/2024"
 * @param date - Date to format
 * @returns Formatted numeric date string
 */
export function formatNumericDate(date: Date): string {
  return format(date, 'MM/dd/yyyy')
}

/**
 * Generate time slots for a day
 * @param startHour - Starting hour (0-23)
 * @param endHour - Ending hour (0-23)
 * @param intervalMinutes - Interval in minutes (default: 30)
 * @returns Array of time slot dates
 */
export function getTimeSlots(
  startHour: number,
  endHour: number,
  intervalMinutes = 30
): Date[] {
  const slots: Date[] = []
  const today = new Date()
  const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startHour, 0, 0)
  const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endHour, 0, 0)

  let currentSlot = startDate
  while (currentSlot <= endDate) {
    slots.push(new Date(currentSlot))
    currentSlot = new Date(currentSlot.getTime() + intervalMinutes * 60 * 1000)
  }

  return slots
}

/**
 * Add days to a date
 * @param date - Starting date
 * @param amount - Number of days to add (can be negative)
 * @returns New date
 */
export function addDays(date: Date, amount: number): Date {
  return dateFnsAddDays(date, amount)
}

/**
 * Add weeks to a date
 * @param date - Starting date
 * @param amount - Number of weeks to add (can be negative)
 * @returns New date
 */
export function addWeeks(date: Date, amount: number): Date {
  return dateFnsAddWeeks(date, amount)
}

/**
 * Add months to a date
 * @param date - Starting date
 * @param amount - Number of months to add (can be negative)
 * @returns New date
 */
export function addMonths(date: Date, amount: number): Date {
  return dateFnsAddMonths(date, amount)
}

/**
 * Get start of day (00:00:00.000)
 * @param date - Date
 * @returns Start of day
 */
export function startOfDay(date: Date): Date {
  return dateFnsStartOfDay(date)
}

/**
 * Get end of day (23:59:59.999)
 * @param date - Date
 * @returns End of day
 */
export function endOfDay(date: Date): Date {
  return dateFnsEndOfDay(date)
}

/**
 * Get start of week (Sunday 00:00:00.000)
 * @param date - Date
 * @returns Start of week
 */
export function startOfWeek(date: Date): Date {
  return dateFnsStartOfWeek(date, { weekStartsOn: 0 })
}

/**
 * Get end of week (Saturday 23:59:59.999)
 * @param date - Date
 * @returns End of week
 */
export function endOfWeek(date: Date): Date {
  return dateFnsEndOfWeek(date, { weekStartsOn: 0 })
}

/**
 * Parse time string (HH:mm) to hours and minutes
 * @param timeString - Time string in format "HH:mm" (e.g., "09:30")
 * @returns Object with hours and minutes
 */
export function parseTimeString(timeString: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeString.split(':').map(Number)
  return { hours, minutes }
}

/**
 * Combine date and time string into a single Date object
 * @param date - Date
 * @param timeString - Time string in format "HH:mm"
 * @returns Combined date and time
 */
export function combineDateAndTime(date: Date, timeString: string): Date {
  const { hours, minutes } = parseTimeString(timeString)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0)
}

/**
 * Get day of week (0 = Sunday, 6 = Saturday)
 * @param date - Date
 * @returns Day of week number
 */
export function getDayOfWeek(date: Date): number {
  return getDay(date)
}

/**
 * Check if date is a weekend
 * @param date - Date to check
 * @returns True if Saturday or Sunday
 */
export function isWeekend(date: Date): boolean {
  const day = getDayOfWeek(date)
  return day === 0 || day === 6
}

/**
 * Get minutes from midnight for a date
 * @param date - Date
 * @returns Minutes from midnight
 */
export function getMinutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

/**
 * Get duration in minutes between two dates
 * @param start - Start date
 * @param end - End date
 * @returns Duration in minutes
 */
export function getDurationInMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60))
}

/**
 * Format duration in minutes to human readable format
 * @param minutes - Duration in minutes
 * @returns Formatted string (e.g., "1h 30m", "45m")
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return `${hours}h`
  }

  return `${hours}h ${remainingMinutes}m`
}

/**
 * Check if two date ranges overlap
 * @param start1 - Start of first range
 * @param end1 - End of first range
 * @param start2 - Start of second range
 * @param end2 - End of second range
 * @returns True if ranges overlap
 */
export function doDateRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && end1 > start2
}

/**
 * Get the current time rounded to the nearest interval
 * @param intervalMinutes - Interval in minutes (default: 30)
 * @returns Rounded current time
 */
export function getCurrentTimeRounded(intervalMinutes = 30): Date {
  const now = new Date()
  const minutes = now.getMinutes()
  const roundedMinutes = Math.ceil(minutes / intervalMinutes) * intervalMinutes

  if (roundedMinutes >= 60) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0)
  }

  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), roundedMinutes, 0, 0)
}
