import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from '@/app/api/appointments/route'
import { prisma } from '@/lib/db'
import {
  createTestWorkspace,
  createClientWithGroupSettings,
  createAppointment,
  createAppointmentWithGroupOverride,
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

// Mock InvoiceService
vi.mock('@/lib/services/invoice', () => ({
  InvoiceService: class MockInvoiceService {
    async generatePerSessionInvoice() {
      return Promise.resolve()
    }
  },
}))

import { auth } from '@/lib/auth'

type AppointmentWithAvailability = {
  id: string
  displayType: 'OWN' | 'GROUP_AVAILABLE' | 'UNAVAILABLE'
  isOwnAppointment: boolean
  isAvailableForGroupBooking: boolean
  groupSessionWith: string | null
  status: string
}

describe('Appointments Availability API - checkAvailability mode', () => {
  let workspace: Awaited<ReturnType<typeof createTestWorkspace>>
  let clientCaller: Awaited<ReturnType<typeof createClientWithGroupSettings>>
  let clientAllowAll: Awaited<ReturnType<typeof createClientWithGroupSettings>>
  let clientAllowSpecific: Awaited<ReturnType<typeof createClientWithGroupSettings>>
  let clientNoGroup: Awaited<ReturnType<typeof createClientWithGroupSettings>>

  beforeEach(async () => {
    workspace = await createTestWorkspace()

    // Client who will be making the request (the "caller")
    clientCaller = await createClientWithGroupSettings({
      workspaceId: workspace.workspace.id,
      permission: 'NO_GROUP_SESSIONS',
      discoverable: true,
      fullName: 'Caller Client',
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

    // Mock auth to return caller client session
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: clientCaller.user.id,
        email: clientCaller.user.email,
        name: clientCaller.user.fullName,
        role: 'CLIENT',
        workspaceId: workspace.workspace.id,
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })
  })

  describe('GET /api/appointments?checkAvailability=true', () => {
    it('should return displayType for each appointment', async () => {
      // Create a future appointment for clientAllowAll
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

      const request = new Request('http://localhost:3000/api/appointments?checkAvailability=true')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.appointments).toBeDefined()
      expect(data.appointments.length).toBeGreaterThanOrEqual(1)

      // All appointments should have displayType
      data.appointments.forEach((apt: AppointmentWithAvailability) => {
        expect(apt.displayType).toBeDefined()
        expect(['OWN', 'GROUP_AVAILABLE', 'UNAVAILABLE']).toContain(apt.displayType)
      })
    })

    it('should show OWN for caller\'s own appointments', async () => {
      // Create appointment for the caller
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const endTime = new Date(tomorrow)
      endTime.setHours(11, 0, 0, 0)

      const ownAppointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: clientCaller.user.id,
        workspaceId: workspace.workspace.id,
        startTime: tomorrow,
        endTime: endTime,
        status: 'SCHEDULED',
      })

      const request = new Request('http://localhost:3000/api/appointments?checkAvailability=true')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      const myApt = data.appointments.find((apt: AppointmentWithAvailability) => apt.id === ownAppointment.id)
      expect(myApt).toBeDefined()
      expect(myApt.displayType).toBe('OWN')
      expect(myApt.isOwnAppointment).toBe(true)
    })

    it('should show GROUP_AVAILABLE for ALLOW_ALL_GROUP appointments', async () => {
      // Create appointment for client with ALLOW_ALL_GROUP
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const endTime = new Date(tomorrow)
      endTime.setHours(11, 0, 0, 0)

      const allowAllAppointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: clientAllowAll.user.id,
        workspaceId: workspace.workspace.id,
        startTime: tomorrow,
        endTime: endTime,
        status: 'SCHEDULED',
      })

      const request = new Request('http://localhost:3000/api/appointments?checkAvailability=true')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      const apt = data.appointments.find((a: AppointmentWithAvailability) => a.id === allowAllAppointment.id)
      expect(apt).toBeDefined()
      expect(apt.displayType).toBe('GROUP_AVAILABLE')
      expect(apt.isAvailableForGroupBooking).toBe(true)
      expect(apt.groupSessionWith).toBe('Allow All Client')
    })

    it('should show GROUP_AVAILABLE for ALLOW_SPECIFIC when caller is in allowed list', async () => {
      // Add caller to clientAllowSpecific's allowed list
      await addAllowedClient(clientAllowSpecific.profile.id, clientCaller.profile.id)

      // Create appointment for client with ALLOW_SPECIFIC_CLIENTS
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const endTime = new Date(tomorrow)
      endTime.setHours(11, 0, 0, 0)

      const specificAppointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: clientAllowSpecific.user.id,
        workspaceId: workspace.workspace.id,
        startTime: tomorrow,
        endTime: endTime,
        status: 'SCHEDULED',
      })

      const request = new Request('http://localhost:3000/api/appointments?checkAvailability=true')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      const apt = data.appointments.find((a: AppointmentWithAvailability) => a.id === specificAppointment.id)
      expect(apt).toBeDefined()
      expect(apt.displayType).toBe('GROUP_AVAILABLE')
      expect(apt.groupSessionWith).toBe('Allow Specific Client')
    })

    it('should show UNAVAILABLE for ALLOW_SPECIFIC when caller is NOT in allowed list', async () => {
      // Do NOT add caller to clientAllowSpecific's allowed list

      // Create appointment for client with ALLOW_SPECIFIC_CLIENTS
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const endTime = new Date(tomorrow)
      endTime.setHours(11, 0, 0, 0)

      const specificAppointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: clientAllowSpecific.user.id,
        workspaceId: workspace.workspace.id,
        startTime: tomorrow,
        endTime: endTime,
        status: 'SCHEDULED',
      })

      const request = new Request('http://localhost:3000/api/appointments?checkAvailability=true')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      const apt = data.appointments.find((a: AppointmentWithAvailability) => a.id === specificAppointment.id)
      expect(apt).toBeDefined()
      expect(apt.displayType).toBe('UNAVAILABLE')
      expect(apt.isAvailableForGroupBooking).toBe(false)
      expect(apt.groupSessionWith).toBeNull()
    })

    it('should show UNAVAILABLE for NO_GROUP_SESSIONS appointments', async () => {
      // Create appointment for client with NO_GROUP_SESSIONS
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const endTime = new Date(tomorrow)
      endTime.setHours(11, 0, 0, 0)

      const noGroupAppointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: clientNoGroup.user.id,
        workspaceId: workspace.workspace.id,
        startTime: tomorrow,
        endTime: endTime,
        status: 'SCHEDULED',
      })

      const request = new Request('http://localhost:3000/api/appointments?checkAvailability=true')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      const apt = data.appointments.find((a: AppointmentWithAvailability) => a.id === noGroupAppointment.id)
      expect(apt).toBeDefined()
      expect(apt.displayType).toBe('UNAVAILABLE')
      expect(apt.isAvailableForGroupBooking).toBe(false)
    })

    it('should show UNAVAILABLE for COMPLETED appointments (past)', async () => {
      // Create a past completed appointment for ALLOW_ALL client
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(10, 0, 0, 0)
      const endTime = new Date(yesterday)
      endTime.setHours(11, 0, 0, 0)

      const completedAppointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: clientAllowAll.user.id,
        workspaceId: workspace.workspace.id,
        startTime: yesterday,
        endTime: endTime,
        status: 'COMPLETED',
      })

      const request = new Request('http://localhost:3000/api/appointments?checkAvailability=true')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      const apt = data.appointments.find((a: AppointmentWithAvailability) => a.id === completedAppointment.id)
      expect(apt).toBeDefined()
      expect(apt.displayType).toBe('UNAVAILABLE')
      expect(apt.status).toBe('COMPLETED')
    })

    it('should use groupSessionOverride when set on appointment', async () => {
      // Create appointment with override that BLOCKS group sessions
      // even though client allows all by default
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const endTime = new Date(tomorrow)
      endTime.setHours(11, 0, 0, 0)

      const overrideAppointment = await createAppointmentWithGroupOverride({
        trainerId: workspace.trainer.id,
        clientId: clientAllowAll.user.id,
        workspaceId: workspace.workspace.id,
        startTime: tomorrow,
        endTime: endTime,
        status: 'SCHEDULED',
        groupSessionOverride: 'NO_GROUP', // Override to block
      })

      const request = new Request('http://localhost:3000/api/appointments?checkAvailability=true')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      const apt = data.appointments.find((a: AppointmentWithAvailability) => a.id === overrideAppointment.id)
      expect(apt).toBeDefined()
      expect(apt.displayType).toBe('UNAVAILABLE') // Override blocks group booking
    })

    it('should use groupSessionOverride ALLOW_ALL to enable group sessions', async () => {
      // Create appointment with override that ALLOWS group sessions
      // even though client default is NO_GROUP
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const endTime = new Date(tomorrow)
      endTime.setHours(11, 0, 0, 0)

      const overrideAppointment = await createAppointmentWithGroupOverride({
        trainerId: workspace.trainer.id,
        clientId: clientNoGroup.user.id,
        workspaceId: workspace.workspace.id,
        startTime: tomorrow,
        endTime: endTime,
        status: 'SCHEDULED',
        groupSessionOverride: 'ALLOW_ALL', // Override to allow
      })

      const request = new Request('http://localhost:3000/api/appointments?checkAvailability=true')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      const apt = data.appointments.find((a: AppointmentWithAvailability) => a.id === overrideAppointment.id)
      expect(apt).toBeDefined()
      expect(apt.displayType).toBe('GROUP_AVAILABLE') // Override enables group booking
      expect(apt.groupSessionWith).toBe('No Group Client')
    })

    it('should include appointments from current week including past', async () => {
      // Create a past completed appointment earlier this week
      const startOfWeek = new Date()
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()) // Sunday
      startOfWeek.setHours(10, 0, 0, 0)
      const endOfAppointment = new Date(startOfWeek)
      endOfAppointment.setHours(11, 0, 0, 0)

      const pastAppointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: clientCaller.user.id, // Own appointment
        workspaceId: workspace.workspace.id,
        startTime: startOfWeek,
        endTime: endOfAppointment,
        status: 'COMPLETED',
      })

      const request = new Request('http://localhost:3000/api/appointments?checkAvailability=true')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      // Should include the past appointment
      const apt = data.appointments.find((a: AppointmentWithAvailability) => a.id === pastAppointment.id)
      expect(apt).toBeDefined()
      expect(apt.displayType).toBe('OWN')
    })

    it('should not include appointments from other workspaces', async () => {
      // Create another workspace
      const workspace2 = await createTestWorkspace()
      const otherClient = await createClientWithGroupSettings({
        workspaceId: workspace2.workspace.id,
        permission: 'ALLOW_ALL_GROUP',
        discoverable: true,
        fullName: 'Other Workspace Client',
      })

      // Create appointment in other workspace
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const endTime = new Date(tomorrow)
      endTime.setHours(11, 0, 0, 0)

      const otherAppointment = await createAppointment({
        trainerId: workspace2.trainer.id,
        clientId: otherClient.user.id,
        workspaceId: workspace2.workspace.id,
        startTime: tomorrow,
        endTime: endTime,
        status: 'SCHEDULED',
      })

      const request = new Request('http://localhost:3000/api/appointments?checkAvailability=true')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      // Should NOT include appointment from other workspace
      const apt = data.appointments.find((a: AppointmentWithAvailability) => a.id === otherAppointment.id)
      expect(apt).toBeUndefined()
    })

    it('should not expose client info for UNAVAILABLE appointments', async () => {
      // Create appointment for NO_GROUP client
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const endTime = new Date(tomorrow)
      endTime.setHours(11, 0, 0, 0)

      const unavailableAppointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: clientNoGroup.user.id,
        workspaceId: workspace.workspace.id,
        startTime: tomorrow,
        endTime: endTime,
        status: 'SCHEDULED',
      })

      const request = new Request('http://localhost:3000/api/appointments?checkAvailability=true')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      const apt = data.appointments.find((a: AppointmentWithAvailability) => a.id === unavailableAppointment.id)
      expect(apt).toBeDefined()
      expect(apt.displayType).toBe('UNAVAILABLE')
      expect(apt.client).toBeNull() // Client info should be hidden
      expect(apt.groupSessionWith).toBeNull()
    })

    it('should handle date range filtering', async () => {
      // Create appointment far in the future
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)
      futureDate.setHours(10, 0, 0, 0)
      const endTime = new Date(futureDate)
      endTime.setHours(11, 0, 0, 0)

      const futureAppointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: clientAllowAll.user.id,
        workspaceId: workspace.workspace.id,
        startTime: futureDate,
        endTime: endTime,
        status: 'SCHEDULED',
      })

      // Request with date range that excludes the future appointment
      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 7)

      const request = new Request(
        `http://localhost:3000/api/appointments?checkAvailability=true&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      // Should NOT include the far future appointment
      const apt = data.appointments.find((a: AppointmentWithAvailability) => a.id === futureAppointment.id)
      expect(apt).toBeUndefined()
    })
  })
})
