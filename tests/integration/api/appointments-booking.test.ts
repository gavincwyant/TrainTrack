import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '@/app/api/appointments/route'
import { prisma } from '@/lib/db'
import {
  createTestWorkspace,
  createClientWithGroupSettings,
  createAppointment,
  addAllowedClient,
} from '@/tests/fixtures/workspace'

// Mock the auth module
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// Mock CalendarSyncService
vi.mock('@/lib/services/calendar-sync', () => ({
  CalendarSyncService: class MockCalendarSyncService {
    async syncAppointmentToGoogle() {
      return Promise.resolve()
    }
  },
}))

import { auth } from '@/lib/auth'

describe('Appointments Booking API - Group Session Validation', () => {
  let workspace: Awaited<ReturnType<typeof createTestWorkspace>>
  let clientBooker: Awaited<ReturnType<typeof createClientWithGroupSettings>>
  let clientAllowAll: Awaited<ReturnType<typeof createClientWithGroupSettings>>
  let clientAllowSpecific: Awaited<ReturnType<typeof createClientWithGroupSettings>>
  let clientNoGroup: Awaited<ReturnType<typeof createClientWithGroupSettings>>

  beforeEach(async () => {
    workspace = await createTestWorkspace()

    // Client who will be booking (the "booker")
    clientBooker = await createClientWithGroupSettings({
      workspaceId: workspace.workspace.id,
      permission: 'NO_GROUP_SESSIONS',
      discoverable: true,
      fullName: 'Booker Client',
    })

    // Client with ALLOW_ALL_GROUP permission
    clientAllowAll = await createClientWithGroupSettings({
      workspaceId: workspace.workspace.id,
      permission: 'ALLOW_ALL_GROUP',
      discoverable: true,
      fullName: 'Allow All Client',
    })

    // Client with ALLOW_SPECIFIC_CLIENTS permission
    clientAllowSpecific = await createClientWithGroupSettings({
      workspaceId: workspace.workspace.id,
      permission: 'ALLOW_SPECIFIC_CLIENTS',
      discoverable: true,
      fullName: 'Allow Specific Client',
    })

    // Client with NO_GROUP_SESSIONS permission
    clientNoGroup = await createClientWithGroupSettings({
      workspaceId: workspace.workspace.id,
      permission: 'NO_GROUP_SESSIONS',
      discoverable: false,
      fullName: 'No Group Client',
    })

    // Mock auth to return booker client session
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: clientBooker.user.id,
        email: clientBooker.user.email,
        name: clientBooker.user.fullName,
        role: 'CLIENT',
        workspaceId: workspace.workspace.id,
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })
  })

  describe('POST /api/appointments - Client booking', () => {
    it('should allow client to book an empty time slot', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const endTime = new Date(tomorrow)
      endTime.setHours(11, 0, 0, 0)

      const request = new Request('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: tomorrow.toISOString(),
          endTime: endTime.toISOString(),
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.appointment).toBeDefined()
      expect(data.appointment.clientId).toBe(clientBooker.user.id)
    })

    it('should allow booking when existing appointment has ALLOW_ALL_GROUP', async () => {
      // Create existing appointment for ALLOW_ALL client
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const endTime = new Date(tomorrow)
      endTime.setHours(11, 0, 0, 0)

      await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: clientAllowAll.user.id,
        workspaceId: workspace.workspace.id,
        startTime: tomorrow,
        endTime: endTime,
        status: 'SCHEDULED',
      })

      // Booker tries to book at the same time
      const request = new Request('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: tomorrow.toISOString(),
          endTime: endTime.toISOString(),
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.appointment).toBeDefined()
      expect(data.appointment.clientId).toBe(clientBooker.user.id)
    })

    it('should allow booking when booker is in ALLOW_SPECIFIC allowed list', async () => {
      // Add booker to clientAllowSpecific's allowed list
      await addAllowedClient(clientAllowSpecific.profile.id, clientBooker.profile.id)

      // Create existing appointment for ALLOW_SPECIFIC client
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const endTime = new Date(tomorrow)
      endTime.setHours(11, 0, 0, 0)

      await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: clientAllowSpecific.user.id,
        workspaceId: workspace.workspace.id,
        startTime: tomorrow,
        endTime: endTime,
        status: 'SCHEDULED',
      })

      // Booker tries to book at the same time
      const request = new Request('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: tomorrow.toISOString(),
          endTime: endTime.toISOString(),
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.appointment).toBeDefined()
    })

    it('should block booking when booker is NOT in ALLOW_SPECIFIC allowed list', async () => {
      // Do NOT add booker to clientAllowSpecific's allowed list

      // Create existing appointment for ALLOW_SPECIFIC client
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const endTime = new Date(tomorrow)
      endTime.setHours(11, 0, 0, 0)

      await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: clientAllowSpecific.user.id,
        workspaceId: workspace.workspace.id,
        startTime: tomorrow,
        endTime: endTime,
        status: 'SCHEDULED',
      })

      // Booker tries to book at the same time
      const request = new Request('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: tomorrow.toISOString(),
          endTime: endTime.toISOString(),
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('This time slot is not available for booking')
    })

    it('should block booking when existing appointment has NO_GROUP_SESSIONS', async () => {
      // Create existing appointment for NO_GROUP client
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const endTime = new Date(tomorrow)
      endTime.setHours(11, 0, 0, 0)

      await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: clientNoGroup.user.id,
        workspaceId: workspace.workspace.id,
        startTime: tomorrow,
        endTime: endTime,
        status: 'SCHEDULED',
      })

      // Booker tries to book at the same time
      const request = new Request('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: tomorrow.toISOString(),
          endTime: endTime.toISOString(),
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('This time slot is not available for booking')
    })

    it('should check ALL overlapping appointments for permission', async () => {
      // Create two overlapping appointments - one allows, one doesn't
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const endTime = new Date(tomorrow)
      endTime.setHours(11, 0, 0, 0)

      // First appointment - ALLOW_ALL (would allow)
      await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: clientAllowAll.user.id,
        workspaceId: workspace.workspace.id,
        startTime: tomorrow,
        endTime: endTime,
        status: 'SCHEDULED',
      })

      // Second overlapping appointment - NO_GROUP (blocks)
      const startTime2 = new Date(tomorrow)
      startTime2.setMinutes(30) // 10:30
      const endTime2 = new Date(tomorrow)
      endTime2.setHours(11, 30, 0, 0)

      await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: clientNoGroup.user.id,
        workspaceId: workspace.workspace.id,
        startTime: startTime2,
        endTime: endTime2,
        status: 'SCHEDULED',
      })

      // Booker tries to book at 10:30-11:30 (overlaps with both)
      const request = new Request('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: startTime2.toISOString(),
          endTime: endTime2.toISOString(),
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('This time slot is not available for booking')
    })

    it('should store groupSessionOverride when provided', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const endTime = new Date(tomorrow)
      endTime.setHours(11, 0, 0, 0)

      const request = new Request('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: tomorrow.toISOString(),
          endTime: endTime.toISOString(),
          groupSessionOverride: 'ALLOW_ALL',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.appointment).toBeDefined()

      // Verify in database
      const dbAppointment = await prisma.appointment.findUnique({
        where: { id: data.appointment.id },
      })
      expect(dbAppointment?.groupSessionOverride).toBe('ALLOW_ALL')
    })

    it('should not check permissions for COMPLETED appointments (past)', async () => {
      // Create a COMPLETED appointment - should not block booking
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const endTime = new Date(tomorrow)
      endTime.setHours(11, 0, 0, 0)

      await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: clientNoGroup.user.id,
        workspaceId: workspace.workspace.id,
        startTime: tomorrow,
        endTime: endTime,
        status: 'COMPLETED', // Already completed
      })

      // Booker tries to book at the same time
      const request = new Request('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: tomorrow.toISOString(),
          endTime: endTime.toISOString(),
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      // Should succeed because COMPLETED appointments don't block
      expect(response.status).toBe(201)
      expect(data.appointment).toBeDefined()
    })

    it('should not check permissions for CANCELLED appointments', async () => {
      // Create a CANCELLED appointment - should not block booking
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const endTime = new Date(tomorrow)
      endTime.setHours(11, 0, 0, 0)

      await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: clientNoGroup.user.id,
        workspaceId: workspace.workspace.id,
        startTime: tomorrow,
        endTime: endTime,
        status: 'CANCELLED',
      })

      // Booker tries to book at the same time
      const request = new Request('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: tomorrow.toISOString(),
          endTime: endTime.toISOString(),
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      // Should succeed because CANCELLED appointments don't block
      expect(response.status).toBe(201)
      expect(data.appointment).toBeDefined()
    })
  })

  describe('POST /api/appointments - Trainer booking', () => {
    beforeEach(() => {
      // Switch to trainer session
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: workspace.trainer.id,
          email: workspace.trainer.email,
          name: workspace.trainer.fullName,
          role: 'TRAINER',
          workspaceId: workspace.workspace.id,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      })
    })

    it('should allow trainer to book at any time (bypass permissions)', async () => {
      // Create existing appointment that would block a client
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const endTime = new Date(tomorrow)
      endTime.setHours(11, 0, 0, 0)

      await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: clientNoGroup.user.id,
        workspaceId: workspace.workspace.id,
        startTime: tomorrow,
        endTime: endTime,
        status: 'SCHEDULED',
      })

      // Trainer books another client at the same time
      const request = new Request('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientBooker.user.id,
          startTime: tomorrow.toISOString(),
          endTime: endTime.toISOString(),
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      // Trainer bypasses group session restrictions
      expect(response.status).toBe(201)
      expect(data.appointment).toBeDefined()
      expect(data.appointment.clientId).toBe(clientBooker.user.id)
    })

    it('should require clientId when trainer is booking', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const endTime = new Date(tomorrow)
      endTime.setHours(11, 0, 0, 0)

      const request = new Request('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Missing clientId
          startTime: tomorrow.toISOString(),
          endTime: endTime.toISOString(),
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Client ID is required when trainer is booking')
    })

    it('should store groupSessionOverride for trainer bookings', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const endTime = new Date(tomorrow)
      endTime.setHours(11, 0, 0, 0)

      const request = new Request('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientBooker.user.id,
          startTime: tomorrow.toISOString(),
          endTime: endTime.toISOString(),
          groupSessionOverride: 'NO_GROUP',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)

      // Verify in database
      const dbAppointment = await prisma.appointment.findUnique({
        where: { id: data.appointment.id },
      })
      expect(dbAppointment?.groupSessionOverride).toBe('NO_GROUP')
    })
  })

  describe('POST /api/appointments - Validation', () => {
    it('should reject if end time is before start time', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(11, 0, 0, 0) // Later
      const endTime = new Date(tomorrow)
      endTime.setHours(10, 0, 0, 0) // Earlier

      const request = new Request('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: tomorrow.toISOString(),
          endTime: endTime.toISOString(),
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('End time must be after start time')
    })

    it('should reject invalid datetime format', async () => {
      const request = new Request('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: 'not-a-date',
          endTime: 'also-not-a-date',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid input data')
    })
  })
})
