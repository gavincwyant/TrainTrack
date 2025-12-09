"use client"

import { useMemo } from 'react'

export interface ParsedInput {
  client?: string
  time?: string
  date?: string
  duration?: string
  action?: 'schedule' | 'block' | 'cancel' | 'view'
  confidence: number
  raw: string
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const TIME_KEYWORDS = ['am', 'pm', 'min', 'hr', 'hour', 'hours', 'minutes']
const ACTION_KEYWORDS = {
  schedule: ['schedule', 'book', 'create', 'add'],
  block: ['block', 'busy', 'unavailable'],
  cancel: ['cancel', 'delete', 'remove'],
  view: ['view', 'show', 'see', 'go to'],
}

export function useNaturalLanguageParse(input: string): ParsedInput {
  const parsed = useMemo(() => {
    if (!input.trim()) {
      return {
        raw: input,
        confidence: 0,
      }
    }

    const lowerInput = input.toLowerCase()
    let confidence = 0
    let client: string | undefined
    let time: string | undefined
    let date: string | undefined
    let duration: string | undefined
    let action: ParsedInput['action']

    // Extract action
    for (const [key, keywords] of Object.entries(ACTION_KEYWORDS)) {
      if (keywords.some(keyword => lowerInput.includes(keyword))) {
        action = key as ParsedInput['action']
        confidence += 0.2
        break
      }
    }

    // Extract client name (assuming it's at the start, before time/date)
    const clientMatch = input.match(/^([a-z\s]+?)(?=\s+\d|\s+at|\s+on|\s+today|\s+tomorrow|\s+next|\s+monday|\s+tuesday|\s+wednesday|\s+thursday|\s+friday|\s+saturday|\s+sunday)/i)
    if (clientMatch) {
      client = clientMatch[1].trim()
      confidence += 0.3
    }

    // Extract time (12:00, 2pm, 14:00, 2:30pm)
    const timeMatch = input.match(/\b(\d{1,2})(:(\d{2}))?\s*(am|pm)?\b/i)
    if (timeMatch) {
      let hours = parseInt(timeMatch[1])
      const minutes = timeMatch[3] || '00'
      const meridiem = timeMatch[4]?.toLowerCase()

      // Convert to 24-hour format if needed
      if (meridiem === 'pm' && hours !== 12) {
        hours += 12
      } else if (meridiem === 'am' && hours === 12) {
        hours = 0
      }

      time = `${String(hours).padStart(2, '0')}:${minutes}`
      confidence += 0.25
    }

    // Extract date
    // Check for relative dates
    if (lowerInput.includes('today')) {
      date = 'today'
      confidence += 0.25
    } else if (lowerInput.includes('tomorrow')) {
      date = 'tomorrow'
      confidence += 0.25
    } else if (lowerInput.includes('next week')) {
      date = 'next week'
      confidence += 0.2
    } else {
      // Check for day names
      for (const day of DAYS) {
        if (lowerInput.includes(day)) {
          date = lowerInput.includes('next') ? `next ${day}` : day
          confidence += 0.2
          break
        }
      }
    }

    // Check for specific dates (Dec 15, 12/15, 2024-12-15)
    const specificDateMatch = input.match(/\b([A-Z][a-z]{2,8})\s+(\d{1,2})\b|\b(\d{1,2})\/(\d{1,2})\b|\b(\d{4})-(\d{2})-(\d{2})\b/i)
    if (specificDateMatch && !date) {
      date = specificDateMatch[0]
      confidence += 0.25
    }

    // Extract duration (30min, 1hr, 90 minutes)
    const durationMatch = input.match(/\b(\d+)\s*(min|minutes|hr|hour|hours)\b/i)
    if (durationMatch) {
      duration = durationMatch[0]
      confidence += 0.15
    }

    // Boost confidence if we have a coherent combination
    if (client && time && date) {
      confidence = Math.min(confidence + 0.2, 1.0)
    }

    return {
      client,
      time,
      date,
      duration,
      action,
      confidence: Math.min(confidence, 1.0),
      raw: input,
    }
  }, [input])

  return parsed
}

// Helper function to convert parsed date to actual Date object
export function parseDateString(dateStr: string): Date {
  const now = new Date()
  const lowerDate = dateStr.toLowerCase()

  if (lowerDate === 'today') {
    return now
  }

  if (lowerDate === 'tomorrow') {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow
  }

  if (lowerDate === 'next week') {
    const nextWeek = new Date(now)
    nextWeek.setDate(nextWeek.getDate() + 7)
    return nextWeek
  }

  // Day names
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  for (let i = 0; i < days.length; i++) {
    if (lowerDate.includes(days[i])) {
      const targetDay = new Date(now)
      const currentDay = now.getDay()
      const daysUntilTarget = (i - currentDay + 7) % 7 || 7

      // If it says "next", add 7 more days
      if (lowerDate.includes('next')) {
        targetDay.setDate(targetDay.getDate() + daysUntilTarget + 7)
      } else {
        targetDay.setDate(targetDay.getDate() + daysUntilTarget)
      }

      return targetDay
    }
  }

  // Try to parse as a date string
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) {
    return parsed
  }

  // Default to today if we can't parse
  return now
}

// Helper function to parse duration string to minutes
export function parseDuration(durationStr: string): number {
  const match = durationStr.match(/(\d+)\s*(min|minutes|hr|hour|hours)/i)
  if (!match) return 60 // Default 1 hour

  const value = parseInt(match[1])
  const unit = match[2].toLowerCase()

  if (unit.startsWith('hr') || unit.startsWith('hour')) {
    return value * 60
  }

  return value
}
