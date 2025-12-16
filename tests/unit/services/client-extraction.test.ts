import { describe, it, expect } from 'vitest'
import { ClientExtractionService, ExtractedClient } from '@/lib/services/client-extraction'
import { calendar_v3 } from 'googleapis'

type GoogleCalendarEvent = calendar_v3.Schema$Event

describe('ClientExtractionService', () => {
  let service: ClientExtractionService

  beforeEach(() => {
    service = new ClientExtractionService()
  })

  describe('extractClientFromEvent', () => {
    describe('basic extraction', () => {
      it('should extract client name from simple event title', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: 'John Smith',
        }

        const result = service.extractClientFromEvent(event)

        expect(result).not.toBeNull()
        expect(result?.name).toBe('John Smith')
        expect(result?.sourceEventId).toBe('event-1')
      })

      it('should return null for empty event title', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: '',
        }

        const result = service.extractClientFromEvent(event)

        expect(result).toBeNull()
      })

      it('should return null for undefined event title', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
        }

        const result = service.extractClientFromEvent(event)

        expect(result).toBeNull()
      })

      it('should trim whitespace from event title', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: '  Jane Doe  ',
        }

        const result = service.extractClientFromEvent(event)

        expect(result?.name).toBe('Jane Doe')
      })
    })

    describe('prefix removal', () => {
      it('should remove "Training:" prefix from event title', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: 'Training: John Smith',
        }

        const result = service.extractClientFromEvent(event)

        expect(result?.name).toBe('John Smith')
      })

      it('should remove "Session:" prefix from event title', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: 'Session: Jane Doe',
        }

        const result = service.extractClientFromEvent(event)

        expect(result?.name).toBe('Jane Doe')
      })

      it('should remove "PT:" prefix from event title', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: 'PT: Mike Johnson',
        }

        const result = service.extractClientFromEvent(event)

        expect(result?.name).toBe('Mike Johnson')
      })

      it('should remove "Personal Training -" prefix from event title', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: 'Personal Training - Sarah Connor',
        }

        const result = service.extractClientFromEvent(event)

        expect(result?.name).toBe('Sarah Connor')
      })

      it('should remove "Client:" prefix from event title', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: 'Client: Bob Wilson',
        }

        const result = service.extractClientFromEvent(event)

        expect(result?.name).toBe('Bob Wilson')
      })

      it('should remove "With:" prefix from event title', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: 'With: Alice Brown',
        }

        const result = service.extractClientFromEvent(event)

        expect(result?.name).toBe('Alice Brown')
      })

      it('should remove "Workout:" prefix from event title', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: 'Workout: Tom Davis',
        }

        const result = service.extractClientFromEvent(event)

        expect(result?.name).toBe('Tom Davis')
      })

      it('should return null if only prefix remains', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: 'Training:',
        }

        const result = service.extractClientFromEvent(event)

        expect(result).toBeNull()
      })
    })

    describe('blacklist patterns', () => {
      it('should filter out team meeting events', () => {
        const events: GoogleCalendarEvent[] = [
          { id: '1', summary: 'Team Meeting' },
          { id: '2', summary: 'Staff Meeting' },
          { id: '3', summary: 'Group Sync' },
          { id: '4', summary: 'All Hands Meeting' },
          { id: '5', summary: 'All-hands huddle' },
        ]

        events.forEach(event => {
          const result = service.extractClientFromEvent(event)
          expect(result).toBeNull()
        })
      })

      it('should filter out generic meeting events', () => {
        const events: GoogleCalendarEvent[] = [
          { id: '1', summary: 'Meeting' },
          { id: '2', summary: 'Sync' },
          { id: '3', summary: 'Standup' },
          { id: '4', summary: 'Huddle' },
          { id: '5', summary: 'Review' },
        ]

        events.forEach(event => {
          const result = service.extractClientFromEvent(event)
          expect(result).toBeNull()
        })
      })

      it('should filter out meal time events', () => {
        const events: GoogleCalendarEvent[] = [
          { id: '1', summary: 'Breakfast' },
          { id: '2', summary: 'Lunch' },
          { id: '3', summary: 'Dinner' },
          { id: '4', summary: 'Coffee break' },
          { id: '5', summary: 'Snack time' },
        ]

        events.forEach(event => {
          const result = service.extractClientFromEvent(event)
          expect(result).toBeNull()
        })
      })

      it('should filter out work routine events', () => {
        const events: GoogleCalendarEvent[] = [
          { id: '1', summary: 'Daily Sync' },
          { id: '2', summary: 'Weekly Review' },
          { id: '3', summary: 'Monthly Planning' },
          { id: '4', summary: 'Sprint Planning' },
          { id: '5', summary: 'Scrum' },
          { id: '6', summary: 'Retro' },
          { id: '7', summary: 'Retrospective' },
          { id: '8', summary: 'Interview' },
          { id: '9', summary: 'Onboarding' },
          { id: '10', summary: 'Office Hours' },
        ]

        events.forEach(event => {
          const result = service.extractClientFromEvent(event)
          expect(result).toBeNull()
        })
      })

      it('should filter out generic workout terms without names', () => {
        const events: GoogleCalendarEvent[] = [
          { id: '1', summary: 'Workout' },
          { id: '2', summary: 'Training' },
          { id: '3', summary: 'Session' },
          { id: '4', summary: 'Personal Training' },
          { id: '5', summary: 'PT Session' },
          { id: '6', summary: 'HIIT' },
          { id: '7', summary: 'Cardio' },
          { id: '8', summary: 'Strength' },
          { id: '9', summary: 'Yoga' },
          { id: '10', summary: 'Pilates' },
          { id: '11', summary: 'CrossFit' },
        ]

        events.forEach(event => {
          const result = service.extractClientFromEvent(event)
          expect(result).toBeNull()
        })
      })

      it('should filter out time blocking events', () => {
        const events: GoogleCalendarEvent[] = [
          { id: '1', summary: 'Blocked' },
          { id: '2', summary: 'Block time' },
          { id: '3', summary: 'Busy' },
          { id: '4', summary: 'Unavailable' },
          { id: '5', summary: 'Hold' },
          { id: '6', summary: 'Do Not Book' },
          { id: '7', summary: 'Vacation' },
          { id: '8', summary: 'PTO' },
          { id: '9', summary: 'Out of Office' },
          { id: '10', summary: 'OOO' },
          { id: '11', summary: 'Holiday' },
          { id: '12', summary: 'Time Off' },
          { id: '13', summary: 'Focus Time' },
          { id: '14', summary: 'Deep Work' },
          { id: '15', summary: 'Admin Time' },
        ]

        events.forEach(event => {
          const result = service.extractClientFromEvent(event)
          expect(result).toBeNull()
        })
      })

      it('should filter out personal events', () => {
        const events: GoogleCalendarEvent[] = [
          { id: '1', summary: 'Doctor' },
          { id: '2', summary: 'Dentist' },
          { id: '3', summary: 'Appointment' },
          { id: '4', summary: 'Errand' },
          { id: '5', summary: 'Personal' },
        ]

        events.forEach(event => {
          const result = service.extractClientFromEvent(event)
          expect(result).toBeNull()
        })
      })

      it('should filter out availability events', () => {
        const events: GoogleCalendarEvent[] = [
          { id: '1', summary: 'Available' },
          { id: '2', summary: 'Availability' },
          { id: '3', summary: 'Open Slot' },
          { id: '4', summary: 'Free Time' },
        ]

        events.forEach(event => {
          const result = service.extractClientFromEvent(event)
          expect(result).toBeNull()
        })
      })

      it('should filter out 1-on-1 meeting labels', () => {
        const events: GoogleCalendarEvent[] = [
          { id: '1', summary: '1:1 Meeting' },
          { id: '2', summary: '1-1 Sync' },
          { id: '3', summary: 'One on One Meeting' },
          { id: '4', summary: 'One-on-One Sync' },
        ]

        events.forEach(event => {
          const result = service.extractClientFromEvent(event)
          expect(result).toBeNull()
        })
      })
    })

    describe('name validation', () => {
      it('should reject names that are too short', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: 'A',
        }

        const result = service.extractClientFromEvent(event)

        expect(result).toBeNull()
      })

      it('should reject names that are too long', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: 'A'.repeat(51),
        }

        const result = service.extractClientFromEvent(event)

        expect(result).toBeNull()
      })

      it('should reject all-numeric names', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: '12345',
        }

        const result = service.extractClientFromEvent(event)

        expect(result).toBeNull()
      })

      it('should reject names with no letters', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: '!@#$%',
        }

        const result = service.extractClientFromEvent(event)

        expect(result).toBeNull()
      })

      it('should reject ALL CAPS multi-word names', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: 'JOHN SMITH',
        }

        const result = service.extractClientFromEvent(event)

        expect(result).toBeNull()
      })

      it('should reject all lowercase multi-word names', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: 'john smith',
        }

        const result = service.extractClientFromEvent(event)

        expect(result).toBeNull()
      })

      it('should accept properly capitalized names', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: 'John Smith',
        }

        const result = service.extractClientFromEvent(event)

        expect(result).not.toBeNull()
        expect(result?.name).toBe('John Smith')
      })

      it('should accept single word names regardless of case', () => {
        const events: GoogleCalendarEvent[] = [
          { id: '1', summary: 'John' },
          { id: '2', summary: 'JANE' },
          { id: '3', summary: 'bob' },
        ]

        events.forEach(event => {
          const result = service.extractClientFromEvent(event)
          expect(result).not.toBeNull()
        })
      })

      it('should accept names with accented characters', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: 'José García',
        }

        const result = service.extractClientFromEvent(event)

        expect(result).not.toBeNull()
        expect(result?.name).toBe('José García')
      })

      it('should accept names with hyphens', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: 'Mary-Jane Watson',
        }

        const result = service.extractClientFromEvent(event)

        expect(result).not.toBeNull()
      })

      it('should accept names with apostrophes', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: "O'Brien Smith",
        }

        const result = service.extractClientFromEvent(event)

        expect(result).not.toBeNull()
      })

      it('should reject names that still contain workout terms after processing', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: 'Morning Session John',
        }

        const result = service.extractClientFromEvent(event)

        expect(result).toBeNull()
      })
    })

    describe('email extraction', () => {
      it('should extract email from single non-organizer attendee', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: 'John Smith',
          attendees: [
            { email: 'trainer@example.com', organizer: true },
            { email: 'john.smith@example.com', responseStatus: 'accepted' },
          ],
        }

        const result = service.extractClientFromEvent(event)

        expect(result?.email).toBe('john.smith@example.com')
      })

      it('should not extract email if attendee declined', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: 'John Smith',
          attendees: [
            { email: 'trainer@example.com', organizer: true },
            { email: 'john.smith@example.com', responseStatus: 'declined' },
          ],
        }

        const result = service.extractClientFromEvent(event)

        expect(result?.email).toBeUndefined()
      })

      it('should not extract email if multiple non-organizer attendees (group event)', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: 'John Smith',
          attendees: [
            { email: 'trainer@example.com', organizer: true },
            { email: 'john.smith@example.com', responseStatus: 'accepted' },
            { email: 'jane.doe@example.com', responseStatus: 'accepted' },
          ],
        }

        const result = service.extractClientFromEvent(event)

        expect(result?.email).toBeUndefined()
      })

      it('should not extract email if no attendees', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: 'John Smith',
        }

        const result = service.extractClientFromEvent(event)

        expect(result?.email).toBeUndefined()
      })

      it('should not extract email if only organizer is attendee', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: 'John Smith',
          attendees: [
            { email: 'trainer@example.com', organizer: true },
          ],
        }

        const result = service.extractClientFromEvent(event)

        expect(result?.email).toBeUndefined()
      })
    })

    describe('confidence calculation', () => {
      it('should return high confidence for email + 2-word name + 1-on-1', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: 'John Smith',
          description: 'Weekly training session',
          attendees: [
            { email: 'trainer@example.com', organizer: true },
            { email: 'john.smith@example.com', responseStatus: 'accepted' },
          ],
        }

        const result = service.extractClientFromEvent(event)

        expect(result?.confidence).toBe('high')
        expect(result?.confidenceScore).toBeGreaterThanOrEqual(60)
      })

      it('should return medium confidence for 2-word name with attendees', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: 'John Smith',
          attendees: [
            { email: 'trainer@example.com', organizer: true },
          ],
        }

        const result = service.extractClientFromEvent(event)

        expect(result?.confidence).toBe('medium')
        expect(result?.confidenceScore).toBeGreaterThanOrEqual(30)
        expect(result?.confidenceScore).toBeLessThan(60)
      })

      it('should return low confidence for single word name without attendees', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: 'John',
        }

        const result = service.extractClientFromEvent(event)

        expect(result?.confidence).toBe('low')
        expect(result?.confidenceScore).toBeLessThan(30)
      })

      it('should boost confidence with description', () => {
        const eventWithDescription: GoogleCalendarEvent = {
          id: 'event-1',
          summary: 'John Smith',
          description: 'Training notes here',
        }

        const eventWithoutDescription: GoogleCalendarEvent = {
          id: 'event-2',
          summary: 'John Smith',
        }

        const withDesc = service.extractClientFromEvent(eventWithDescription)
        const withoutDesc = service.extractClientFromEvent(eventWithoutDescription)

        expect(withDesc?.confidenceScore).toBeGreaterThan(withoutDesc?.confidenceScore ?? 0)
      })

      it('should include reason in result', () => {
        const event: GoogleCalendarEvent = {
          id: 'event-1',
          summary: 'John Smith',
          attendees: [
            { email: 'trainer@example.com', organizer: true },
            { email: 'john.smith@example.com', responseStatus: 'accepted' },
          ],
        }

        const result = service.extractClientFromEvent(event)

        expect(result?.reason).toContain('email found in attendees')
        expect(result?.reason).toContain('2-word name')
      })
    })
  })

  describe('extractClientsFromEvents', () => {
    it('should extract clients from multiple events', () => {
      const events: GoogleCalendarEvent[] = [
        { id: 'event-1', summary: 'John Smith' },
        { id: 'event-2', summary: 'Jane Doe' },
        { id: 'event-3', summary: 'Bob Wilson' },
      ]

      const results = service.extractClientsFromEvents(events)

      expect(results).toHaveLength(3)
      expect(results.map(r => r.name)).toEqual(['John Smith', 'Jane Doe', 'Bob Wilson'])
    })

    it('should filter out invalid events', () => {
      const events: GoogleCalendarEvent[] = [
        { id: 'event-1', summary: 'John Smith' },
        { id: 'event-2', summary: 'Team Meeting' }, // blacklisted
        { id: 'event-3', summary: '' }, // empty
        { id: 'event-4', summary: 'Jane Doe' },
        { id: 'event-5', summary: 'Lunch' }, // blacklisted
      ]

      const results = service.extractClientsFromEvents(events)

      expect(results).toHaveLength(2)
      expect(results.map(r => r.name)).toEqual(['John Smith', 'Jane Doe'])
    })

    it('should return empty array for empty input', () => {
      const results = service.extractClientsFromEvents([])

      expect(results).toHaveLength(0)
    })

    it('should return empty array when all events are filtered', () => {
      const events: GoogleCalendarEvent[] = [
        { id: 'event-1', summary: 'Team Meeting' },
        { id: 'event-2', summary: 'Lunch' },
        { id: 'event-3', summary: 'Vacation' },
      ]

      const results = service.extractClientsFromEvents(events)

      expect(results).toHaveLength(0)
    })

    it('should preserve source event IDs', () => {
      const events: GoogleCalendarEvent[] = [
        { id: 'abc123', summary: 'John Smith' },
        { id: 'def456', summary: 'Jane Doe' },
      ]

      const results = service.extractClientsFromEvents(events)

      expect(results[0].sourceEventId).toBe('abc123')
      expect(results[1].sourceEventId).toBe('def456')
    })
  })
})
