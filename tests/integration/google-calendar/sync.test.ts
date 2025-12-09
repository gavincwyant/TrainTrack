import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CalendarSyncService } from '@/lib/services/calendar-sync'
import { prisma } from '@/lib/db'
import { createTestWorkspace, createAppointment } from '@/tests/fixtures/workspace'

// Mock Google Calendar service
vi.mock('@/lib/google-calendar', () => ({
  GoogleCalendarService: class MockGoogleCalendarService {
    async createEvent() {
      return { id: 'google-event-123', htmlLink: 'https://calendar.google.com/event/123' }
    }

    async updateEvent() {
      return { id: 'google-event-123', htmlLink: 'https://calendar.google.com/event/123' }
    }

    async deleteEvent() {
      return true
    }

    async listEvents() {
      return {
        items: [
          {
            id: 'external-event-1',
            summary: 'John Doe',
            start: { dateTime: new Date(Date.now() + 86400000).toISOString() },
            end: { dateTime: new Date(Date.now() + 86400000 + 3600000).toISOString() },
            created: new Date().toISOString(),
          },
        ],
      }
    }
  },
}))

describe('Google Calendar Sync Integration', () => {
  let workspace: Awaited<ReturnType<typeof createTestWorkspace>>
  let syncService: CalendarSyncService

  beforeEach(async () => {
    workspace = await createTestWorkspace()
    syncService = new CalendarSyncService()

    // Enable Google Calendar sync for the trainer
    await prisma.trainerSettings.update({
      where: { trainerId: workspace.trainer.id },
      data: {
        autoSyncEnabled: true,
        googleCalendarConnected: true,
      },
    })
  })

  describe('syncAppointmentToGoogle', () => {
    it('should create new Google Calendar event for appointment', async () => {
      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
      })

      await syncService.syncAppointmentToGoogle(appointment.id)

      // Verify mapping was created
      const mapping = await prisma.calendarEventMapping.findFirst({
        where: {
          appointmentId: appointment.id,
          provider: 'google',
        },
      })

      expect(mapping).toBeDefined()
      expect(mapping?.externalEventId).toBe('google-event-123')
      expect(mapping?.syncDirection).toBe('outbound')
    })

    it('should update existing Google Calendar event', async () => {
      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
      })

      // Create initial mapping
      await prisma.calendarEventMapping.create({
        data: {
          workspaceId: workspace.workspace.id,
          appointmentId: appointment.id,
          provider: 'google',
          externalEventId: 'existing-event-id',
          externalCalendarId: 'primary',
          syncDirection: 'outbound',
        },
      })

      const initialMapping = await prisma.calendarEventMapping.findFirst({
        where: { appointmentId: appointment.id },
      })
      const initialSyncTime = initialMapping?.lastSyncedAt

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      await syncService.syncAppointmentToGoogle(appointment.id)

      // Verify mapping was updated (lastSyncedAt should change)
      const updatedMapping = await prisma.calendarEventMapping.findFirst({
        where: { appointmentId: appointment.id },
      })

      expect(updatedMapping?.externalEventId).toBe('existing-event-id')
      if (initialSyncTime && updatedMapping?.lastSyncedAt) {
        expect(updatedMapping.lastSyncedAt.getTime()).toBeGreaterThan(initialSyncTime.getTime())
      }
    })

    it('should format event title based on appointment status', async () => {
      const completedAppointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
      })

      // Mock the createEvent to capture the data
      const GoogleCalendarService = await import('@/lib/google-calendar')
      const createEventSpy = vi.spyOn(GoogleCalendarService.GoogleCalendarService.prototype, 'createEvent')

      await syncService.syncAppointmentToGoogle(completedAppointment.id)

      // Verify the event title includes checkmark for completed
      expect(createEventSpy).toHaveBeenCalled()
      const eventData = createEventSpy.mock.calls[0][1]
      expect(eventData.summary).toContain('✓')
    })

    it('should skip sync if auto-sync disabled', async () => {
      // Disable auto-sync
      await prisma.trainerSettings.update({
        where: { trainerId: workspace.trainer.id },
        data: { autoSyncEnabled: false },
      })

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
      })

      await syncService.syncAppointmentToGoogle(appointment.id)

      // Verify no mapping was created
      const mapping = await prisma.calendarEventMapping.findFirst({
        where: { appointmentId: appointment.id },
      })

      expect(mapping).toBeNull()
    })

    it('should skip sync if Google Calendar not connected', async () => {
      // Disconnect Google Calendar
      await prisma.trainerSettings.update({
        where: { trainerId: workspace.trainer.id },
        data: { googleCalendarConnected: false },
      })

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
      })

      await syncService.syncAppointmentToGoogle(appointment.id)

      // Verify no mapping was created
      const mapping = await prisma.calendarEventMapping.findFirst({
        where: { appointmentId: appointment.id },
      })

      expect(mapping).toBeNull()
    })

    it('should use correct color for appointment status', async () => {
      const GoogleCalendarService = await import('@/lib/google-calendar')
      const createEventSpy = vi.spyOn(GoogleCalendarService.GoogleCalendarService.prototype, 'createEvent')

      // Test COMPLETED status (green)
      const completedAppt = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
      })

      await syncService.syncAppointmentToGoogle(completedAppt.id)

      const completedEventData = createEventSpy.mock.calls[createEventSpy.mock.calls.length - 1][1]
      expect(completedEventData.colorId).toBe('10') // Basil (green)
    })

    it('should include timezone in event data', async () => {
      const GoogleCalendarService = await import('@/lib/google-calendar')
      const createEventSpy = vi.spyOn(GoogleCalendarService.GoogleCalendarService.prototype, 'createEvent')

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
      })

      await syncService.syncAppointmentToGoogle(appointment.id)

      const eventData = createEventSpy.mock.calls[createEventSpy.mock.calls.length - 1][1]
      expect(eventData.start.timeZone).toBe('America/New_York') // From fixture default
      expect(eventData.end.timeZone).toBe('America/New_York')
    })

    it('should handle non-existent appointment gracefully', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'

      // Should not throw
      await expect(syncService.syncAppointmentToGoogle(fakeId)).resolves.toBeUndefined()
    })
  })

  describe('deleteAppointmentFromGoogle', () => {
    it('should delete event and mapping from Google Calendar', async () => {
      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
      })

      // Create mapping
      const mapping = await prisma.calendarEventMapping.create({
        data: {
          workspaceId: workspace.workspace.id,
          appointmentId: appointment.id,
          provider: 'google',
          externalEventId: 'event-to-delete',
          externalCalendarId: 'primary',
          syncDirection: 'outbound',
        },
      })

      await syncService.deleteAppointmentFromGoogle(appointment.id, workspace.trainer.id)

      // Verify mapping was deleted
      const deletedMapping = await prisma.calendarEventMapping.findUnique({
        where: { id: mapping.id },
      })

      expect(deletedMapping).toBeNull()
    })

    it('should handle non-existent mapping gracefully', async () => {
      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
      })

      // Should not throw when no mapping exists
      await expect(
        syncService.deleteAppointmentFromGoogle(appointment.id, workspace.trainer.id)
      ).resolves.toBeUndefined()
    })

    it('should skip deletion if calendar not connected', async () => {
      await prisma.trainerSettings.update({
        where: { trainerId: workspace.trainer.id },
        data: { googleCalendarConnected: false },
      })

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
      })

      // Create mapping
      const mapping = await prisma.calendarEventMapping.create({
        data: {
          workspaceId: workspace.workspace.id,
          appointmentId: appointment.id,
          provider: 'google',
          externalEventId: 'event-to-delete',
          externalCalendarId: 'primary',
          syncDirection: 'outbound',
        },
      })

      await syncService.deleteAppointmentFromGoogle(appointment.id, workspace.trainer.id)

      // Mapping should still exist since calendar is not connected
      const stillExists = await prisma.calendarEventMapping.findUnique({
        where: { id: mapping.id },
      })

      expect(stillExists).toBeDefined()
    })
  })

  describe('Bidirectional sync', () => {
    it('should maintain sync direction in mapping', async () => {
      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
      })

      await syncService.syncAppointmentToGoogle(appointment.id)

      const mapping = await prisma.calendarEventMapping.findFirst({
        where: { appointmentId: appointment.id },
      })

      expect(mapping?.syncDirection).toBe('outbound')
    })

    it('should track workspace association in mapping', async () => {
      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
      })

      await syncService.syncAppointmentToGoogle(appointment.id)

      const mapping = await prisma.calendarEventMapping.findFirst({
        where: { appointmentId: appointment.id },
      })

      expect(mapping?.workspaceId).toBe(workspace.workspace.id)
    })
  })

  describe('Error handling', () => {
    it('should throw error if Google API fails during creation', async () => {
      const GoogleCalendarService = await import('@/lib/google-calendar')
      vi.spyOn(GoogleCalendarService.GoogleCalendarService.prototype, 'createEvent').mockRejectedValue(
        new Error('Google API error')
      )

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
      })

      await expect(syncService.syncAppointmentToGoogle(appointment.id)).rejects.toThrow('Google API error')
    })

    it('should handle delete errors gracefully', async () => {
      const GoogleCalendarService = await import('@/lib/google-calendar')
      vi.spyOn(GoogleCalendarService.GoogleCalendarService.prototype, 'deleteEvent').mockRejectedValue(
        new Error('Delete failed')
      )

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
      })

      // Create mapping
      await prisma.calendarEventMapping.create({
        data: {
          workspaceId: workspace.workspace.id,
          appointmentId: appointment.id,
          provider: 'google',
          externalEventId: 'event-to-delete',
          externalCalendarId: 'primary',
          syncDirection: 'outbound',
        },
      })

      // Should not throw even if delete fails
      await expect(
        syncService.deleteAppointmentFromGoogle(appointment.id, workspace.trainer.id)
      ).resolves.toBeUndefined()
    })
  })

  describe('pullGoogleCalendarEvents', () => {
    it('should skip if auto-sync disabled', async () => {
      await prisma.trainerSettings.update({
        where: { trainerId: workspace.trainer.id },
        data: { autoSyncEnabled: false },
      })

      const GoogleCalendarService = await import('@/lib/google-calendar')
      const listEventsSpy = vi.spyOn(GoogleCalendarService.GoogleCalendarService.prototype, 'listEvents')

      await syncService.pullGoogleCalendarEvents(workspace.trainer.id)

      // Should not call Google API if sync disabled
      expect(listEventsSpy).not.toHaveBeenCalled()
    })

    it('should skip if calendar not connected', async () => {
      await prisma.trainerSettings.update({
        where: { trainerId: workspace.trainer.id },
        data: { googleCalendarConnected: false },
      })

      const GoogleCalendarService = await import('@/lib/google-calendar')
      const listEventsSpy = vi.spyOn(GoogleCalendarService.GoogleCalendarService.prototype, 'listEvents')

      await syncService.pullGoogleCalendarEvents(workspace.trainer.id)

      expect(listEventsSpy).not.toHaveBeenCalled()
    })

    it('should create appointment for high confidence client match', async () => {
      const GoogleCalendarService = await import('@/lib/google-calendar')
      vi.spyOn(GoogleCalendarService.GoogleCalendarService.prototype, 'listEvents').mockResolvedValue([
        {
          id: 'google-event-high-confidence',
          summary: workspace.client.fullName, // Exact match - high confidence
          start: { dateTime: new Date(Date.now() + 86400000).toISOString() },
          end: { dateTime: new Date(Date.now() + 86400000 + 3600000).toISOString() },
          created: new Date().toISOString(),
        },
      ] as any)

      await syncService.pullGoogleCalendarEvents(workspace.trainer.id)

      // Verify appointment was created
      const appointment = await prisma.appointment.findFirst({
        where: {
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
        },
      })

      expect(appointment).toBeDefined()
      expect(appointment?.status).toBe('SCHEDULED')

      // Verify mapping was created
      const mapping = await prisma.calendarEventMapping.findUnique({
        where: {
          provider_externalEventId: {
            provider: 'google',
            externalEventId: 'google-event-high-confidence',
          },
        },
      })

      expect(mapping).toBeDefined()
      expect(mapping?.syncDirection).toBe('inbound')
      expect(mapping?.appointmentId).toBe(appointment?.id)
    })

    it('should create blocked time for events with no client match', async () => {
      const GoogleCalendarService = await import('@/lib/google-calendar')
      vi.spyOn(GoogleCalendarService.GoogleCalendarService.prototype, 'listEvents').mockResolvedValue([
          {
            id: 'google-event-no-match',
            summary: 'Personal appointment',
            start: { dateTime: new Date(Date.now() + 86400000).toISOString() },
            end: { dateTime: new Date(Date.now() + 86400000 + 3600000).toISOString() },
            created: new Date().toISOString(),
          },
      ] as any)

      await syncService.pullGoogleCalendarEvents(workspace.trainer.id)

      // Verify blocked time was created
      const blockedTime = await prisma.blockedTime.findFirst({
        where: {
          trainerId: workspace.trainer.id,
          reason: { contains: 'Personal appointment' },
        },
      })

      expect(blockedTime).toBeDefined()

      // Verify mapping was created
      const mapping = await prisma.calendarEventMapping.findUnique({
        where: {
          provider_externalEventId: {
            provider: 'google',
            externalEventId: 'google-event-no-match',
          },
        },
      })

      expect(mapping).toBeDefined()
      expect(mapping?.blockedTimeId).toBe(blockedTime?.id)
    })

    it('should skip all-day events', async () => {
      const GoogleCalendarService = await import('@/lib/google-calendar')
      vi.spyOn(GoogleCalendarService.GoogleCalendarService.prototype, 'listEvents').mockResolvedValue([
          {
            id: 'all-day-event',
            summary: 'All Day Event',
            start: { date: '2025-12-25' }, // No dateTime, just date
            end: { date: '2025-12-26' },
            created: new Date().toISOString(),
          },
      ] as any)

      await syncService.pullGoogleCalendarEvents(workspace.trainer.id)

      // Should not create any appointment or blocked time
      const appointment = await prisma.appointment.findFirst({
        where: { trainerId: workspace.trainer.id },
      })

      const blockedTime = await prisma.blockedTime.findFirst({
        where: { trainerId: workspace.trainer.id },
      })

      expect(appointment).toBeNull()
      expect(blockedTime).toBeNull()
    })

    it('should skip outbound events (created by TrainTrack)', async () => {
      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
      })

      // Create outbound mapping
      await prisma.calendarEventMapping.create({
        data: {
          workspaceId: workspace.workspace.id,
          appointmentId: appointment.id,
          provider: 'google',
          externalEventId: 'outbound-event',
          externalCalendarId: 'primary',
          syncDirection: 'outbound',
        },
      })

      const GoogleCalendarService = await import('@/lib/google-calendar')
      vi.spyOn(GoogleCalendarService.GoogleCalendarService.prototype, 'listEvents').mockResolvedValue([
          {
            id: 'outbound-event',
            summary: workspace.client.fullName,
            start: { dateTime: new Date(Date.now() + 86400000).toISOString() },
            end: { dateTime: new Date(Date.now() + 86400000 + 3600000).toISOString() },
            created: new Date().toISOString(),
          },
      ] as any)

      const initialAppointment = await prisma.appointment.findUnique({
        where: { id: appointment.id },
      })

      await syncService.pullGoogleCalendarEvents(workspace.trainer.id)

      // Appointment should not be updated (outbound events are skipped)
      const updatedAppointment = await prisma.appointment.findUnique({
        where: { id: appointment.id },
      })

      expect(updatedAppointment?.startTime).toEqual(initialAppointment?.startTime)
    })

    it('should update existing inbound appointment times', async () => {
      const oldStartTime = new Date(Date.now() + 86400000)
      const oldEndTime = new Date(Date.now() + 86400000 + 3600000)

      // Create inbound appointment
      const appointment = await prisma.appointment.create({
        data: {
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          startTime: oldStartTime,
          endTime: oldEndTime,
          status: 'SCHEDULED',
        },
      })

      await prisma.calendarEventMapping.create({
        data: {
          workspaceId: workspace.workspace.id,
          appointmentId: appointment.id,
          provider: 'google',
          externalEventId: 'inbound-event',
          externalCalendarId: 'primary',
          syncDirection: 'inbound',
        },
      })

      const newStartTime = new Date(Date.now() + 86400000 * 2)
      const newEndTime = new Date(Date.now() + 86400000 * 2 + 3600000)

      const GoogleCalendarService = await import('@/lib/google-calendar')
      vi.spyOn(GoogleCalendarService.GoogleCalendarService.prototype, 'listEvents').mockResolvedValue([
          {
            id: 'inbound-event',
            summary: workspace.client.fullName,
            start: { dateTime: newStartTime.toISOString() },
            end: { dateTime: newEndTime.toISOString() },
            created: new Date().toISOString(),
          },
      ] as any)

      await syncService.pullGoogleCalendarEvents(workspace.trainer.id)

      // Verify times were updated
      const updatedAppointment = await prisma.appointment.findUnique({
        where: { id: appointment.id },
      })

      expect(updatedAppointment?.startTime.getTime()).toBe(newStartTime.getTime())
      expect(updatedAppointment?.endTime.getTime()).toBe(newEndTime.getTime())
    })

    it('should update existing blocked time', async () => {
      const oldStartTime = new Date(Date.now() + 86400000)
      const oldEndTime = new Date(Date.now() + 86400000 + 3600000)

      const blockedTime = await prisma.blockedTime.create({
        data: {
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          startTime: oldStartTime,
          endTime: oldEndTime,
          reason: 'Old reason',
          isRecurring: false,
        },
      })

      await prisma.calendarEventMapping.create({
        data: {
          workspaceId: workspace.workspace.id,
          blockedTimeId: blockedTime.id,
          provider: 'google',
          externalEventId: 'blocked-event',
          externalCalendarId: 'primary',
          syncDirection: 'inbound',
        },
      })

      const newStartTime = new Date(Date.now() + 86400000 * 3)
      const newEndTime = new Date(Date.now() + 86400000 * 3 + 3600000)

      const GoogleCalendarService = await import('@/lib/google-calendar')
      vi.spyOn(GoogleCalendarService.GoogleCalendarService.prototype, 'listEvents').mockResolvedValue([
          {
            id: 'blocked-event',
            summary: 'Updated event',
            start: { dateTime: newStartTime.toISOString() },
            end: { dateTime: newEndTime.toISOString() },
            created: new Date().toISOString(),
          },
      ] as any)

      await syncService.pullGoogleCalendarEvents(workspace.trainer.id)

      // Verify times were updated
      const updatedBlockedTime = await prisma.blockedTime.findUnique({
        where: { id: blockedTime.id },
      })

      expect(updatedBlockedTime?.startTime.getTime()).toBe(newStartTime.getTime())
      expect(updatedBlockedTime?.endTime.getTime()).toBe(newEndTime.getTime())
      expect(updatedBlockedTime?.reason).toContain('Updated event')
    })

    it('should trigger auto client sync when enabled', async () => {
      await prisma.trainerSettings.update({
        where: { trainerId: workspace.trainer.id },
        data: { autoClientSyncEnabled: true },
      })

      const GoogleCalendarService = await import('@/lib/google-calendar')
      vi.spyOn(GoogleCalendarService.GoogleCalendarService.prototype, 'listEvents').mockResolvedValue([
        {
          id: 'event-with-new-client',
          summary: 'Jane Smith',
          start: { dateTime: new Date(Date.now() + 86400000).toISOString() },
          end: { dateTime: new Date(Date.now() + 86400000 + 3600000).toISOString() },
          created: new Date().toISOString(),
        },
      ] as any)

      // Mock ClientSyncService
      const ClientSyncService = await import('@/lib/services/client-sync')
      const extractSpy = vi.spyOn(ClientSyncService.ClientSyncService.prototype, 'extractClientsFromNewEvents').mockResolvedValue()

      await syncService.pullGoogleCalendarEvents(workspace.trainer.id)

      // Verify client extraction was called
      expect(extractSpy).toHaveBeenCalledWith(workspace.trainer.id, expect.any(Array))
    })

    it('should handle client sync errors gracefully', async () => {
      await prisma.trainerSettings.update({
        where: { trainerId: workspace.trainer.id },
        data: { autoClientSyncEnabled: true },
      })

      const GoogleCalendarService = await import('@/lib/google-calendar')
      vi.spyOn(GoogleCalendarService.GoogleCalendarService.prototype, 'listEvents').mockResolvedValue([
        {
          id: 'event-1',
          summary: 'Test Event',
          start: { dateTime: new Date(Date.now() + 86400000).toISOString() },
          end: { dateTime: new Date(Date.now() + 86400000 + 3600000).toISOString() },
          created: new Date().toISOString(),
        },
      ] as any)

      // Mock ClientSyncService to throw error
      const ClientSyncService = await import('@/lib/services/client-sync')
      vi.spyOn(ClientSyncService.ClientSyncService.prototype, 'extractClientsFromNewEvents').mockRejectedValue(
        new Error('Client extraction failed')
      )

      // Should not throw - client extraction errors are non-critical
      await expect(syncService.pullGoogleCalendarEvents(workspace.trainer.id)).resolves.toBeUndefined()
    })

    it('should handle Google API errors', async () => {
      const GoogleCalendarService = await import('@/lib/google-calendar')
      vi.spyOn(GoogleCalendarService.GoogleCalendarService.prototype, 'listEvents').mockRejectedValue(
        new Error('Google API rate limit exceeded')
      )

      await expect(syncService.pullGoogleCalendarEvents(workspace.trainer.id)).rejects.toThrow(
        'Google API rate limit exceeded'
      )
    })

    it('should update lastSyncedAt timestamp', async () => {
      const GoogleCalendarService = await import('@/lib/google-calendar')
      vi.spyOn(GoogleCalendarService.GoogleCalendarService.prototype, 'listEvents').mockResolvedValue([] as any)

      const beforeSync = await prisma.trainerSettings.findUnique({
        where: { trainerId: workspace.trainer.id },
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      await syncService.pullGoogleCalendarEvents(workspace.trainer.id)

      const afterSync = await prisma.trainerSettings.findUnique({
        where: { trainerId: workspace.trainer.id },
      })

      expect(afterSync?.lastSyncedAt).toBeDefined()
      if (beforeSync?.lastSyncedAt && afterSync?.lastSyncedAt) {
        expect(afterSync.lastSyncedAt.getTime()).toBeGreaterThan(beforeSync.lastSyncedAt.getTime())
      }
    })

    it('should handle mapping exists without blockedTimeId edge case', async () => {
      // Create a mapping without a blockedTimeId (orphaned mapping)
      await prisma.calendarEventMapping.create({
        data: {
          workspaceId: workspace.workspace.id,
          provider: 'google',
          externalEventId: 'orphaned-event',
          externalCalendarId: 'primary',
          syncDirection: 'inbound',
          appointmentId: null,
          blockedTimeId: null,
        },
      })

      const GoogleCalendarService = await import('@/lib/google-calendar')
      vi.spyOn(GoogleCalendarService.GoogleCalendarService.prototype, 'listEvents').mockResolvedValue([
        {
          id: 'orphaned-event',
          summary: 'Random Event',
          start: { dateTime: new Date(Date.now() + 86400000).toISOString() },
          end: { dateTime: new Date(Date.now() + 86400000 + 3600000).toISOString() },
          created: new Date().toISOString(),
        },
      ] as any)

      await syncService.pullGoogleCalendarEvents(workspace.trainer.id)

      // Should create blocked time and update mapping
      const mapping = await prisma.calendarEventMapping.findUnique({
        where: {
          provider_externalEventId: {
            provider: 'google',
            externalEventId: 'orphaned-event',
          },
        },
      })

      expect(mapping?.blockedTimeId).toBeDefined()

      const blockedTime = await prisma.blockedTime.findUnique({
        where: { id: mapping!.blockedTimeId! },
      })

      expect(blockedTime).toBeDefined()
      expect(blockedTime?.reason).toContain('Random Event')
    })

    it('should keep blocked time as-is when already exists (no auto-conversion)', async () => {
      // Create a blocked time first
      const blockedTime = await prisma.blockedTime.create({
        data: {
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          startTime: new Date(Date.now() + 86400000),
          endTime: new Date(Date.now() + 86400000 + 3600000),
          reason: 'Google Calendar: Unknown Event',
          isRecurring: false,
        },
      })

      // Create mapping pointing to blocked time
      await prisma.calendarEventMapping.create({
        data: {
          workspaceId: workspace.workspace.id,
          blockedTimeId: blockedTime.id,
          provider: 'google',
          externalEventId: 'existing-blocked',
          externalCalendarId: 'primary',
          syncDirection: 'inbound',
        },
      })

      const GoogleCalendarService = await import('@/lib/google-calendar')
      vi.spyOn(GoogleCalendarService.GoogleCalendarService.prototype, 'listEvents').mockResolvedValue([
        {
          id: 'existing-blocked',
          summary: workspace.client.fullName, // Even though it matches a client
          start: { dateTime: new Date(Date.now() + 86400000).toISOString() },
          end: { dateTime: new Date(Date.now() + 86400000 + 3600000).toISOString() },
          created: new Date().toISOString(),
        },
      ] as any)

      await syncService.pullGoogleCalendarEvents(workspace.trainer.id)

      // Verify blocked time still exists (not auto-converted)
      const updatedBlockedTime = await prisma.blockedTime.findUnique({
        where: { id: blockedTime.id },
      })

      expect(updatedBlockedTime).toBeDefined()

      // Verify mapping still points to blocked time
      const mapping = await prisma.calendarEventMapping.findUnique({
        where: {
          provider_externalEventId: {
            provider: 'google',
            externalEventId: 'existing-blocked',
          },
        },
      })

      expect(mapping?.blockedTimeId).toBe(blockedTime.id)
      expect(mapping?.appointmentId).toBeNull()
    })
  })
})
