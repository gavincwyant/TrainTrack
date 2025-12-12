import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST, DELETE } from '@/app/api/client/group-session-allowed-clients/route'
import { prisma } from '@/lib/db'
import {
  createTestWorkspace,
  createClientWithGroupSettings,
  addAllowedClient,
} from '@/tests/fixtures/workspace'

// Mock the auth module
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

import { auth } from '@/lib/auth'

describe('Group Session Allowed Clients API', () => {
  let workspace: Awaited<ReturnType<typeof createTestWorkspace>>
  let clientA: Awaited<ReturnType<typeof createClientWithGroupSettings>>
  let clientB: Awaited<ReturnType<typeof createClientWithGroupSettings>>
  let clientC: Awaited<ReturnType<typeof createClientWithGroupSettings>>

  beforeEach(async () => {
    workspace = await createTestWorkspace()

    // Client A - caller, will use ALLOW_SPECIFIC_CLIENTS
    clientA = await createClientWithGroupSettings({
      workspaceId: workspace.workspace.id,
      permission: 'ALLOW_SPECIFIC_CLIENTS',
      discoverable: true,
      fullName: 'Client A',
    })

    // Client B - discoverable, can be added to allowed list
    clientB = await createClientWithGroupSettings({
      workspaceId: workspace.workspace.id,
      permission: 'NO_GROUP_SESSIONS',
      discoverable: true,
      fullName: 'Client B',
    })

    // Client C - NOT discoverable
    clientC = await createClientWithGroupSettings({
      workspaceId: workspace.workspace.id,
      permission: 'NO_GROUP_SESSIONS',
      discoverable: false,
      fullName: 'Client C',
    })

    // Mock auth to return Client A session
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: clientA.user.id,
        email: clientA.user.email,
        name: clientA.user.fullName,
        role: 'CLIENT',
        workspaceId: workspace.workspace.id,
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })
  })

  describe('GET /api/client/group-session-allowed-clients', () => {
    it('should return empty allowed clients list initially', async () => {
      const request = new Request('http://localhost:3000/api/client/group-session-allowed-clients')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.allowedClients).toBeDefined()
      expect(data.allowedClients).toHaveLength(0)
    })

    it('should return allowed clients when they exist', async () => {
      // Add Client B to Client A's allowed list
      await addAllowedClient(clientA.profile.id, clientB.profile.id)

      const request = new Request('http://localhost:3000/api/client/group-session-allowed-clients')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.allowedClients).toHaveLength(1)
      expect(data.allowedClients[0].fullName).toBe('Client B')
      expect(data.allowedClients[0].profileId).toBe(clientB.profile.id)
    })

    it('should return discoverable clients (excluding self)', async () => {
      const request = new Request('http://localhost:3000/api/client/group-session-allowed-clients')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.discoverableClients).toBeDefined()

      // Should include Client B (discoverable) but NOT Client A (self) or Client C (not discoverable)
      const discoverableIds = data.discoverableClients.map((c: { profileId: string }) => c.profileId)
      expect(discoverableIds).toContain(clientB.profile.id)
      expect(discoverableIds).not.toContain(clientA.profile.id)
      expect(discoverableIds).not.toContain(clientC.profile.id)
    })

    it('should not include non-discoverable clients in discoverable list', async () => {
      const request = new Request('http://localhost:3000/api/client/group-session-allowed-clients')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)

      // Client C should not appear in discoverable list
      const foundClientC = data.discoverableClients.find(
        (c: { profileId: string }) => c.profileId === clientC.profile.id
      )
      expect(foundClientC).toBeUndefined()
    })

    it('should return 403 for trainer users', async () => {
      // Mock auth to return trainer session
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

      const request = new Request('http://localhost:3000/api/client/group-session-allowed-clients')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - client access only')
    })

    it('should not return clients from other workspaces', async () => {
      // Create another workspace with discoverable client
      const workspace2 = await createTestWorkspace()
      const clientOtherWorkspace = await createClientWithGroupSettings({
        workspaceId: workspace2.workspace.id,
        permission: 'NO_GROUP_SESSIONS',
        discoverable: true,
        fullName: 'Other Workspace Client',
      })

      const request = new Request('http://localhost:3000/api/client/group-session-allowed-clients')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)

      // Should NOT include client from other workspace
      const foundOtherClient = data.discoverableClients.find(
        (c: { profileId: string }) => c.profileId === clientOtherWorkspace.profile.id
      )
      expect(foundOtherClient).toBeUndefined()
    })
  })

  describe('POST /api/client/group-session-allowed-clients', () => {
    it('should add a discoverable client to allowed list', async () => {
      const request = new Request('http://localhost:3000/api/client/group-session-allowed-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedClientProfileId: clientB.profile.id }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.allowedClient).toBeDefined()
      expect(data.allowedClient.fullName).toBe('Client B')

      // Verify in database
      const dbRecord = await prisma.groupSessionAllowedClient.findFirst({
        where: {
          allowerProfileId: clientA.profile.id,
          allowedProfileId: clientB.profile.id,
        },
      })
      expect(dbRecord).not.toBeNull()
    })

    it('should reject adding non-discoverable client', async () => {
      const request = new Request('http://localhost:3000/api/client/group-session-allowed-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedClientProfileId: clientC.profile.id }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Client not found or not discoverable')
    })

    it('should reject duplicate additions', async () => {
      // First add Client B
      await addAllowedClient(clientA.profile.id, clientB.profile.id)

      // Try to add again
      const request = new Request('http://localhost:3000/api/client/group-session-allowed-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedClientProfileId: clientB.profile.id }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Client already in allowed list')
    })

    it('should reject adding self to allowed list', async () => {
      const request = new Request('http://localhost:3000/api/client/group-session-allowed-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedClientProfileId: clientA.profile.id }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot add yourself to allowed list')
    })

    it('should reject adding client from different workspace', async () => {
      // Create another workspace with discoverable client
      const workspace2 = await createTestWorkspace()
      const clientOtherWorkspace = await createClientWithGroupSettings({
        workspaceId: workspace2.workspace.id,
        permission: 'NO_GROUP_SESSIONS',
        discoverable: true,
        fullName: 'Other Workspace Client',
      })

      const request = new Request('http://localhost:3000/api/client/group-session-allowed-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedClientProfileId: clientOtherWorkspace.profile.id }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Client not found or not discoverable')
    })

    it('should reject invalid UUID', async () => {
      const request = new Request('http://localhost:3000/api/client/group-session-allowed-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedClientProfileId: 'invalid-uuid' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid input data')
    })

    it('should return 403 for trainer users', async () => {
      // Mock auth to return trainer session
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

      const request = new Request('http://localhost:3000/api/client/group-session-allowed-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedClientProfileId: clientB.profile.id }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - client access only')
    })
  })

  describe('DELETE /api/client/group-session-allowed-clients', () => {
    it('should remove client from allowed list', async () => {
      // First add Client B
      await addAllowedClient(clientA.profile.id, clientB.profile.id)

      const request = new Request(
        `http://localhost:3000/api/client/group-session-allowed-clients?allowedClientProfileId=${clientB.profile.id}`,
        { method: 'DELETE' }
      )

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify removed from database
      const dbRecord = await prisma.groupSessionAllowedClient.findFirst({
        where: {
          allowerProfileId: clientA.profile.id,
          allowedProfileId: clientB.profile.id,
        },
      })
      expect(dbRecord).toBeNull()
    })

    it('should succeed even if client not in allowed list (idempotent)', async () => {
      // Client B was never added to allowed list
      const request = new Request(
        `http://localhost:3000/api/client/group-session-allowed-clients?allowedClientProfileId=${clientB.profile.id}`,
        { method: 'DELETE' }
      )

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return 400 if allowedClientProfileId is missing', async () => {
      const request = new Request(
        'http://localhost:3000/api/client/group-session-allowed-clients',
        { method: 'DELETE' }
      )

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('allowedClientProfileId is required')
    })

    it('should return 403 for trainer users', async () => {
      // Mock auth to return trainer session
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

      const request = new Request(
        `http://localhost:3000/api/client/group-session-allowed-clients?allowedClientProfileId=${clientB.profile.id}`,
        { method: 'DELETE' }
      )

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - client access only')
    })
  })
})
