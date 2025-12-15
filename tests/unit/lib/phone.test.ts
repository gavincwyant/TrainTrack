import { describe, it, expect } from 'vitest'
import {
  isValidPhoneNumber,
  formatPhoneToE164,
  formatPhoneForDisplay,
  isUSPhoneNumber,
  maskPhoneNumber,
} from '@/lib/utils/phone'

describe('Phone utilities', () => {
  describe('isValidPhoneNumber()', () => {
    it('should return true for valid 10-digit US numbers', () => {
      expect(isValidPhoneNumber('4155551234')).toBe(true)
      expect(isValidPhoneNumber('(415) 555-1234')).toBe(true)
      expect(isValidPhoneNumber('415-555-1234')).toBe(true)
      expect(isValidPhoneNumber('415.555.1234')).toBe(true)
    })

    it('should return true for valid 11-digit US numbers with country code', () => {
      expect(isValidPhoneNumber('14155551234')).toBe(true)
      expect(isValidPhoneNumber('+1 415 555 1234')).toBe(true)
      expect(isValidPhoneNumber('1-415-555-1234')).toBe(true)
    })

    it('should return true for valid international numbers', () => {
      expect(isValidPhoneNumber('+44 20 7946 0958')).toBe(true) // UK
      expect(isValidPhoneNumber('+81 3 1234 5678')).toBe(true) // Japan
      expect(isValidPhoneNumber('+49 30 123456789')).toBe(true) // Germany
    })

    it('should return false for invalid numbers', () => {
      expect(isValidPhoneNumber('')).toBe(false)
      expect(isValidPhoneNumber(null)).toBe(false)
      expect(isValidPhoneNumber(undefined)).toBe(false)
      expect(isValidPhoneNumber('123')).toBe(false)
      expect(isValidPhoneNumber('12345')).toBe(false)
      expect(isValidPhoneNumber('123456789')).toBe(false) // 9 digits
    })

    it('should return false for numbers exceeding max length', () => {
      expect(isValidPhoneNumber('1234567890123456')).toBe(false) // 16 digits
    })
  })

  describe('formatPhoneToE164()', () => {
    it('should format 10-digit US numbers with +1 prefix', () => {
      expect(formatPhoneToE164('4155551234')).toBe('+14155551234')
      expect(formatPhoneToE164('(415) 555-1234')).toBe('+14155551234')
      expect(formatPhoneToE164('415-555-1234')).toBe('+14155551234')
      expect(formatPhoneToE164('415.555.1234')).toBe('+14155551234')
    })

    it('should format 11-digit US numbers with + prefix', () => {
      expect(formatPhoneToE164('14155551234')).toBe('+14155551234')
      expect(formatPhoneToE164('1-415-555-1234')).toBe('+14155551234')
    })

    it('should preserve numbers already in E.164 format', () => {
      expect(formatPhoneToE164('+14155551234')).toBe('+14155551234')
      expect(formatPhoneToE164('+442079460958')).toBe('+442079460958')
    })

    it('should add + prefix to international numbers without it', () => {
      expect(formatPhoneToE164('442079460958')).toBe('+442079460958')
    })
  })

  describe('formatPhoneForDisplay()', () => {
    it('should format 10-digit US numbers as (XXX) XXX-XXXX', () => {
      expect(formatPhoneForDisplay('4155551234')).toBe('(415) 555-1234')
      expect(formatPhoneForDisplay('(415)555-1234')).toBe('(415) 555-1234')
    })

    it('should format 11-digit US numbers as (XXX) XXX-XXXX', () => {
      expect(formatPhoneForDisplay('14155551234')).toBe('(415) 555-1234')
      expect(formatPhoneForDisplay('+14155551234')).toBe('(415) 555-1234')
    })

    it('should return original for international numbers', () => {
      expect(formatPhoneForDisplay('+442079460958')).toBe('+442079460958')
    })

    it('should return empty string for null/undefined', () => {
      expect(formatPhoneForDisplay(null)).toBe('')
      expect(formatPhoneForDisplay(undefined)).toBe('')
    })
  })

  describe('isUSPhoneNumber()', () => {
    it('should return true for 10-digit numbers', () => {
      expect(isUSPhoneNumber('4155551234')).toBe(true)
      expect(isUSPhoneNumber('(415) 555-1234')).toBe(true)
    })

    it('should return true for 11-digit numbers starting with 1', () => {
      expect(isUSPhoneNumber('14155551234')).toBe(true)
      expect(isUSPhoneNumber('+1 415 555 1234')).toBe(true)
    })

    it('should return false for non-US numbers', () => {
      expect(isUSPhoneNumber('442079460958')).toBe(false)
      expect(isUSPhoneNumber('+44 20 7946 0958')).toBe(false)
    })
  })

  describe('maskPhoneNumber()', () => {
    it('should mask phone number showing only last 4 digits', () => {
      expect(maskPhoneNumber('4155551234')).toBe('(***) ***-1234')
      expect(maskPhoneNumber('(415) 555-1234')).toBe('(***) ***-1234')
      expect(maskPhoneNumber('+14155551234')).toBe('(***) ***-1234')
    })

    it('should handle short numbers', () => {
      expect(maskPhoneNumber('123')).toBe('****')
      expect(maskPhoneNumber('12')).toBe('****')
    })

    it('should return empty string for null/undefined', () => {
      expect(maskPhoneNumber(null)).toBe('')
      expect(maskPhoneNumber(undefined)).toBe('')
    })
  })
})
