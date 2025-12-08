/**
 * Client Extraction Service
 *
 * Extracts potential client names from calendar events and validates
 * whether they represent actual human clients vs meetings/blocked time.
 */

import { calendar_v3 } from "googleapis"

type GoogleCalendarEvent = calendar_v3.Schema$Event

export interface ExtractedClient {
  name: string
  email?: string
  phone?: string
  confidence: "high" | "medium" | "low"
  confidenceScore: number
  reason: string
  sourceEventId: string
}

/**
 * Blacklist patterns for non-client events
 * These patterns indicate events that should be ignored
 */
const BLACKLIST_PATTERNS = [
  // Meetings & general events
  /\b(team|staff|group|all[- ]hands)\s+(meeting|sync|standup|huddle)\b/i,
  /\b(meeting|sync|standup|huddle|review)\b/i,
  /\b(1[:-]1|one[- ]on[- ]one)\s+(meeting|sync)\b/i,

  // Meal times
  /\b(breakfast|lunch|dinner|coffee|snack)\b/i,

  // Work routines
  /\b(daily|weekly|monthly|quarterly)\s+(sync|standup|review|planning)\b/i,
  /\b(sprint|scrum|retro|retrospective|planning)\b/i,
  /\b(interview|onboarding|offboarding)\b/i,
  /\b(office\s+hours?)\b/i,

  // Generic workout terms without names
  /^(workout|training|session|personal\s+training|pt\s+session)$/i,
  /^(hiit|cardio|strength|yoga|pilates|crossfit)$/i,

  // Time blocking
  /\b(blocked?|busy|unavailable|hold|do\s+not\s+book)\b/i,
  /\b(vacation|pto|out\s+of\s+office|ooo|holiday|time\s+off)\b/i,
  /\b(focus\s+time|deep\s+work|admin\s+time)\b/i,

  // Personal events
  /\b(doctor|dentist|appointment|errand|personal)\b/i,

  // Commonly capitalized generic terms
  /^(available|availability|open\s+slot|free\s+time)$/i,
]

/**
 * Common prefixes to strip from event titles
 */
const COMMON_PREFIXES = [
  /^(training|session|workout|pt|personal\s+training)[\s:-]+/i,
  /^(client|with)[\s:-]+/i,
]

export class ClientExtractionService {
  /**
   * Extract potential client information from a calendar event
   */
  extractClientFromEvent(event: GoogleCalendarEvent): ExtractedClient | null {
    const title = event.summary?.trim()
    if (!title) {
      return null
    }

    // Check blacklist patterns first
    if (this.isBlacklistedPattern(title)) {
      return null
    }

    // Extract name from title
    const extractedName = this.extractNameFromTitle(title)
    if (!extractedName) {
      return null
    }

    // Validate it's a likely human name
    if (!this.isLikelyHumanName(extractedName)) {
      return null
    }

    // Extract email from attendees
    const extractedEmail = this.extractEmailFromEvent(event)

    // Calculate confidence
    const context = {
      name: extractedName,
      email: extractedEmail,
      hasAttendees: (event.attendees?.length ?? 0) > 0,
      attendeeCount: event.attendees?.length ?? 0,
      hasDescription: !!event.description,
    }

    const { confidence, score, reason } = this.calculateConfidence(context)

    return {
      name: extractedName,
      email: extractedEmail,
      confidence,
      confidenceScore: score,
      reason,
      sourceEventId: event.id || "",
    }
  }

  /**
   * Check if event title matches blacklist patterns
   */
  private isBlacklistedPattern(title: string): boolean {
    return BLACKLIST_PATTERNS.some((pattern) => pattern.test(title))
  }

  /**
   * Extract name from event title by removing common prefixes
   */
  private extractNameFromTitle(title: string): string | null {
    let processed = title.trim()

    // Remove common prefixes
    for (const prefix of COMMON_PREFIXES) {
      processed = processed.replace(prefix, "").trim()
    }

    // If nothing left after removing prefixes, return null
    if (!processed) {
      return null
    }

    return processed
  }

  /**
   * Validate that extracted text is likely a human name
   */
  private isLikelyHumanName(name: string): boolean {
    // Length check: 2-50 characters
    if (name.length < 2 || name.length > 50) {
      return false
    }

    // Must contain at least one letter
    if (!/[a-zA-Z\u00C0-\u017F]/.test(name)) {
      return false
    }

    // Cannot be all uppercase or all lowercase (except single word names)
    const words = name.split(/\s+/)
    if (words.length > 1) {
      const allUpper = words.every((w) => w === w.toUpperCase())
      const allLower = words.every((w) => w === w.toLowerCase())
      if (allUpper || allLower) {
        return false
      }
    }

    // Reject if contains common non-name patterns
    const nonNamePatterns = [
      /^\d+$/, // All numbers
      /^[^a-zA-Z\u00C0-\u017F\s'-]+$/, // No letters at all
      /\b(session|workout|training|meeting|call)\b/i, // Still contains workout terms
    ]

    return !nonNamePatterns.some((pattern) => pattern.test(name))
  }

  /**
   * Extract email from event attendees
   * Excludes the trainer's own email
   */
  private extractEmailFromEvent(event: GoogleCalendarEvent): string | null {
    if (!event.attendees || event.attendees.length === 0) {
      return null
    }

    // Filter out the organizer and responseStatus='declined'
    const potentialClientAttendees = event.attendees.filter(
      (attendee) =>
        !attendee.organizer && attendee.responseStatus !== "declined"
    )

    // If exactly one non-organizer attendee, use their email
    if (potentialClientAttendees.length === 1) {
      return potentialClientAttendees[0].email || null
    }

    // If multiple attendees, it's likely a group event - skip email extraction
    return null
  }

  /**
   * Calculate confidence score and level
   *
   * Scoring matrix:
   * - Email from attendees: +30 points
   * - 2+ word name: +20 points
   * - Has attendees: +15 points
   * - Has description: +10 points
   * - 1-on-1 meeting (2 attendees): +15 points
   *
   * Confidence levels:
   * - High: 60+
   * - Medium: 30-59
   * - Low: 0-29
   */
  private calculateConfidence(context: {
    name: string
    email?: string
    hasAttendees: boolean
    attendeeCount: number
    hasDescription: boolean
  }): {
    confidence: "high" | "medium" | "low"
    score: number
    reason: string
  } {
    let score = 0
    const reasons: string[] = []

    // Email from attendees
    if (context.email) {
      score += 30
      reasons.push("email found in attendees")
    }

    // 2+ word name (likely first + last name)
    const wordCount = context.name.split(/\s+/).length
    if (wordCount >= 2) {
      score += 20
      reasons.push(`${wordCount}-word name`)
    }

    // Has attendees
    if (context.hasAttendees) {
      score += 15
      reasons.push("has attendees")
    }

    // 1-on-1 meeting (trainer + client)
    if (context.attendeeCount === 2) {
      score += 15
      reasons.push("1-on-1 meeting")
    }

    // Has description
    if (context.hasDescription) {
      score += 10
      reasons.push("has description")
    }

    // Determine confidence level
    let confidence: "high" | "medium" | "low"
    if (score >= 60) {
      confidence = "high"
    } else if (score >= 30) {
      confidence = "medium"
    } else {
      confidence = "low"
    }

    const reason = reasons.length > 0 ? reasons.join(", ") : "basic extraction"

    return { confidence, score, reason }
  }

  /**
   * Batch process multiple events
   */
  extractClientsFromEvents(
    events: GoogleCalendarEvent[]
  ): ExtractedClient[] {
    const extracted: ExtractedClient[] = []

    for (const event of events) {
      const client = this.extractClientFromEvent(event)
      if (client) {
        extracted.push(client)
      }
    }

    return extracted
  }
}
