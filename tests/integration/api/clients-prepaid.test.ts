import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '@/app/api/clients/route'
import { PATCH } from '@/app/api/clients/[id]/route'
import { prisma } from '@/lib/db'
import { createTestWorkspace } from '@/tests/fixtures/workspace'
import { NextRequest } from 'next/server'

// Mock the auth module
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// Import after mock is set up
import { auth } from '@/lib/auth'

describe('Client API - PREPAID Billing', () => {
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

  describe('POST /api/clients - PREPAID billing', () => {
    it('should create client with PREPAID billing frequency', async () => {
      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Prepaid Client',
          email: 'prepaid@example.com',
          phone: '555-1234',
          billingFrequency: 'PREPAID',
          sessionRate: '100',
          prepaidTargetBalance: '500',
          notes: 'Prepaid billing client',
          createAccount: 'manual',
          autoInvoiceEnabled: true,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Client added successfully')
      expect(data.clientId).toBeDefined()

      // Verify client was created in database with correct prepaid settings
      const client = await prisma.user.findUnique({
        where: { id: data.clientId },
        include: { clientProfile: true },
      })

      expect(client).toBeDefined()
      expect(client?.email).toBe('prepaid@example.com')
      expect(client?.fullName).toBe('Prepaid Client')
      expect(client?.role).toBe('CLIENT')
      expect(client?.workspaceId).toBe(workspace.workspace.id)

      expect(client?.clientProfile).toBeDefined()
      expect(client?.clientProfile?.billingFrequency).toBe('PREPAID')
      expect(client?.clientProfile?.sessionRate.toNumber()).toBe(100)
      expect(client?.clientProfile?.prepaidTargetBalance?.toNumber()).toBe(500)
      expect(client?.clientProfile?.prepaidBalance?.toNumber()).toBe(500) // Should equal target
      expect(client?.clientProfile?.autoInvoiceEnabled).toBe(true)
    })

    it('should set initial prepaidBalance equal to prepaidTargetBalance', async () => {
      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Balance Test Client',
          email: 'balance@example.com',
          billingFrequency: 'PREPAID',
          sessionRate: '75',
          prepaidTargetBalance: '1000',
          createAccount: 'manual',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      // Verify prepaidBalance equals prepaidTargetBalance
      const client = await prisma.user.findUnique({
        where: { id: data.clientId },
        include: { clientProfile: true },
      })

      expect(client?.clientProfile?.prepaidTargetBalance?.toNumber()).toBe(1000)
      expect(client?.clientProfile?.prepaidBalance?.toNumber()).toBe(1000)
    })

    it('should reject PREPAID client without prepaidTargetBalance', async () => {
      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'No Target Balance',
          email: 'notarget@example.com',
          billingFrequency: 'PREPAID',
          sessionRate: '100',
          // prepaidTargetBalance is omitted
          createAccount: 'manual',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      // PREPAID clients require a positive target balance
      expect(response.status).toBe(400)
      expect(data.error).toContain('positive target balance')
    })

    it('should validate prepaidTargetBalance is non-negative', async () => {
      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Negative Balance',
          email: 'negative@example.com',
          billingFrequency: 'PREPAID',
          sessionRate: '100',
          prepaidTargetBalance: '-500', // Negative value
          createAccount: 'manual',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid prepaid target balance')
    })

    it('should reject invalid prepaidTargetBalance string', async () => {
      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Invalid Balance',
          email: 'invalid@example.com',
          billingFrequency: 'PREPAID',
          sessionRate: '100',
          prepaidTargetBalance: 'not-a-number',
          createAccount: 'manual',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid prepaid target balance')
    })

    it('should create PREPAID client with invite account type', async () => {
      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Invite Prepaid',
          email: 'inviteprepaid@example.com',
          billingFrequency: 'PREPAID',
          sessionRate: '150',
          prepaidTargetBalance: '750',
          createAccount: 'invite',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Invitation sent successfully')
      expect(data.tempPassword).toBeDefined()

      // Verify client has password and prepaid settings
      const client = await prisma.user.findUnique({
        where: { id: data.clientId },
        include: { clientProfile: true },
      })

      expect(client?.passwordHash).not.toBe('') // Has temp password
      expect(client?.clientProfile?.billingFrequency).toBe('PREPAID')
      expect(client?.clientProfile?.prepaidTargetBalance?.toNumber()).toBe(750)
      expect(client?.clientProfile?.prepaidBalance?.toNumber()).toBe(750)
    })

    it('should not set prepaid fields for non-PREPAID billing', async () => {
      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Non Prepaid',
          email: 'nonprepaid@example.com',
          billingFrequency: 'PER_SESSION',
          sessionRate: '100',
          prepaidTargetBalance: '500', // This should be ignored
          createAccount: 'manual',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      // Verify prepaid fields are null for non-PREPAID billing
      const client = await prisma.user.findUnique({
        where: { id: data.clientId },
        include: { clientProfile: true },
      })

      expect(client?.clientProfile?.billingFrequency).toBe('PER_SESSION')
      expect(client?.clientProfile?.prepaidTargetBalance).toBeNull()
      expect(client?.clientProfile?.prepaidBalance).toBeNull()
    })

    it('should reject PREPAID client with zero prepaidTargetBalance', async () => {
      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Zero Balance',
          email: 'zero@example.com',
          billingFrequency: 'PREPAID',
          sessionRate: '100',
          prepaidTargetBalance: '0',
          createAccount: 'manual',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      // PREPAID clients require a positive target balance
      expect(response.status).toBe(400)
      expect(data.error).toContain('positive target balance')
    })
  })

  describe('PATCH /api/clients/[id] - prepaid fields', () => {
    it('should update prepaidTargetBalance', async () => {
      // Create a PREPAID client first
      const createRequest = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Update Test',
          email: 'updatetest@example.com',
          billingFrequency: 'PREPAID',
          sessionRate: '100',
          prepaidTargetBalance: '500',
          createAccount: 'manual',
        }),
      })

      const createResponse = await POST(createRequest)
      const createData = await createResponse.json()
      const clientId = createData.clientId

      // Update the prepaidTargetBalance
      const updateRequest = new NextRequest(
        `http://localhost:3000/api/clients/${clientId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            prepaidTargetBalance: '1000',
          }),
        }
      )

      const updateResponse = await PATCH(updateRequest, {
        params: Promise.resolve({ id: clientId }),
      })
      const updateData = await updateResponse.json()

      expect(updateResponse.status).toBe(200)
      expect(updateData.message).toBe('Client updated successfully')

      // Verify update in database
      const client = await prisma.user.findUnique({
        where: { id: clientId },
        include: { clientProfile: true },
      })

      expect(client?.clientProfile?.prepaidTargetBalance?.toNumber()).toBe(1000)
      // Note: prepaidBalance should NOT be automatically updated, only target
      expect(client?.clientProfile?.prepaidBalance?.toNumber()).toBe(500)
    })

    it('should validate prepaidTargetBalance is non-negative on update', async () => {
      // Create a PREPAID client first
      const createRequest = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Validation Test',
          email: 'validation@example.com',
          billingFrequency: 'PREPAID',
          sessionRate: '100',
          prepaidTargetBalance: '500',
          createAccount: 'manual',
        }),
      })

      const createResponse = await POST(createRequest)
      const createData = await createResponse.json()
      const clientId = createData.clientId

      // Try to update with negative value
      const updateRequest = new NextRequest(
        `http://localhost:3000/api/clients/${clientId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            prepaidTargetBalance: '-200',
          }),
        }
      )

      const updateResponse = await PATCH(updateRequest, {
        params: Promise.resolve({ id: clientId }),
      })
      const updateData = await updateResponse.json()

      expect(updateResponse.status).toBe(400)
      expect(updateData.error).toBe('Invalid prepaid target balance')

      // Verify original value is unchanged
      const client = await prisma.user.findUnique({
        where: { id: clientId },
        include: { clientProfile: true },
      })

      expect(client?.clientProfile?.prepaidTargetBalance?.toNumber()).toBe(500)
    })

    it('should reject clearing prepaidTargetBalance while staying on PREPAID (set to null)', async () => {
      // Create a PREPAID client first
      const createRequest = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Clear Test',
          email: 'clear@example.com',
          billingFrequency: 'PREPAID',
          sessionRate: '100',
          prepaidTargetBalance: '500',
          createAccount: 'manual',
        }),
      })

      const createResponse = await POST(createRequest)
      const createData = await createResponse.json()
      const clientId = createData.clientId

      // Try to clear the prepaidTargetBalance with null while staying on PREPAID
      const updateRequest = new NextRequest(
        `http://localhost:3000/api/clients/${clientId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            prepaidTargetBalance: null,
          }),
        }
      )

      const updateResponse = await PATCH(updateRequest, {
        params: Promise.resolve({ id: clientId }),
      })
      const updateData = await updateResponse.json()

      // Cannot clear target balance for PREPAID clients
      expect(updateResponse.status).toBe(400)
      expect(updateData.error).toContain('positive target balance')
    })

    it('should reject clearing prepaidTargetBalance while staying on PREPAID (set to empty string)', async () => {
      // Create a PREPAID client first
      const createRequest = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Clear String Test',
          email: 'clearstring@example.com',
          billingFrequency: 'PREPAID',
          sessionRate: '100',
          prepaidTargetBalance: '500',
          createAccount: 'manual',
        }),
      })

      const createResponse = await POST(createRequest)
      const createData = await createResponse.json()
      const clientId = createData.clientId

      // Try to clear the prepaidTargetBalance with empty string while staying on PREPAID
      const updateRequest = new NextRequest(
        `http://localhost:3000/api/clients/${clientId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            prepaidTargetBalance: '',
          }),
        }
      )

      const updateResponse = await PATCH(updateRequest, {
        params: Promise.resolve({ id: clientId }),
      })
      const updateData = await updateResponse.json()

      // Cannot clear target balance for PREPAID clients
      expect(updateResponse.status).toBe(400)
      expect(updateData.error).toContain('positive target balance')
    })

    it('should allow switching billing frequency to PREPAID', async () => {
      // Create a non-PREPAID client first
      const createRequest = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Switch Test',
          email: 'switch@example.com',
          billingFrequency: 'PER_SESSION',
          sessionRate: '100',
          createAccount: 'manual',
        }),
      })

      const createResponse = await POST(createRequest)
      const createData = await createResponse.json()
      const clientId = createData.clientId

      // Switch to PREPAID and set target balance
      const updateRequest = new NextRequest(
        `http://localhost:3000/api/clients/${clientId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            billingFrequency: 'PREPAID',
            prepaidTargetBalance: '600',
          }),
        }
      )

      const updateResponse = await PATCH(updateRequest, {
        params: Promise.resolve({ id: clientId }),
      })
      const updateData = await updateResponse.json()

      expect(updateResponse.status).toBe(200)

      // Verify billing frequency and target balance updated
      const client = await prisma.user.findUnique({
        where: { id: clientId },
        include: { clientProfile: true },
      })

      expect(client?.clientProfile?.billingFrequency).toBe('PREPAID')
      expect(client?.clientProfile?.prepaidTargetBalance?.toNumber()).toBe(600)
      // prepaidBalance would still be null since we didn't set it
      // (in a real scenario, trainer would credit the balance separately)
    })

    it('should allow switching billing frequency from PREPAID to another type', async () => {
      // Create a PREPAID client first
      const createRequest = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Switch From Prepaid',
          email: 'switchfrom@example.com',
          billingFrequency: 'PREPAID',
          sessionRate: '100',
          prepaidTargetBalance: '500',
          createAccount: 'manual',
        }),
      })

      const createResponse = await POST(createRequest)
      const createData = await createResponse.json()
      const clientId = createData.clientId

      // Switch to MONTHLY billing
      const updateRequest = new NextRequest(
        `http://localhost:3000/api/clients/${clientId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            billingFrequency: 'MONTHLY',
          }),
        }
      )

      const updateResponse = await PATCH(updateRequest, {
        params: Promise.resolve({ id: clientId }),
      })
      const updateData = await updateResponse.json()

      expect(updateResponse.status).toBe(200)

      // Verify billing frequency changed
      const client = await prisma.user.findUnique({
        where: { id: clientId },
        include: { clientProfile: true },
      })

      expect(client?.clientProfile?.billingFrequency).toBe('MONTHLY')
      // Prepaid fields remain in database but are no longer used
      expect(client?.clientProfile?.prepaidTargetBalance?.toNumber()).toBe(500)
      expect(client?.clientProfile?.prepaidBalance?.toNumber()).toBe(500)
    })

    it('should update multiple fields including prepaidTargetBalance', async () => {
      // Create a PREPAID client first
      const createRequest = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Multi Update',
          email: 'multiupdate@example.com',
          billingFrequency: 'PREPAID',
          sessionRate: '100',
          prepaidTargetBalance: '500',
          createAccount: 'manual',
        }),
      })

      const createResponse = await POST(createRequest)
      const createData = await createResponse.json()
      const clientId = createData.clientId

      // Update multiple fields at once
      const updateRequest = new NextRequest(
        `http://localhost:3000/api/clients/${clientId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            fullName: 'Updated Name',
            sessionRate: '150',
            prepaidTargetBalance: '1000',
            notes: 'Updated notes',
          }),
        }
      )

      const updateResponse = await PATCH(updateRequest, {
        params: Promise.resolve({ id: clientId }),
      })
      const updateData = await updateResponse.json()

      expect(updateResponse.status).toBe(200)

      // Verify all updates
      const client = await prisma.user.findUnique({
        where: { id: clientId },
        include: { clientProfile: true },
      })

      expect(client?.fullName).toBe('Updated Name')
      expect(client?.clientProfile?.sessionRate.toNumber()).toBe(150)
      expect(client?.clientProfile?.prepaidTargetBalance?.toNumber()).toBe(1000)
      expect(client?.clientProfile?.notes).toBe('Updated notes')
    })

    it('should reject invalid string for prepaidTargetBalance on update', async () => {
      // Create a PREPAID client first
      const createRequest = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Invalid Update',
          email: 'invalidupdate@example.com',
          billingFrequency: 'PREPAID',
          sessionRate: '100',
          prepaidTargetBalance: '500',
          createAccount: 'manual',
        }),
      })

      const createResponse = await POST(createRequest)
      const createData = await createResponse.json()
      const clientId = createData.clientId

      // Try to update with invalid value
      const updateRequest = new NextRequest(
        `http://localhost:3000/api/clients/${clientId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            prepaidTargetBalance: 'not-a-number',
          }),
        }
      )

      const updateResponse = await PATCH(updateRequest, {
        params: Promise.resolve({ id: clientId }),
      })
      const updateData = await updateResponse.json()

      expect(updateResponse.status).toBe(400)
      expect(updateData.error).toBe('Invalid prepaid target balance')
    })
  })
})
