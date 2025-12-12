import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET as GetAllowedClients, POST as AddAllowedClient } from '@/app/api/client/group-session-allowed-clients/route'
import { GET as GetAppointments } from '@/app/api/appointments/route'
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
  client: { id: string; fullName: string } | null
  groupSessionWith: string | null
}

describe('Group Sessions Security Tests', () => {
  let workspace1: Awaited<ReturnType<typeof createTestWorkspace>>
  let workspace2: Awaited<ReturnType<typeof createTestWorkspace>>
  let clientW1: Awaited<ReturnType<typeof createClientWithGroupSettings>>
  let clientW2: Awaited<ReturnType<typeof createClientWithGroupSettings>>

  beforeEach(async () => {
    // Create two separate workspaces for isolation testing
    workspace1 = await createTestWorkspace()
    workspace2 = await createTestWorkspace()

    // Create a client in workspace 1
    clientW1 = await createClientWithGroupSettings({
      workspaceId: workspace1.workspace.id,
      permission: 'ALLOW_ALL_GROUP',
      discoverable: true,
      fullName: 'Workspace 1 Client',
    })

    // Create a client in workspace 2
    clientW2 = await createClientWithGroupSettings({
      workspaceId: workspace2.workspace.id,
      permission: 'ALLOW_ALL_GROUP',
      discoverable: true,
      fullName: 'Workspace 2 Client',
    })
  })

  describe('Multi-Tenancy Isolation', () => {
    it('should not allow seeing clients from other workspaces in discoverable list', async () => {
      // Client in workspace 1 tries to see discoverable clients
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: clientW1.user.id,
          email: clientW1.user.email,
          name: clientW1.user.fullName,
          role: 'CLIENT',
          workspaceId: workspace1.workspace.id,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      })

      const response = await GetAllowedClients()
      const data = await response.json()

      expect(response.status).toBe(200)

      // Should NOT see clientW2 (from workspace 2)
      const foundW2Client = data.discoverableClients.find(
        (c: { profileId: string }) => c.profileId === clientW2.profile.id
      )
      expect(foundW2Client).toBeUndefined()
    })

    it('should not allow adding clients from other workspaces to allowed list', async () => {
      // Client in workspace 1 tries to add client from workspace 2
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: clientW1.user.id,
          email: clientW1.user.email,
          name: clientW1.user.fullName,
          role: 'CLIENT',
          workspaceId: workspace1.workspace.id,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      })

      const request = new Request('http://localhost:3000/api/client/group-session-allowed-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedClientProfileId: clientW2.profile.id }),
      })

      const response = await AddAllowedClient(request)
      const data = await response.json()

      // Should be rejected - client not found in same workspace
      expect(response.status).toBe(404)
      expect(data.error).toBe('Client not found or not discoverable')
    })

    it('should not show appointments from other workspaces in availability check', async () => {
      // Create appointment in workspace 2
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const endTime = new Date(tomorrow)
      endTime.setHours(11, 0, 0, 0)

      const w2Appointment = await createAppointment({
        trainerId: workspace2.trainer.id,
        clientId: clientW2.user.id,
        workspaceId: workspace2.workspace.id,
        startTime: tomorrow,
        endTime: endTime,
        status: 'SCHEDULED',
      })

      // Client in workspace 1 checks availability
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: clientW1.user.id,
          email: clientW1.user.email,
          name: clientW1.user.fullName,
          role: 'CLIENT',
          workspaceId: workspace1.workspace.id,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      })

      const request = new Request('http://localhost:3000/api/appointments?checkAvailability=true')
      const response = await GetAppointments(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      // Should NOT see workspace 2 appointment
      const foundW2Appointment = data.appointments.find(
        (apt: AppointmentWithAvailability) => apt.id === w2Appointment.id
      )
      expect(foundW2Appointment).toBeUndefined()
    })
  })

  describe('Data Privacy - Client Info Exposure', () => {
    let callerClient: Awaited<ReturnType<typeof createClientWithGroupSettings>>
    let unavailableClient: Awaited<ReturnType<typeof createClientWithGroupSettings>>

    beforeEach(async () => {
      // Create caller client in workspace 1
      callerClient = await createClientWithGroupSettings({
        workspaceId: workspace1.workspace.id,
        permission: 'NO_GROUP_SESSIONS',
        discoverable: true,
        fullName: 'Caller Client',
      })

      // Create client with NO_GROUP permission (will have UNAVAILABLE appointments)
      unavailableClient = await createClientWithGroupSettings({
        workspaceId: workspace1.workspace.id,
        permission: 'NO_GROUP_SESSIONS',
        discoverable: false,
        fullName: 'Secret Client',
      })

      vi.mocked(auth).mockResolvedValue({
        user: {
          id: callerClient.user.id,
          email: callerClient.user.email,
          name: callerClient.user.fullName,
          role: 'CLIENT',
          workspaceId: workspace1.workspace.id,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      })
    })

    it('should hide client info for UNAVAILABLE appointments', async () => {
      // Create appointment for unavailable client
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const endTime = new Date(tomorrow)
      endTime.setHours(11, 0, 0, 0)

      const unavailableAppointment = await createAppointment({
        trainerId: workspace1.trainer.id,
        clientId: unavailableClient.user.id,
        workspaceId: workspace1.workspace.id,
        startTime: tomorrow,
        endTime: endTime,
        status: 'SCHEDULED',
      })

      const request = new Request('http://localhost:3000/api/appointments?checkAvailability=true')
      const response = await GetAppointments(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      const apt = data.appointments.find(
        (a: AppointmentWithAvailability) => a.id === unavailableAppointment.id
      )
      expect(apt).toBeDefined()
      expect(apt.displayType).toBe('UNAVAILABLE')

      // Client info should be hidden
      expect(apt.client).toBeNull()
      expect(apt.groupSessionWith).toBeNull()
    })

    it('should only expose groupSessionWith for GROUP_AVAILABLE appointments', async () => {
      // Create appointment for ALLOW_ALL client (visible)
      const groupClient = await createClientWithGroupSettings({
        workspaceId: workspace1.workspace.id,
        permission: 'ALLOW_ALL_GROUP',
        discoverable: true,
        fullName: 'Group Friendly Client',
      })

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const endTime = new Date(tomorrow)
      endTime.setHours(11, 0, 0, 0)

      const groupAppointment = await createAppointment({
        trainerId: workspace1.trainer.id,
        clientId: groupClient.user.id,
        workspaceId: workspace1.workspace.id,
        startTime: tomorrow,
        endTime: endTime,
        status: 'SCHEDULED',
      })

      const request = new Request('http://localhost:3000/api/appointments?checkAvailability=true')
      const response = await GetAppointments(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      const apt = data.appointments.find(
        (a: AppointmentWithAvailability) => a.id === groupAppointment.id
      )
      expect(apt).toBeDefined()
      expect(apt.displayType).toBe('GROUP_AVAILABLE')

      // Client name should be exposed only for GROUP_AVAILABLE
      expect(apt.groupSessionWith).toBe('Group Friendly Client')
    })
  })

  describe('Permission Enforcement', () => {
    it('should prevent trainers from accessing client-only endpoints', async () => {
      // Trainer tries to access allowed clients endpoint
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: workspace1.trainer.id,
          email: workspace1.trainer.email,
          name: workspace1.trainer.fullName,
          role: 'TRAINER',
          workspaceId: workspace1.workspace.id,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      })

      const response = await GetAllowedClients()
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - client access only')
    })

    it('should only show discoverable clients in discoverable list', async () => {
      // Create a non-discoverable client
      const nonDiscoverableClient = await createClientWithGroupSettings({
        workspaceId: workspace1.workspace.id,
        permission: 'ALLOW_ALL_GROUP',
        discoverable: false, // NOT discoverable
        fullName: 'Hidden Client',
      })

      // Create a discoverable client
      const discoverableClient = await createClientWithGroupSettings({
        workspaceId: workspace1.workspace.id,
        permission: 'NO_GROUP_SESSIONS',
        discoverable: true,
        fullName: 'Visible Client',
      })

      // Client checks discoverable list
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: clientW1.user.id,
          email: clientW1.user.email,
          name: clientW1.user.fullName,
          role: 'CLIENT',
          workspaceId: workspace1.workspace.id,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      })

      const response = await GetAllowedClients()
      const data = await response.json()

      expect(response.status).toBe(200)

      // Should find discoverable client
      const foundDiscoverable = data.discoverableClients.find(
        (c: { profileId: string }) => c.profileId === discoverableClient.profile.id
      )
      expect(foundDiscoverable).toBeDefined()

      // Should NOT find non-discoverable client
      const foundNonDiscoverable = data.discoverableClients.find(
        (c: { profileId: string }) => c.profileId === nonDiscoverableClient.profile.id
      )
      expect(foundNonDiscoverable).toBeUndefined()
    })

    it('should prevent adding non-discoverable clients to allowed list', async () => {
      // Create a non-discoverable client
      const nonDiscoverableClient = await createClientWithGroupSettings({
        workspaceId: workspace1.workspace.id,
        permission: 'ALLOW_ALL_GROUP',
        discoverable: false,
        fullName: 'Hidden Client',
      })

      // Client tries to add non-discoverable client
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: clientW1.user.id,
          email: clientW1.user.email,
          name: clientW1.user.fullName,
          role: 'CLIENT',
          workspaceId: workspace1.workspace.id,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      })

      const request = new Request('http://localhost:3000/api/client/group-session-allowed-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedClientProfileId: nonDiscoverableClient.profile.id }),
      })

      const response = await AddAllowedClient(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Client not found or not discoverable')
    })
  })

  describe('ALLOW_SPECIFIC Permission Checks', () => {
    let specificClient: Awaited<ReturnType<typeof createClientWithGroupSettings>>
    let allowedClient: Awaited<ReturnType<typeof createClientWithGroupSettings>>
    let notAllowedClient: Awaited<ReturnType<typeof createClientWithGroupSettings>>

    beforeEach(async () => {
      // Client with ALLOW_SPECIFIC permission
      specificClient = await createClientWithGroupSettings({
        workspaceId: workspace1.workspace.id,
        permission: 'ALLOW_SPECIFIC_CLIENTS',
        discoverable: true,
        fullName: 'Specific Permission Client',
      })

      // Client who IS allowed
      allowedClient = await createClientWithGroupSettings({
        workspaceId: workspace1.workspace.id,
        permission: 'NO_GROUP_SESSIONS',
        discoverable: true,
        fullName: 'Allowed Client',
      })

      // Client who is NOT allowed
      notAllowedClient = await createClientWithGroupSettings({
        workspaceId: workspace1.workspace.id,
        permission: 'NO_GROUP_SESSIONS',
        discoverable: true,
        fullName: 'Not Allowed Client',
      })

      // Add allowedClient to specificClient's allowed list
      await addAllowedClient(specificClient.profile.id, allowedClient.profile.id)
    })

    it('should show GROUP_AVAILABLE to clients in allowed list', async () => {
      // Create appointment for specificClient
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const endTime = new Date(tomorrow)
      endTime.setHours(11, 0, 0, 0)

      const appointment = await createAppointment({
        trainerId: workspace1.trainer.id,
        clientId: specificClient.user.id,
        workspaceId: workspace1.workspace.id,
        startTime: tomorrow,
        endTime: endTime,
        status: 'SCHEDULED',
      })

      // allowedClient checks availability
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: allowedClient.user.id,
          email: allowedClient.user.email,
          name: allowedClient.user.fullName,
          role: 'CLIENT',
          workspaceId: workspace1.workspace.id,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      })

      const request = new Request('http://localhost:3000/api/appointments?checkAvailability=true')
      const response = await GetAppointments(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      const apt = data.appointments.find(
        (a: AppointmentWithAvailability) => a.id === appointment.id
      )
      expect(apt).toBeDefined()
      expect(apt.displayType).toBe('GROUP_AVAILABLE')
    })

    it('should show UNAVAILABLE to clients NOT in allowed list', async () => {
      // Create appointment for specificClient
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const endTime = new Date(tomorrow)
      endTime.setHours(11, 0, 0, 0)

      const appointment = await createAppointment({
        trainerId: workspace1.trainer.id,
        clientId: specificClient.user.id,
        workspaceId: workspace1.workspace.id,
        startTime: tomorrow,
        endTime: endTime,
        status: 'SCHEDULED',
      })

      // notAllowedClient checks availability
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: notAllowedClient.user.id,
          email: notAllowedClient.user.email,
          name: notAllowedClient.user.fullName,
          role: 'CLIENT',
          workspaceId: workspace1.workspace.id,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      })

      const request = new Request('http://localhost:3000/api/appointments?checkAvailability=true')
      const response = await GetAppointments(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      const apt = data.appointments.find(
        (a: AppointmentWithAvailability) => a.id === appointment.id
      )
      expect(apt).toBeDefined()
      expect(apt.displayType).toBe('UNAVAILABLE')
    })
  })
})
