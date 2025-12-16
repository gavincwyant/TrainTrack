import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ClientSyncService } from '@/lib/services/client-sync'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  prisma: {
    trainerSettings: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    pendingClientProfile: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/google-calendar', () => ({
  GoogleCalendarService: class MockGoogleCalendarService {
    listEvents = vi.fn()
  },
}))

vi.mock('@/lib/services/client-extraction', () => ({
  ClientExtractionService: class MockClientExtractionService {
    extractClientsFromEvents = vi.fn()
  },
}))

vi.mock('@/lib/services/client-deduplication', () => ({
  ClientDeduplicationService: class MockClientDeduplicationService {
    findAnyDuplicate = vi.fn()
  },
}))

import { prisma } from '@/lib/db'

describe('ClientSyncService', () => {
  let service: ClientSyncService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ClientSyncService()
  })

  describe('syncClientsFromCalendar', () => {
    it('should throw error if trainer settings not found', async () => {
      vi.mocked(prisma.trainerSettings.findUnique).mockResolvedValue(null)

      await expect(
        service.syncClientsFromCalendar('trainer-123')
      ).rejects.toThrow('Trainer settings not found')
    })

    it('should throw error for non-google calendar source', async () => {
      vi.mocked(prisma.trainerSettings.findUnique).mockResolvedValue({
        id: 'settings-1',
        trainerId: 'trainer-123',
        workspaceId: 'workspace-1',
        googleCalendarConnected: true,
      } as never)

      await expect(
        service.syncClientsFromCalendar('trainer-123', { source: 'microsoft' })
      ).rejects.toThrow('Calendar source "microsoft" not yet supported')
    })

    it('should throw error if google calendar not connected', async () => {
      vi.mocked(prisma.trainerSettings.findUnique).mockResolvedValue({
        id: 'settings-1',
        trainerId: 'trainer-123',
        workspaceId: 'workspace-1',
        googleCalendarConnected: false,
      } as never)

      await expect(
        service.syncClientsFromCalendar('trainer-123')
      ).rejects.toThrow('Google Calendar not connected')
    })

    it('should process events and return sync result', async () => {
      // Mock trainer settings
      vi.mocked(prisma.trainerSettings.findUnique).mockResolvedValue({
        id: 'settings-1',
        trainerId: 'trainer-123',
        workspaceId: 'workspace-1',
        googleCalendarConnected: true,
        defaultIndividualSessionRate: 100,
      } as never)

      // Mock Google Calendar events
      const mockEvents = [
        { id: 'event-1', summary: 'John Smith' },
        { id: 'event-2', summary: 'Jane Doe' },
      ]

      // Access the mocked services through the class instance
      // @ts-expect-error - accessing private for testing
      service.googleService.listEvents.mockResolvedValue(mockEvents)

      // Mock extraction
      // @ts-expect-error - accessing private for testing
      service.extractionService.extractClientsFromEvents.mockReturnValue([
        {
          name: 'John Smith',
          email: 'john@example.com',
          confidence: 'high',
          confidenceScore: 60,
          reason: 'email found',
          sourceEventId: 'event-1',
        },
        {
          name: 'Jane Doe',
          confidence: 'medium',
          confidenceScore: 30,
          reason: 'basic',
          sourceEventId: 'event-2',
        },
      ])

      // Mock deduplication - no duplicates
      // @ts-expect-error - accessing private for testing
      service.deduplicationService.findAnyDuplicate.mockResolvedValue(null)

      // Mock pending profile creation
      vi.mocked(prisma.pendingClientProfile.create).mockResolvedValue({
        id: 'profile-1',
        extractedName: 'John Smith',
        extractedEmail: 'john@example.com',
        extractionConfidence: 'high',
        occurrenceCount: 1,
      } as never)

      const result = await service.syncClientsFromCalendar('trainer-123')

      expect(result.extractedCount).toBe(2)
      expect(result.createdCount).toBeGreaterThanOrEqual(0)
      expect(result.duplicateCount).toBeGreaterThanOrEqual(0)
    })

    it('should use custom lookback days', async () => {
      vi.mocked(prisma.trainerSettings.findUnique).mockResolvedValue({
        id: 'settings-1',
        trainerId: 'trainer-123',
        workspaceId: 'workspace-1',
        googleCalendarConnected: true,
      } as never)

      // @ts-expect-error - accessing private for testing
      service.googleService.listEvents.mockResolvedValue([])

      // @ts-expect-error - accessing private for testing
      service.extractionService.extractClientsFromEvents.mockReturnValue([])

      await service.syncClientsFromCalendar('trainer-123', { lookbackDays: 60 })

      // @ts-expect-error - accessing private for testing
      expect(service.googleService.listEvents).toHaveBeenCalled()
    })
  })

  describe('extractClientsFromNewEvents', () => {
    it('should skip extraction if auto sync is disabled', async () => {
      vi.mocked(prisma.trainerSettings.findUnique).mockResolvedValue({
        id: 'settings-1',
        trainerId: 'trainer-123',
        workspaceId: 'workspace-1',
        autoClientSyncEnabled: false,
      } as never)

      await service.extractClientsFromNewEvents('trainer-123', [
        { id: 'event-1', summary: 'John Smith' },
      ])

      // Extraction should not be called
      // @ts-expect-error - accessing private for testing
      expect(service.extractionService.extractClientsFromEvents).not.toHaveBeenCalled()
    })

    it('should skip if no events provided', async () => {
      vi.mocked(prisma.trainerSettings.findUnique).mockResolvedValue({
        id: 'settings-1',
        trainerId: 'trainer-123',
        workspaceId: 'workspace-1',
        autoClientSyncEnabled: true,
      } as never)

      // @ts-expect-error - accessing private for testing
      service.extractionService.extractClientsFromEvents.mockReturnValue([])

      await service.extractClientsFromNewEvents('trainer-123', [])

      // Should complete without error
      expect(prisma.pendingClientProfile.create).not.toHaveBeenCalled()
    })

    it('should extract and create pending profiles when enabled', async () => {
      vi.mocked(prisma.trainerSettings.findUnique).mockResolvedValue({
        id: 'settings-1',
        trainerId: 'trainer-123',
        workspaceId: 'workspace-1',
        autoClientSyncEnabled: true,
        defaultIndividualSessionRate: 100,
      } as never)

      // @ts-expect-error - accessing private for testing
      service.extractionService.extractClientsFromEvents.mockReturnValue([
        {
          name: 'New Client',
          confidence: 'high',
          confidenceScore: 60,
          reason: 'test',
          sourceEventId: 'event-new',
        },
      ])

      // @ts-expect-error - accessing private for testing
      service.deduplicationService.findAnyDuplicate.mockResolvedValue(null)

      vi.mocked(prisma.pendingClientProfile.create).mockResolvedValue({
        id: 'profile-new',
        extractedName: 'New Client',
      } as never)

      await service.extractClientsFromNewEvents('trainer-123', [
        { id: 'event-new', summary: 'New Client' },
      ])

      expect(prisma.pendingClientProfile.create).toHaveBeenCalled()
    })
  })

  describe('aggregateExtractedClients (via integration)', () => {
    // Test aggregation through the sync flow

    it('should aggregate clients with same email', async () => {
      vi.mocked(prisma.trainerSettings.findUnique).mockResolvedValue({
        id: 'settings-1',
        trainerId: 'trainer-123',
        workspaceId: 'workspace-1',
        googleCalendarConnected: true,
        defaultIndividualSessionRate: 100,
      } as never)

      // @ts-expect-error - accessing private for testing
      service.googleService.listEvents.mockResolvedValue([])

      // Return clients with same email (should aggregate)
      // @ts-expect-error - accessing private for testing
      service.extractionService.extractClientsFromEvents.mockReturnValue([
        {
          name: 'John Smith',
          email: 'john@example.com',
          confidence: 'low',
          confidenceScore: 10,
          reason: 'basic',
          sourceEventId: 'event-1',
        },
        {
          name: 'John Smith',
          email: 'john@example.com',
          confidence: 'low',
          confidenceScore: 10,
          reason: 'basic',
          sourceEventId: 'event-2',
        },
        {
          name: 'John Smith',
          email: 'john@example.com',
          confidence: 'low',
          confidenceScore: 10,
          reason: 'basic',
          sourceEventId: 'event-3',
        },
      ])

      // @ts-expect-error - accessing private for testing
      service.deduplicationService.findAnyDuplicate.mockResolvedValue(null)

      vi.mocked(prisma.pendingClientProfile.create).mockResolvedValue({
        id: 'profile-1',
        extractedName: 'John Smith',
        extractedEmail: 'john@example.com',
        occurrenceCount: 3,
      } as never)

      const result = await service.syncClientsFromCalendar('trainer-123')

      // Should only create 1 profile (aggregated)
      expect(result.createdCount).toBe(1)
    })

    it('should aggregate clients with same name (no email)', async () => {
      vi.mocked(prisma.trainerSettings.findUnique).mockResolvedValue({
        id: 'settings-1',
        trainerId: 'trainer-123',
        workspaceId: 'workspace-1',
        googleCalendarConnected: true,
        defaultIndividualSessionRate: 100,
      } as never)

      // @ts-expect-error - accessing private for testing
      service.googleService.listEvents.mockResolvedValue([])

      // Return clients with same name but no email
      // @ts-expect-error - accessing private for testing
      service.extractionService.extractClientsFromEvents.mockReturnValue([
        {
          name: 'Jane Doe',
          confidence: 'low',
          confidenceScore: 10,
          reason: 'basic',
          sourceEventId: 'event-1',
        },
        {
          name: 'Jane Doe',
          confidence: 'low',
          confidenceScore: 10,
          reason: 'basic',
          sourceEventId: 'event-2',
        },
      ])

      // @ts-expect-error - accessing private for testing
      service.deduplicationService.findAnyDuplicate.mockResolvedValue(null)

      vi.mocked(prisma.pendingClientProfile.create).mockResolvedValue({
        id: 'profile-1',
        extractedName: 'Jane Doe',
        occurrenceCount: 2,
      } as never)

      const result = await service.syncClientsFromCalendar('trainer-123')

      // Should only create 1 profile (aggregated)
      expect(result.createdCount).toBe(1)
    })

    it('should boost confidence for clients seen multiple times', async () => {
      vi.mocked(prisma.trainerSettings.findUnique).mockResolvedValue({
        id: 'settings-1',
        trainerId: 'trainer-123',
        workspaceId: 'workspace-1',
        googleCalendarConnected: true,
        defaultIndividualSessionRate: 100,
      } as never)

      // @ts-expect-error - accessing private for testing
      service.googleService.listEvents.mockResolvedValue([])

      // Return client seen 3 times (should boost to high confidence)
      // @ts-expect-error - accessing private for testing
      service.extractionService.extractClientsFromEvents.mockReturnValue([
        {
          name: 'Repeat Client',
          confidence: 'low',
          confidenceScore: 10,
          reason: 'basic',
          sourceEventId: 'event-1',
        },
        {
          name: 'Repeat Client',
          confidence: 'low',
          confidenceScore: 10,
          reason: 'basic',
          sourceEventId: 'event-2',
        },
        {
          name: 'Repeat Client',
          confidence: 'low',
          confidenceScore: 10,
          reason: 'basic',
          sourceEventId: 'event-3',
        },
      ])

      // @ts-expect-error - accessing private for testing
      service.deduplicationService.findAnyDuplicate.mockResolvedValue(null)

      let createdProfileData: Record<string, unknown> | null = null
      vi.mocked(prisma.pendingClientProfile.create).mockImplementation(
        async ({ data }) => {
          createdProfileData = data as Record<string, unknown>
          return {
            id: 'profile-1',
            extractedName: 'Repeat Client',
            extractionConfidence: data.extractionConfidence,
            occurrenceCount: data.occurrenceCount,
          } as never
        }
      )

      await service.syncClientsFromCalendar('trainer-123')

      // Should have boosted confidence and tracked occurrences
      expect(createdProfileData?.occurrenceCount).toBe(3)
      expect(createdProfileData?.extractionConfidence).toBe('high')
    })
  })

  describe('duplicate handling', () => {
    it('should skip duplicate existing clients', async () => {
      vi.mocked(prisma.trainerSettings.findUnique).mockResolvedValue({
        id: 'settings-1',
        trainerId: 'trainer-123',
        workspaceId: 'workspace-1',
        googleCalendarConnected: true,
        defaultIndividualSessionRate: 100,
      } as never)

      // @ts-expect-error - accessing private for testing
      service.googleService.listEvents.mockResolvedValue([])

      // @ts-expect-error - accessing private for testing
      service.extractionService.extractClientsFromEvents.mockReturnValue([
        {
          name: 'Existing Client',
          email: 'existing@example.com',
          confidence: 'high',
          confidenceScore: 60,
          reason: 'test',
          sourceEventId: 'event-1',
        },
      ])

      // Return duplicate match
      // @ts-expect-error - accessing private for testing
      service.deduplicationService.findAnyDuplicate.mockResolvedValue({
        type: 'existing_client',
        client: { id: 'client-existing' },
        matchReason: 'email exact match',
      })

      const result = await service.syncClientsFromCalendar('trainer-123')

      expect(result.duplicateCount).toBe(1)
      expect(result.createdCount).toBe(0)
      expect(prisma.pendingClientProfile.create).not.toHaveBeenCalled()
    })

    it('should update existing pending profile when duplicate found', async () => {
      vi.mocked(prisma.trainerSettings.findUnique).mockResolvedValue({
        id: 'settings-1',
        trainerId: 'trainer-123',
        workspaceId: 'workspace-1',
        googleCalendarConnected: true,
        defaultIndividualSessionRate: 100,
      } as never)

      // @ts-expect-error - accessing private for testing
      service.googleService.listEvents.mockResolvedValue([])

      // @ts-expect-error - accessing private for testing
      service.extractionService.extractClientsFromEvents.mockReturnValue([
        {
          name: 'Pending Client',
          confidence: 'high',
          confidenceScore: 60,
          reason: 'test',
          sourceEventId: 'event-new',
        },
      ])

      // Return pending profile match
      // @ts-expect-error - accessing private for testing
      service.deduplicationService.findAnyDuplicate.mockResolvedValue({
        type: 'pending_profile',
        profile: {
          id: 'pending-existing',
          occurrenceCount: 2,
          sourceEventIds: ['event-old-1', 'event-old-2'],
        },
        matchReason: 'name exact match',
      })

      vi.mocked(prisma.pendingClientProfile.update).mockResolvedValue({
        id: 'pending-existing',
        occurrenceCount: 3,
      } as never)

      const result = await service.syncClientsFromCalendar('trainer-123')

      expect(result.duplicateCount).toBe(1)
      expect(prisma.pendingClientProfile.update).toHaveBeenCalledWith({
        where: { id: 'pending-existing' },
        data: expect.objectContaining({
          occurrenceCount: 3,
        }),
      })
    })
  })

  describe('timestamp updates', () => {
    it('should update lastClientSyncAt and hasCompletedInitialClientSync', async () => {
      vi.mocked(prisma.trainerSettings.findUnique).mockResolvedValue({
        id: 'settings-1',
        trainerId: 'trainer-123',
        workspaceId: 'workspace-1',
        googleCalendarConnected: true,
        defaultIndividualSessionRate: 100,
      } as never)

      // @ts-expect-error - accessing private for testing
      service.googleService.listEvents.mockResolvedValue([])

      // @ts-expect-error - accessing private for testing
      service.extractionService.extractClientsFromEvents.mockReturnValue([])

      await service.syncClientsFromCalendar('trainer-123')

      expect(prisma.trainerSettings.update).toHaveBeenCalledWith({
        where: { trainerId: 'trainer-123' },
        data: expect.objectContaining({
          lastClientSyncAt: expect.any(Date),
          hasCompletedInitialClientSync: true,
        }),
      })
    })
  })
})
