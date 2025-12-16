import { describe, it, expect } from 'vitest'
import {
  groupByDatePeriod,
  fillMissingDates,
  calculatePercentageChange,
  getStartDate,
  DateRange,
} from '@/lib/utils/analytics'

describe('Analytics Utilities', () => {
  describe('groupByDatePeriod', () => {
    describe('week range', () => {
      it('should group items by day (MMM dd format)', () => {
        const items = [
          { createdAt: new Date('2025-01-15T10:00:00Z'), value: 100 },
          { createdAt: new Date('2025-01-15T14:00:00Z'), value: 200 },
          { createdAt: new Date('2025-01-16T09:00:00Z'), value: 150 },
        ]

        const result = groupByDatePeriod(items, 'week')

        expect(Object.keys(result)).toHaveLength(2)
        expect(result['Jan 15']).toHaveLength(2)
        expect(result['Jan 16']).toHaveLength(1)
      })
    })

    describe('month range', () => {
      it('should group items by day (MMM dd format)', () => {
        const items = [
          { createdAt: new Date('2025-01-01T10:00:00Z'), value: 100 },
          { createdAt: new Date('2025-01-15T14:00:00Z'), value: 200 },
          { createdAt: new Date('2025-01-31T09:00:00Z'), value: 150 },
        ]

        const result = groupByDatePeriod(items, 'month')

        expect(Object.keys(result)).toHaveLength(3)
        expect(result['Jan 01']).toHaveLength(1)
        expect(result['Jan 15']).toHaveLength(1)
        expect(result['Jan 31']).toHaveLength(1)
      })
    })

    describe('year range', () => {
      it('should group items by month (MMM yyyy format)', () => {
        const items = [
          { createdAt: new Date('2025-01-15T10:00:00Z'), value: 100 },
          { createdAt: new Date('2025-01-20T14:00:00Z'), value: 200 },
          { createdAt: new Date('2025-03-10T09:00:00Z'), value: 150 },
          { createdAt: new Date('2025-06-05T11:00:00Z'), value: 300 },
        ]

        const result = groupByDatePeriod(items, 'year')

        expect(Object.keys(result)).toHaveLength(3)
        expect(result['Jan 2025']).toHaveLength(2)
        expect(result['Mar 2025']).toHaveLength(1)
        expect(result['Jun 2025']).toHaveLength(1)
      })
    })

    it('should return empty object for empty input', () => {
      const result = groupByDatePeriod([], 'week')

      expect(result).toEqual({})
    })

    it('should handle items with same timestamp', () => {
      const items = [
        { createdAt: new Date('2025-01-15T10:00:00Z'), value: 100 },
        { createdAt: new Date('2025-01-15T10:00:00Z'), value: 200 },
        { createdAt: new Date('2025-01-15T10:00:00Z'), value: 300 },
      ]

      const result = groupByDatePeriod(items, 'week')

      expect(result['Jan 15']).toHaveLength(3)
    })
  })

  describe('fillMissingDates', () => {
    describe('week/month range', () => {
      it('should fill missing days with empty objects', () => {
        const data: Record<string, { value: number }> = {
          'Jan 15': { value: 100 },
          'Jan 17': { value: 200 },
        }

        // Use noon local time to avoid timezone edge cases
        const result = fillMissingDates(
          data,
          'week',
          new Date(2025, 0, 15, 12, 0, 0), // Jan 15, 2025 noon local
          new Date(2025, 0, 17, 12, 0, 0)  // Jan 17, 2025 noon local
        )

        expect(result).toHaveLength(3)
        expect(result[0]).toEqual({ date: 'Jan 15', value: 100 })
        expect(result[1]).toEqual({ date: 'Jan 16' }) // Missing day filled
        expect(result[2]).toEqual({ date: 'Jan 17', value: 200 })
      })

      it('should preserve all properties from original data', () => {
        const data: Record<string, { value: number; count: number }> = {
          'Jan 15': { value: 100, count: 5 },
        }

        const result = fillMissingDates(
          data,
          'week',
          new Date(2025, 0, 15, 12, 0, 0), // Jan 15, 2025 noon local
          new Date(2025, 0, 15, 12, 0, 0)  // Jan 15, 2025 noon local
        )

        expect(result[0]).toEqual({ date: 'Jan 15', value: 100, count: 5 })
      })
    })

    describe('year range', () => {
      it('should fill missing months with empty objects', () => {
        const data: Record<string, { value: number }> = {
          'Jan 2025': { value: 100 },
          'Mar 2025': { value: 200 },
        }

        // Use noon local time to avoid timezone edge cases
        const result = fillMissingDates(
          data,
          'year',
          new Date(2025, 0, 15, 12, 0, 0), // Jan 15, 2025 noon local
          new Date(2025, 2, 15, 12, 0, 0)  // Mar 15, 2025 noon local
        )

        expect(result).toHaveLength(3)
        expect(result[0]).toEqual({ date: 'Jan 2025', value: 100 })
        expect(result[1]).toEqual({ date: 'Feb 2025' }) // Missing month filled
        expect(result[2]).toEqual({ date: 'Mar 2025', value: 200 })
      })
    })

    it('should handle empty data', () => {
      const result = fillMissingDates(
        {},
        'week',
        new Date(2025, 0, 15, 12, 0, 0), // Jan 15, 2025 noon local
        new Date(2025, 0, 17, 12, 0, 0)  // Jan 17, 2025 noon local
      )

      expect(result).toHaveLength(3)
      expect(result.every(item => Object.keys(item).length === 1)).toBe(true)
    })
  })

  describe('calculatePercentageChange', () => {
    it('should calculate positive percentage change', () => {
      const result = calculatePercentageChange(150, 100)

      expect(result).toBe(50)
    })

    it('should calculate negative percentage change', () => {
      const result = calculatePercentageChange(50, 100)

      expect(result).toBe(-50)
    })

    it('should return 0 when both values are 0', () => {
      const result = calculatePercentageChange(0, 0)

      expect(result).toBe(0)
    })

    it('should return 100 when previous is 0 and current is positive', () => {
      const result = calculatePercentageChange(100, 0)

      expect(result).toBe(100)
    })

    it('should return 0 when previous is 0 and current is also 0', () => {
      const result = calculatePercentageChange(0, 0)

      expect(result).toBe(0)
    })

    it('should handle decimal values', () => {
      const result = calculatePercentageChange(75, 50)

      expect(result).toBe(50)
    })

    it('should handle 100% decrease', () => {
      const result = calculatePercentageChange(0, 100)

      expect(result).toBe(-100)
    })

    it('should handle doubling (100% increase)', () => {
      const result = calculatePercentageChange(200, 100)

      expect(result).toBe(100)
    })

    it('should handle tripling (200% increase)', () => {
      const result = calculatePercentageChange(300, 100)

      expect(result).toBe(200)
    })
  })

  describe('getStartDate', () => {
    // Use a fixed reference date for consistent testing
    const referenceDate = new Date('2025-06-15T12:00:00Z')

    describe('week range', () => {
      it('should return date 7 days ago', () => {
        const result = getStartDate('week', referenceDate)

        expect(result.getDate()).toBe(8) // June 8
        expect(result.getMonth()).toBe(5) // June (0-indexed)
        expect(result.getFullYear()).toBe(2025)
      })

      it('should set time to start of day', () => {
        const result = getStartDate('week', referenceDate)

        expect(result.getHours()).toBe(0)
        expect(result.getMinutes()).toBe(0)
        expect(result.getSeconds()).toBe(0)
        expect(result.getMilliseconds()).toBe(0)
      })
    })

    describe('month range', () => {
      it('should return date 30 days ago', () => {
        const result = getStartDate('month', referenceDate)

        expect(result.getDate()).toBe(16) // May 16
        expect(result.getMonth()).toBe(4) // May (0-indexed)
        expect(result.getFullYear()).toBe(2025)
      })
    })

    describe('year range', () => {
      it('should return date 365 days ago', () => {
        const result = getStartDate('year', referenceDate)

        expect(result.getDate()).toBe(15) // June 15, 2024
        expect(result.getMonth()).toBe(5) // June (0-indexed)
        expect(result.getFullYear()).toBe(2024)
      })
    })

    it('should use current date when no reference provided', () => {
      const before = new Date()
      const result = getStartDate('week')
      const after = new Date()

      // Result should be 7 days before the time when function was called
      const expectedStart = new Date(before)
      expectedStart.setDate(before.getDate() - 7)
      expectedStart.setHours(0, 0, 0, 0)

      // Allow small time difference due to execution
      expect(result.getTime()).toBeGreaterThanOrEqual(expectedStart.getTime() - 1000)
      expect(result.getTime()).toBeLessThanOrEqual(
        new Date(after.getTime() - 7 * 24 * 60 * 60 * 1000).getTime() + 1000
      )
    })

    it('should handle month boundary correctly', () => {
      // Testing when 7 days ago crosses month boundary
      const jan5 = new Date('2025-01-05T12:00:00Z')
      const result = getStartDate('week', jan5)

      expect(result.getMonth()).toBe(11) // December
      expect(result.getFullYear()).toBe(2024)
      expect(result.getDate()).toBe(29) // Dec 29
    })

    it('should handle year boundary correctly', () => {
      // Testing when 30 days ago crosses year boundary
      const jan15 = new Date('2025-01-15T12:00:00Z')
      const result = getStartDate('month', jan15)

      expect(result.getMonth()).toBe(11) // December
      expect(result.getFullYear()).toBe(2024)
    })

    it('should handle leap year correctly', () => {
      // 2024 is a leap year (has Feb 29)
      const mar15_2024 = new Date('2024-03-15T12:00:00Z')
      const result = getStartDate('month', mar15_2024)

      expect(result.getMonth()).toBe(1) // February
      expect(result.getFullYear()).toBe(2024)
      expect(result.getDate()).toBe(14) // Feb 14, 2024
    })
  })
})
