import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET as getPrepaidClients } from '@/app/api/prepaid/route'
import { GET as getClientDetails, POST as addCredit } from '@/app/api/prepaid/[clientId]/route'
import { GET as getTransactions } from '@/app/api/prepaid/[clientId]/transactions/route'
import { prisma } from '@/lib/db'
import {
  createTestWorkspace,
  createPrepaidClient,
  createPrepaidTransaction,
  createAppointment,
  setupPrepaidTestScenario,
} from '@/tests/fixtures/workspace'
import { NextRequest } from 'next/server'

// Mock the auth module
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// Import after mock is set up
import { auth } from '@/lib/auth'

describe('Prepaid API', () => {
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

  describe('GET /api/prepaid', () => {
    it('should return empty array when no prepaid clients', async () => {
      const response = await getPrepaidClients()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.clients).toBeDefined()
      expect(data.clients).toEqual([])
      expect(data.totals).toEqual({
        totalBalance: 0,
        totalTarget: 0,
        clientCount: 0,
        clientsNeedingAttention: 0,
      })
    })

    it('should return all prepaid clients with correct balances', async () => {
      // Create prepaid clients
      const client1 = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 300,
        prepaidTargetBalance: 500,
        sessionRate: 100,
        fullName: 'Client One',
      })

      const client2 = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 450,
        prepaidTargetBalance: 600,
        sessionRate: 150,
        fullName: 'Client Two',
      })

      const response = await getPrepaidClients()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.clients).toBeDefined()
      expect(data.clients.length).toBe(2)

      // Verify clients are ordered by name
      expect(data.clients[0].client.fullName).toBe('Client One')
      expect(data.clients[1].client.fullName).toBe('Client Two')

      // Verify balances
      expect(data.clients[0].currentBalance).toBe(300)
      expect(data.clients[0].targetBalance).toBe(500)
      expect(data.clients[1].currentBalance).toBe(450)
      expect(data.clients[1].targetBalance).toBe(600)
    })

    it('should calculate totals correctly', async () => {
      await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 300,
        prepaidTargetBalance: 500,
      })

      await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 200,
        prepaidTargetBalance: 400,
      })

      const response = await getPrepaidClients()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.totals).toEqual({
        totalBalance: 500,
        totalTarget: 900,
        clientCount: 2,
        clientsNeedingAttention: 0,
      })
    })

    it('should identify clients needing attention (low balance)', async () => {
      // Healthy client (> 25% of target)
      await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 400,
        prepaidTargetBalance: 500,
        fullName: 'Healthy Client',
      })

      // Low balance client (< 25% of target)
      await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 100,
        prepaidTargetBalance: 500,
        fullName: 'Low Balance Client',
      })

      const response = await getPrepaidClients()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.clients.length).toBe(2)
      expect(data.totals.clientsNeedingAttention).toBe(1)

      // Verify balance status
      const healthyClient = data.clients.find((c: { client: { fullName: string } }) => c.client.fullName === 'Healthy Client')
      const lowClient = data.clients.find((c: { client: { fullName: string } }) => c.client.fullName === 'Low Balance Client')

      expect(healthyClient.balanceStatus).toBe('healthy')
      expect(lowClient.balanceStatus).toBe('low')
    })

    it('should identify clients needing attention (empty balance)', async () => {
      // Empty balance client
      await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 0,
        prepaidTargetBalance: 500,
        fullName: 'Empty Balance Client',
      })

      const response = await getPrepaidClients()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.totals.clientsNeedingAttention).toBe(1)

      const emptyClient = data.clients[0]
      expect(emptyClient.balanceStatus).toBe('empty')
    })

    it('should enforce workspace isolation', async () => {
      // Create client in first workspace
      await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 300,
        prepaidTargetBalance: 500,
      })

      // Create second workspace with prepaid client
      const workspace2 = await createTestWorkspace()
      await createPrepaidClient({
        workspaceId: workspace2.workspace.id,
        prepaidBalance: 400,
        prepaidTargetBalance: 600,
      })

      // Get prepaid clients from first workspace
      const response = await getPrepaidClients()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.clients.length).toBe(1)
      expect(data.totals.totalBalance).toBe(300)
    })

    it('should include sessions consumed since last credit', async () => {
      const client = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 300,
        prepaidTargetBalance: 500,
      })

      // Add credit transaction
      await createPrepaidTransaction({
        clientProfileId: client.profile.id,
        type: 'CREDIT',
        amount: 500,
        balanceAfter: 500,
      })

      // Add some deductions
      await createPrepaidTransaction({
        clientProfileId: client.profile.id,
        type: 'DEDUCTION',
        amount: 100,
        balanceAfter: 400,
      })

      await createPrepaidTransaction({
        clientProfileId: client.profile.id,
        type: 'DEDUCTION',
        amount: 100,
        balanceAfter: 300,
      })

      const response = await getPrepaidClients()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.clients[0].sessionsConsumedSinceLastCredit).toBe(2)
    })

    it('should include last transaction date', async () => {
      const client = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 300,
        prepaidTargetBalance: 500,
      })

      const transaction = await createPrepaidTransaction({
        clientProfileId: client.profile.id,
        type: 'CREDIT',
        amount: 300,
        balanceAfter: 300,
      })

      const response = await getPrepaidClients()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.clients[0].lastTransactionDate).toBeDefined()
      expect(new Date(data.clients[0].lastTransactionDate).getTime()).toBeCloseTo(
        transaction.createdAt.getTime(),
        -2 // Allow 100ms difference
      )
    })
  })

  describe('GET /api/prepaid/[clientId]', () => {
    it('should return client prepaid details', async () => {
      const client = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 300,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      const request = new NextRequest(
        `http://localhost:3000/api/prepaid/${client.user.id}`
      )

      const response = await getClientDetails(request, {
        params: Promise.resolve({ clientId: client.user.id }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.client).toEqual({
        id: client.user.id,
        fullName: client.user.fullName,
        email: client.user.email,
      })
      expect(data.prepaid).toEqual({
        currentBalance: '300',
        targetBalance: '500',
        billingFrequency: 'PREPAID',
      })
    })

    it('should include next scheduled session with estimated cost', async () => {
      const client = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 300,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Create future appointment
      const futureDate = new Date(Date.now() + 86400000) // Tomorrow
      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: client.user.id,
        workspaceId: workspace.workspace.id,
        startTime: futureDate,
        status: 'SCHEDULED',
      })

      const request = new NextRequest(
        `http://localhost:3000/api/prepaid/${client.user.id}`
      )

      const response = await getClientDetails(request, {
        params: Promise.resolve({ clientId: client.user.id }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.nextSession).toBeDefined()
      expect(data.nextSession.id).toBe(appointment.id)
      expect(data.nextSession.estimatedCost).toBe('100')
      expect(new Date(data.nextSession.startTime).getTime()).toBe(futureDate.getTime())
    })

    it('should return null for next session when none scheduled', async () => {
      const client = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 300,
        prepaidTargetBalance: 500,
      })

      const request = new NextRequest(
        `http://localhost:3000/api/prepaid/${client.user.id}`
      )

      const response = await getClientDetails(request, {
        params: Promise.resolve({ clientId: client.user.id }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.nextSession).toBeNull()
    })

    it('should return recent transactions', async () => {
      const client = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 200,
        prepaidTargetBalance: 500,
      })

      // Create transactions
      await createPrepaidTransaction({
        clientProfileId: client.profile.id,
        type: 'CREDIT',
        amount: 500,
        balanceAfter: 500,
        description: 'Initial credit',
      })

      await createPrepaidTransaction({
        clientProfileId: client.profile.id,
        type: 'DEDUCTION',
        amount: 100,
        balanceAfter: 400,
        description: 'Session deduction',
      })

      const request = new NextRequest(
        `http://localhost:3000/api/prepaid/${client.user.id}`
      )

      const response = await getClientDetails(request, {
        params: Promise.resolve({ clientId: client.user.id }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.recentTransactions).toBeDefined()
      expect(data.recentTransactions.length).toBe(2)
      // Most recent first
      expect(data.recentTransactions[0].type).toBe('DEDUCTION')
      expect(data.recentTransactions[1].type).toBe('CREDIT')
    })

    it('should return 404 for non-existent client', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/prepaid/non-existent-id'
      )

      const response = await getClientDetails(request, {
        params: Promise.resolve({ clientId: 'non-existent-id' }),
      })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Client not found')
    })

    it('should return 404 for client without profile', async () => {
      // Create user without client profile
      const userWithoutProfile = await prisma.user.create({
        data: {
          email: 'noprofile@example.com',
          fullName: 'No Profile User',
          passwordHash: '',
          role: 'CLIENT',
          workspaceId: workspace.workspace.id,
        },
      })

      const request = new NextRequest(
        `http://localhost:3000/api/prepaid/${userWithoutProfile.id}`
      )

      const response = await getClientDetails(request, {
        params: Promise.resolve({ clientId: userWithoutProfile.id }),
      })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Client not found')
    })

    it('should return 404 for client in different workspace', async () => {
      // Create second workspace with client
      const workspace2 = await createTestWorkspace()
      const client2 = await createPrepaidClient({
        workspaceId: workspace2.workspace.id,
        prepaidBalance: 300,
        prepaidTargetBalance: 500,
      })

      // Try to access client2 from workspace1 (current auth)
      const request = new NextRequest(
        `http://localhost:3000/api/prepaid/${client2.user.id}`
      )

      const response = await getClientDetails(request, {
        params: Promise.resolve({ clientId: client2.user.id }),
      })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Client not found')
    })
  })

  describe('POST /api/prepaid/[clientId]', () => {
    it('should add credit and update balance correctly', async () => {
      const client = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 100,
        prepaidTargetBalance: 500,
      })

      const request = new NextRequest(
        `http://localhost:3000/api/prepaid/${client.user.id}`,
        {
          method: 'POST',
          body: JSON.stringify({
            amount: 200,
            notes: 'Top-up payment',
          }),
        }
      )

      const response = await addCredit(request, {
        params: Promise.resolve({ clientId: client.user.id }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.newBalance).toBe('300')
      expect(data.transactionId).toBeDefined()

      // Verify database was updated
      const updatedProfile = await prisma.clientProfile.findUnique({
        where: { id: client.profile.id },
      })

      expect(updatedProfile?.prepaidBalance?.toNumber()).toBe(300)
    })

    it('should create CREDIT transaction record', async () => {
      const client = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 100,
        prepaidTargetBalance: 500,
      })

      const request = new NextRequest(
        `http://localhost:3000/api/prepaid/${client.user.id}`,
        {
          method: 'POST',
          body: JSON.stringify({
            amount: 200,
            notes: 'Monthly payment',
          }),
        }
      )

      const response = await addCredit(request, {
        params: Promise.resolve({ clientId: client.user.id }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)

      // Verify transaction was created
      const transaction = await prisma.prepaidTransaction.findUnique({
        where: { id: data.transactionId },
      })

      expect(transaction).toBeDefined()
      expect(transaction?.type).toBe('CREDIT')
      expect(transaction?.amount.toNumber()).toBe(200)
      expect(transaction?.balanceAfter.toNumber()).toBe(300)
      expect(transaction?.description).toBe('Monthly payment')
    })

    it('should reject negative amounts', async () => {
      const client = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 100,
        prepaidTargetBalance: 500,
      })

      const request = new NextRequest(
        `http://localhost:3000/api/prepaid/${client.user.id}`,
        {
          method: 'POST',
          body: JSON.stringify({
            amount: -50,
          }),
        }
      )

      const response = await addCredit(request, {
        params: Promise.resolve({ clientId: client.user.id }),
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request')
      expect(data.details).toBeDefined()
    })

    it('should reject zero amounts', async () => {
      const client = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 100,
        prepaidTargetBalance: 500,
      })

      const request = new NextRequest(
        `http://localhost:3000/api/prepaid/${client.user.id}`,
        {
          method: 'POST',
          body: JSON.stringify({
            amount: 0,
          }),
        }
      )

      const response = await addCredit(request, {
        params: Promise.resolve({ clientId: client.user.id }),
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request')
    })

    it('should include optional notes in transaction', async () => {
      const client = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 100,
        prepaidTargetBalance: 500,
      })

      const request = new NextRequest(
        `http://localhost:3000/api/prepaid/${client.user.id}`,
        {
          method: 'POST',
          body: JSON.stringify({
            amount: 100,
            notes: 'Custom note for this transaction',
          }),
        }
      )

      const response = await addCredit(request, {
        params: Promise.resolve({ clientId: client.user.id }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)

      const transaction = await prisma.prepaidTransaction.findUnique({
        where: { id: data.transactionId },
      })

      expect(transaction?.description).toBe('Custom note for this transaction')
    })

    it('should use default notes if not provided', async () => {
      const client = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 100,
        prepaidTargetBalance: 500,
      })

      const request = new NextRequest(
        `http://localhost:3000/api/prepaid/${client.user.id}`,
        {
          method: 'POST',
          body: JSON.stringify({
            amount: 100,
          }),
        }
      )

      const response = await addCredit(request, {
        params: Promise.resolve({ clientId: client.user.id }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)

      const transaction = await prisma.prepaidTransaction.findUnique({
        where: { id: data.transactionId },
      })

      expect(transaction?.description).toBe('Prepaid credit added')
    })

    it('should return 404 for non-existent client', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/prepaid/non-existent-id',
        {
          method: 'POST',
          body: JSON.stringify({
            amount: 100,
          }),
        }
      )

      const response = await addCredit(request, {
        params: Promise.resolve({ clientId: 'non-existent-id' }),
      })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Client not found')
    })

    it('should return 404 for client in different workspace', async () => {
      // Create second workspace with client
      const workspace2 = await createTestWorkspace()
      const client2 = await createPrepaidClient({
        workspaceId: workspace2.workspace.id,
        prepaidBalance: 100,
        prepaidTargetBalance: 500,
      })

      const request = new NextRequest(
        `http://localhost:3000/api/prepaid/${client2.user.id}`,
        {
          method: 'POST',
          body: JSON.stringify({
            amount: 100,
          }),
        }
      )

      const response = await addCredit(request, {
        params: Promise.resolve({ clientId: client2.user.id }),
      })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Client not found')
    })

    it('should handle large amounts correctly', async () => {
      const client = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 100,
        prepaidTargetBalance: 5000,
      })

      const request = new NextRequest(
        `http://localhost:3000/api/prepaid/${client.user.id}`,
        {
          method: 'POST',
          body: JSON.stringify({
            amount: 9999.99,
          }),
        }
      )

      const response = await addCredit(request, {
        params: Promise.resolve({ clientId: client.user.id }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.newBalance).toBe('10099.99')
    })

    it('should handle decimal amounts correctly', async () => {
      const client = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 100,
        prepaidTargetBalance: 500,
      })

      const request = new NextRequest(
        `http://localhost:3000/api/prepaid/${client.user.id}`,
        {
          method: 'POST',
          body: JSON.stringify({
            amount: 123.45,
          }),
        }
      )

      const response = await addCredit(request, {
        params: Promise.resolve({ clientId: client.user.id }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.newBalance).toBe('223.45')
    })
  })

  describe('GET /api/prepaid/[clientId]/transactions', () => {
    it('should return paginated transaction history', async () => {
      const client = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 200,
        prepaidTargetBalance: 500,
      })

      // Create multiple transactions
      for (let i = 0; i < 5; i++) {
        await createPrepaidTransaction({
          clientProfileId: client.profile.id,
          type: i % 2 === 0 ? 'CREDIT' : 'DEDUCTION',
          amount: 100,
          balanceAfter: 200 + (i * 50),
        })
      }

      const request = new NextRequest(
        `http://localhost:3000/api/prepaid/${client.user.id}/transactions`
      )

      const response = await getTransactions(request, {
        params: Promise.resolve({ clientId: client.user.id }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.transactions).toBeDefined()
      expect(data.transactions.length).toBe(5)
      expect(data.pagination).toEqual({
        total: 5,
        limit: 50,
        offset: 0,
        hasMore: false,
      })
    })

    it('should support limit parameter', async () => {
      const client = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 200,
        prepaidTargetBalance: 500,
      })

      // Create 10 transactions
      for (let i = 0; i < 10; i++) {
        await createPrepaidTransaction({
          clientProfileId: client.profile.id,
          type: 'CREDIT',
          amount: 100,
          balanceAfter: 100 * (i + 1),
        })
      }

      const request = new NextRequest(
        `http://localhost:3000/api/prepaid/${client.user.id}/transactions?limit=5`
      )

      const response = await getTransactions(request, {
        params: Promise.resolve({ clientId: client.user.id }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.transactions.length).toBe(5)
      expect(data.pagination.limit).toBe(5)
      expect(data.pagination.total).toBe(10)
      expect(data.pagination.hasMore).toBe(true)
    })

    it('should support offset parameter', async () => {
      const client = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 200,
        prepaidTargetBalance: 500,
      })

      // Create 10 transactions with small delays to ensure ordering
      for (let i = 0; i < 10; i++) {
        await createPrepaidTransaction({
          clientProfileId: client.profile.id,
          type: 'CREDIT',
          amount: 100 + i,
          balanceAfter: 100 * (i + 1),
        })
        await new Promise(resolve => setTimeout(resolve, 5))
      }

      const request = new NextRequest(
        `http://localhost:3000/api/prepaid/${client.user.id}/transactions?limit=5&offset=5`
      )

      const response = await getTransactions(request, {
        params: Promise.resolve({ clientId: client.user.id }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.transactions.length).toBe(5)
      expect(data.pagination.offset).toBe(5)
      expect(data.pagination.hasMore).toBe(false)
    })

    it('should order by createdAt descending', async () => {
      const client = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 200,
        prepaidTargetBalance: 500,
      })

      // Create transactions with delays
      const tx1 = await createPrepaidTransaction({
        clientProfileId: client.profile.id,
        type: 'CREDIT',
        amount: 100,
        balanceAfter: 100,
        description: 'First transaction',
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      const tx2 = await createPrepaidTransaction({
        clientProfileId: client.profile.id,
        type: 'DEDUCTION',
        amount: 50,
        balanceAfter: 50,
        description: 'Second transaction',
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      const tx3 = await createPrepaidTransaction({
        clientProfileId: client.profile.id,
        type: 'CREDIT',
        amount: 200,
        balanceAfter: 250,
        description: 'Third transaction',
      })

      const request = new NextRequest(
        `http://localhost:3000/api/prepaid/${client.user.id}/transactions`
      )

      const response = await getTransactions(request, {
        params: Promise.resolve({ clientId: client.user.id }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.transactions.length).toBe(3)

      // Most recent should be first
      expect(data.transactions[0].description).toBe('Third transaction')
      expect(data.transactions[1].description).toBe('Second transaction')
      expect(data.transactions[2].description).toBe('First transaction')
    })

    it('should include transaction details', async () => {
      const client = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 200,
        prepaidTargetBalance: 500,
      })

      // Create appointment for linking
      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: client.user.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
      })

      await createPrepaidTransaction({
        clientProfileId: client.profile.id,
        type: 'DEDUCTION',
        amount: 100,
        balanceAfter: 100,
        appointmentId: appointment.id,
        description: 'Session deduction',
      })

      const request = new NextRequest(
        `http://localhost:3000/api/prepaid/${client.user.id}/transactions`
      )

      const response = await getTransactions(request, {
        params: Promise.resolve({ clientId: client.user.id }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.transactions.length).toBe(1)

      const transaction = data.transactions[0]
      expect(transaction.id).toBeDefined()
      expect(transaction.type).toBe('DEDUCTION')
      expect(transaction.amount).toBe('100')
      expect(transaction.balanceAfter).toBe('100')
      expect(transaction.description).toBe('Session deduction')
      expect(transaction.createdAt).toBeDefined()
      expect(transaction.appointment).toBeDefined()
      expect(transaction.appointment.id).toBe(appointment.id)
    })

    it('should return 404 for non-existent client', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/prepaid/non-existent-id/transactions'
      )

      const response = await getTransactions(request, {
        params: Promise.resolve({ clientId: 'non-existent-id' }),
      })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Client not found')
    })

    it('should return 404 for client in different workspace', async () => {
      // Create second workspace with client
      const workspace2 = await createTestWorkspace()
      const client2 = await createPrepaidClient({
        workspaceId: workspace2.workspace.id,
        prepaidBalance: 200,
        prepaidTargetBalance: 500,
      })

      const request = new NextRequest(
        `http://localhost:3000/api/prepaid/${client2.user.id}/transactions`
      )

      const response = await getTransactions(request, {
        params: Promise.resolve({ clientId: client2.user.id }),
      })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Client not found')
    })

    it('should handle empty transaction history', async () => {
      const client = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 200,
        prepaidTargetBalance: 500,
      })

      const request = new NextRequest(
        `http://localhost:3000/api/prepaid/${client.user.id}/transactions`
      )

      const response = await getTransactions(request, {
        params: Promise.resolve({ clientId: client.user.id }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.transactions).toEqual([])
      expect(data.pagination.total).toBe(0)
      expect(data.pagination.hasMore).toBe(false)
    })

    it('should use default limit when not specified', async () => {
      const client = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 200,
        prepaidTargetBalance: 500,
      })

      const request = new NextRequest(
        `http://localhost:3000/api/prepaid/${client.user.id}/transactions`
      )

      const response = await getTransactions(request, {
        params: Promise.resolve({ clientId: client.user.id }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.limit).toBe(50)
      expect(data.pagination.offset).toBe(0)
    })

    it('should handle transactions without appointments', async () => {
      const client = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 200,
        prepaidTargetBalance: 500,
      })

      await createPrepaidTransaction({
        clientProfileId: client.profile.id,
        type: 'CREDIT',
        amount: 200,
        balanceAfter: 200,
        description: 'Manual credit',
      })

      const request = new NextRequest(
        `http://localhost:3000/api/prepaid/${client.user.id}/transactions`
      )

      const response = await getTransactions(request, {
        params: Promise.resolve({ clientId: client.user.id }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.transactions.length).toBe(1)
      expect(data.transactions[0].appointment).toBeNull()
    })
  })

  describe('Integration scenarios', () => {
    it('should handle complete prepaid workflow', async () => {
      // Create prepaid client
      const client = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 0,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // 1. Add initial credit
      const addCreditRequest = new NextRequest(
        `http://localhost:3000/api/prepaid/${client.user.id}`,
        {
          method: 'POST',
          body: JSON.stringify({
            amount: 500,
            notes: 'Initial prepaid package',
          }),
        }
      )

      const creditResponse = await addCredit(addCreditRequest, {
        params: Promise.resolve({ clientId: client.user.id }),
      })
      const creditData = await creditResponse.json()

      expect(creditResponse.status).toBe(200)
      expect(creditData.newBalance).toBe('500')

      // 2. Verify client appears in prepaid list with healthy status
      const listResponse = await getPrepaidClients()
      const listData = await listResponse.json()

      expect(listData.clients.length).toBe(1)
      expect(listData.clients[0].currentBalance).toBe(500)
      expect(listData.clients[0].balanceStatus).toBe('healthy')
      expect(listData.totals.clientsNeedingAttention).toBe(0)

      // 3. Verify transaction history
      const txRequest = new NextRequest(
        `http://localhost:3000/api/prepaid/${client.user.id}/transactions`
      )

      const txResponse = await getTransactions(txRequest, {
        params: Promise.resolve({ clientId: client.user.id }),
      })
      const txData = await txResponse.json()

      expect(txData.transactions.length).toBe(1)
      expect(txData.transactions[0].type).toBe('CREDIT')
      expect(txData.transactions[0].amount).toBe('500')
    })

    it('should work with setupPrepaidTestScenario fixture', async () => {
      const scenario = await setupPrepaidTestScenario()

      // Mock auth for the scenario workspace
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: scenario.workspace.trainer.id,
          email: scenario.workspace.trainer.email,
          name: scenario.workspace.trainer.fullName,
          role: 'TRAINER',
          workspaceId: scenario.workspace.workspace.id,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      })

      const response = await getPrepaidClients()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.clients.length).toBe(3)
      expect(data.totals.clientsNeedingAttention).toBe(2) // Low + Empty

      // Verify balance statuses
      const healthy = data.clients.find((c: { client: { fullName: string } }) =>
        c.client.fullName === 'Prepaid Healthy'
      )
      const low = data.clients.find((c: { client: { fullName: string } }) =>
        c.client.fullName === 'Prepaid Low'
      )
      const empty = data.clients.find((c: { client: { fullName: string } }) =>
        c.client.fullName === 'Prepaid Empty'
      )

      expect(healthy.balanceStatus).toBe('healthy')
      expect(low.balanceStatus).toBe('low')
      expect(empty.balanceStatus).toBe('empty')
    })
  })
})
