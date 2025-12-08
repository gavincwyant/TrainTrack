import { format, eachDayOfInterval, eachMonthOfInterval } from "date-fns"

export type DateRange = "week" | "month" | "year"

/**
 * Group items by date period based on the selected range
 */
export function groupByDatePeriod<T extends { createdAt: Date }>(
  items: T[],
  range: DateRange
): Record<string, T[]> {
  const groups: Record<string, T[]> = {}

  items.forEach((item) => {
    const key = getDateKey(item.createdAt, range)
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(item)
  })

  return groups
}

/**
 * Get the date key for grouping based on range
 * Week/Month: Group by day (MMM dd)
 * Year: Group by month (MMM yyyy)
 */
function getDateKey(date: Date, range: DateRange): string {
  switch (range) {
    case "week":
    case "month":
      return format(date, "MMM dd")  // "Jan 01"
    case "year":
      return format(date, "MMM yyyy")  // "Jan 2024"
  }
}

/**
 * Fill in missing dates with zero values for continuous chart display
 */
export function fillMissingDates<T extends Record<string, unknown>>(
  data: Record<string, T>,
  range: DateRange,
  startDate: Date,
  endDate: Date = new Date()
): Array<{ date: string } & Partial<T>> {
  const filled: Array<{ date: string } & Partial<T>> = []

  if (range === "year") {
    // For year view, fill by month
    const months = eachMonthOfInterval({ start: startDate, end: endDate })
    months.forEach((month) => {
      const key = format(month, "MMM yyyy")
      filled.push({
        date: key,
        ...(data[key] || {}),
      })
    })
  } else {
    // For week/month view, fill by day
    const days = eachDayOfInterval({ start: startDate, end: endDate })
    days.forEach((day) => {
      const key = format(day, "MMM dd")
      filled.push({
        date: key,
        ...(data[key] || {}),
      })
    })
  }

  return filled
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(
  current: number,
  previous: number
): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

/**
 * Get start date for the selected range
 */
export function getStartDate(range: DateRange, now: Date = new Date()): Date {
  const startDate = new Date(now)
  startDate.setHours(0, 0, 0, 0) // Start of day

  switch (range) {
    case "week":
      // Last 7 days (rolling window)
      startDate.setDate(now.getDate() - 7)
      return startDate
    case "month":
      // Last 30 days (rolling window)
      startDate.setDate(now.getDate() - 30)
      return startDate
    case "year":
      // Last 365 days (rolling window)
      startDate.setDate(now.getDate() - 365)
      return startDate
  }
}
