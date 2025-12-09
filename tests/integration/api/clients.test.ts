import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST, GET } from '@/app/api/clients/route'
import { prisma } from '@/lib/db'
import { createTestWorkspace } from '@/tests/fixtures/workspace'
import { NextRequest } from 'next/server'

// Mock the auth module
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// Import after mock is set up
import { auth } from '@/lib/auth'

describe('Client API', () => {
  let workspace: Awaited<ReturnType<typeof createTestWorkspace>>

  beforeEach(async () => {
    workspace = await createTestWorkspace()

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
  })

  describe('POST /api/clients', () => {
    it('should create manual client with profile', async () => {
      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'John Doe',
          email: 'john@example.com',
          phone: '555-0123',
          billingFrequency: 'PER_SESSION',
          sessionRate: '100',
          notes: 'Test client',
          createAccount: 'manual',
          autoInvoiceEnabled: true,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Client added successfully')
      expect(data.clientId).toBeDefined()

      // Verify client was created in database
      const client = await prisma.user.findUnique({
        where: { id: data.clientId },
        include: { clientProfile: true },
      })

      expect(client).toBeDefined()
      expect(client?.email).toBe('john@example.com')
      expect(client?.fullName).toBe('John Doe')
      expect(client?.role).toBe('CLIENT')
      expect(client?.workspaceId).toBe(workspace.workspace.id)
      expect(client?.passwordHash).toBe('') // Manual clients have no password

      expect(client?.clientProfile).toBeDefined()
      expect(client?.clientProfile?.billingFrequency).toBe('PER_SESSION')
      expect(client?.clientProfile?.sessionRate.toNumber()).toBe(100)
      expect(client?.clientProfile?.autoInvoiceEnabled).toBe(true)
    })

    it('should create invite client with temp password', async () => {
      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Jane Smith',
          email: 'jane@example.com',
          billingFrequency: 'MONTHLY',
          sessionRate: '150',
          createAccount: 'invite',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Invitation sent successfully')
      expect(data.clientId).toBeDefined()
      expect(data.tempPassword).toBeDefined() // Should return temp password for testing

      // Verify client was created with password
      const client = await prisma.user.findUnique({
        where: { id: data.clientId },
        include: { clientProfile: true },
      })

      expect(client).toBeDefined()
      expect(client?.passwordHash).not.toBe('') // Invite clients have password
      expect(client?.clientProfile?.billingFrequency).toBe('MONTHLY')
    })

    it('should reject duplicate email', async () => {
      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Duplicate User',
          email: workspace.client.email, // Email already exists
          billingFrequency: 'PER_SESSION',
          sessionRate: '100',
          createAccount: 'manual',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email already registered')
    })

    it('should validate session rate', async () => {
      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Test Client',
          email: 'test@example.com',
          billingFrequency: 'PER_SESSION',
          sessionRate: 'invalid', // Invalid number
          createAccount: 'manual',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid session rate')
    })

    it('should reject negative session rate', async () => {
      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Test Client',
          email: 'test@example.com',
          billingFrequency: 'PER_SESSION',
          sessionRate: '-50', // Negative rate
          createAccount: 'manual',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid session rate')
    })

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          // Missing required fields
          email: 'test@example.com',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid input data')
      expect(data.details).toBeDefined()
    })

    it('should enforce workspace isolation', async () => {
      // Create second workspace
      const workspace2 = await createTestWorkspace()

      // Mock auth as trainer from workspace1
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

      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Test Client',
          email: 'isolated@example.com',
          billingFrequency: 'PER_SESSION',
          sessionRate: '100',
          createAccount: 'manual',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      // Verify client belongs to workspace1, not workspace2
      const client = await prisma.user.findUnique({
        where: { id: data.clientId },
      })

      expect(client?.workspaceId).toBe(workspace.workspace.id)
      expect(client?.workspaceId).not.toBe(workspace2.workspace.id)
    })

    it('should require authentication', async () => {
      // Mock no auth session
      vi.mocked(auth).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Test Client',
          email: 'test@example.com',
          billingFrequency: 'PER_SESSION',
          sessionRate: '100',
          createAccount: 'manual',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('Unauthorized')
    })
  })

  describe('GET /api/clients', () => {
    it('should return all workspace clients', async () => {
      // Create additional client with profile
      const client2 = await prisma.user.create({
        data: {
          email: 'client2@example.com',
          fullName: 'Client Two',
          passwordHash: '',
          role: 'CLIENT',
          workspaceId: workspace.workspace.id,
        },
      })

      await prisma.clientProfile.create({
        data: {
          userId: client2.id,
          workspaceId: workspace.workspace.id,
          billingFrequency: 'PER_SESSION',
          sessionRate: 100,
        },
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.clients).toBeDefined()
      expect(data.clients.length).toBeGreaterThanOrEqual(2) // At least 2 clients

      // All clients should belong to the workspace
      expect(data.clients.every((c: { workspaceId: string }) =>
        c.workspaceId === workspace.workspace.id
      )).toBe(true)
    })

    it('should include client profiles', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.clients).toBeDefined()

      // Each client should have profile
      if (data.clients.length > 0) {
        expect(data.clients[0].clientProfile).toBeDefined()
      }
    })

    it('should only return clients from authenticated workspace', async () => {
      // Create second workspace with client
      const workspace2 = await createTestWorkspace()

      // Get clients from workspace1
      const response = await GET()
      const data = await response.json()

      // Should not include workspace2 clients
      const workspace2ClientIds = data.clients
        .filter((c: { workspaceId: string }) => c.workspaceId === workspace2.workspace.id)

      expect(workspace2ClientIds.length).toBe(0)
    })

    it('should order by creation date descending', async () => {
      // Create multiple clients with delays to ensure different timestamps
      const client1 = await prisma.user.create({
        data: {
          email: 'client1@example.com',
          fullName: 'Client One',
          passwordHash: '',
          role: 'CLIENT',
          workspaceId: workspace.workspace.id,
        },
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      const client2 = await prisma.user.create({
        data: {
          email: 'client2@example.com',
          fullName: 'Client Two',
          passwordHash: '',
          role: 'CLIENT',
          workspaceId: workspace.workspace.id,
        },
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)

      // Most recent client should be first
      const clientIds = data.clients.map((c: { id: string }) => c.id)
      const client2Index = clientIds.indexOf(client2.id)
      const client1Index = clientIds.indexOf(client1.id)

      if (client2Index !== -1 && client1Index !== -1) {
        expect(client2Index).toBeLessThan(client1Index)
      }
    })
  })
})
