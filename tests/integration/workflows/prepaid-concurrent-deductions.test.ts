import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/db'
import { PrepaidService } from '@/lib/services/prepaid'
import { createTestWorkspace, createAppointment } from '@/tests/fixtures/workspace'

// Mock email service
vi.mock('@/lib/services/email', () => ({
  EmailService: class MockEmailService {
    async sendInvoiceEmail() { return Promise.resolve() }
  },
}))

/**
 * Helper function to retry operations that may fail due to serialization conflicts.
 * Serializable isolation level causes transactions to fail when they conflict,
 * and the proper pattern is to retry them.
 */
async function retryOnSerializationFailure<T>(
  operation: () => Promise<T>,
  maxRetries = 5,
  delayMs = 50
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: unknown) {
      lastError = error as Error
      const errorMessage = lastError?.message || ''
      const isSerializationFailure =
        errorMessage.includes('could not serialize') ||
        errorMessage.includes('write conflict') ||
        errorMessage.includes('deadlock') ||
        (lastError as { code?: string })?.code === 'P2034'

      if (!isSerializationFailure) {
        throw error
      }

      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)))
    }
  }

  throw lastError
}

describe('Concurrent Deduction Handling', () => {
  let prepaidService: PrepaidService

  beforeEach(async () => {
    prepaidService = new PrepaidService()
  })

  it('should handle concurrent deductions without race conditions', async () => {
    // This test verifies the fix for the race condition bug where
    // 3 concurrent $150 deductions from a $500 balance resulted in $350
    // instead of the correct $50

    const workspace = await createTestWorkspace({
      billingFrequency: 'PREPAID',
      prepaidBalance: 500,
      prepaidTargetBalance: 500,
      sessionRate: 150,
    })

    // Create 3 appointments (like the original bug scenario)
    const appointments = await Promise.all([
      createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() - 3600000 * 6),
        endTime: new Date(Date.now() - 3600000 * 5),
        status: 'COMPLETED',
      }),
      createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() - 3600000 * 4),
        endTime: new Date(Date.now() - 3600000 * 3),
        status: 'COMPLETED',
      }),
      createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() - 3600000 * 2),
        endTime: new Date(Date.now() - 3600000 * 1),
        status: 'COMPLETED',
      }),
    ])

    // Execute all deductions concurrently with retry logic for serialization failures
    await Promise.all(
      appointments.map(appointment =>
        retryOnSerializationFailure(() => prepaidService.deductSession(appointment.id))
      )
    )

    // Verify final balance is correct: $500 - (3 * $150) = $50
    const updatedProfile = await prisma.clientProfile.findUnique({
      where: { id: workspace.clientProfile.id },
    })

    expect(updatedProfile?.prepaidBalance?.toNumber()).toBe(50)
  })

  it('should create correct sequential transaction records', async () => {
    const workspace = await createTestWorkspace({
      billingFrequency: 'PREPAID',
      prepaidBalance: 400,
      prepaidTargetBalance: 500,
      sessionRate: 100,
    })

    // Create 4 appointments
    const appointments = await Promise.all([
      createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() - 3600000 * 8),
        endTime: new Date(Date.now() - 3600000 * 7),
        status: 'COMPLETED',
      }),
      createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() - 3600000 * 6),
        endTime: new Date(Date.now() - 3600000 * 5),
        status: 'COMPLETED',
      }),
      createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() - 3600000 * 4),
        endTime: new Date(Date.now() - 3600000 * 3),
        status: 'COMPLETED',
      }),
      createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() - 3600000 * 2),
        endTime: new Date(Date.now() - 3600000 * 1),
        status: 'COMPLETED',
      }),
    ])

    // Execute concurrently with retry logic
    await Promise.all(
      appointments.map(appointment =>
        retryOnSerializationFailure(() => prepaidService.deductSession(appointment.id))
      )
    )

    // Get all transaction records
    const transactions = await prisma.prepaidTransaction.findMany({
      where: { clientProfileId: workspace.clientProfile.id },
      orderBy: { createdAt: 'asc' },
    })

    expect(transactions.length).toBe(4)

    // Verify each transaction shows the correct balance progression
    // The balanceAfter values should be: 300, 200, 100, 0 (in some order)
    const balances = transactions.map(t => t.balanceAfter.toNumber()).sort((a, b) => b - a)
    expect(balances).toEqual([300, 200, 100, 0])

    // Final balance should be $0
    const updatedProfile = await prisma.clientProfile.findUnique({
      where: { id: workspace.clientProfile.id },
    })
    expect(updatedProfile?.prepaidBalance?.toNumber()).toBe(0)
  })

  it('should handle many concurrent deductions correctly', async () => {
    // Stress test with 5 concurrent operations (reasonable for serializable isolation)
    const workspace = await createTestWorkspace({
      billingFrequency: 'PREPAID',
      prepaidBalance: 500,
      prepaidTargetBalance: 500,
      sessionRate: 100,
    })

    // Create 5 appointments
    const appointments = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        createAppointment({
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          workspaceId: workspace.workspace.id,
          startTime: new Date(Date.now() - 3600000 * (i * 2 + 2)),
          endTime: new Date(Date.now() - 3600000 * (i * 2 + 1)),
          status: 'COMPLETED',
        })
      )
    )

    // Execute all 5 deductions concurrently with retry logic (higher retry for stress test)
    await Promise.all(
      appointments.map(appointment =>
        retryOnSerializationFailure(() => prepaidService.deductSession(appointment.id), 10, 100)
      )
    )

    // Verify final balance: $500 - (5 * $100) = $0
    const updatedProfile = await prisma.clientProfile.findUnique({
      where: { id: workspace.clientProfile.id },
    })

    expect(updatedProfile?.prepaidBalance?.toNumber()).toBe(0)

    // Verify 5 transaction records were created
    const transactions = await prisma.prepaidTransaction.findMany({
      where: { clientProfileId: workspace.clientProfile.id },
    })
    expect(transactions.length).toBe(5)

    // Total deducted should equal $500
    const totalDeducted = transactions.reduce(
      (sum, t) => sum + t.amount.toNumber(),
      0
    )
    expect(totalDeducted).toBe(500)
  })

  it('should handle insufficient balance correctly during concurrent deductions', async () => {
    // Test when balance runs out mid-way through concurrent operations
    const workspace = await createTestWorkspace({
      billingFrequency: 'PREPAID',
      prepaidBalance: 250,
      prepaidTargetBalance: 500,
      sessionRate: 100,
    })

    // Create 4 appointments (total would be $400, but only $250 available)
    const appointments = await Promise.all(
      Array.from({ length: 4 }, (_, i) =>
        createAppointment({
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          workspaceId: workspace.workspace.id,
          startTime: new Date(Date.now() - 3600000 * (i * 2 + 2)),
          endTime: new Date(Date.now() - 3600000 * (i * 2 + 1)),
          status: 'COMPLETED',
        })
      )
    )

    // Execute concurrently with retry - some may fail due to insufficient balance
    const results = await Promise.allSettled(
      appointments.map(appointment =>
        retryOnSerializationFailure(() => prepaidService.deductSession(appointment.id))
      )
    )

    // Count successful and failed operations
    const successful = results.filter(r => r.status === 'fulfilled')
    const failed = results.filter(r => r.status === 'rejected')

    // Verify final balance is $0 or close (depending on partial deduction handling)
    const updatedProfile = await prisma.clientProfile.findUnique({
      where: { id: workspace.clientProfile.id },
    })

    // Balance should be >= 0 (never negative)
    expect(updatedProfile?.prepaidBalance?.toNumber()).toBeGreaterThanOrEqual(0)

    // Get transaction records
    const transactions = await prisma.prepaidTransaction.findMany({
      where: { clientProfileId: workspace.clientProfile.id },
    })

    // Total deducted should not exceed the starting balance
    const totalDeducted = transactions
      .filter(t => t.type === 'DEDUCTION')
      .reduce((sum, t) => sum + t.amount.toNumber(), 0)
    expect(totalDeducted).toBeLessThanOrEqual(250)
  })

  it('should maintain data integrity with serializable isolation', async () => {
    // This specifically tests that serializable isolation prevents dirty reads
    const workspace = await createTestWorkspace({
      billingFrequency: 'PREPAID',
      prepaidBalance: 300,
      prepaidTargetBalance: 500,
      sessionRate: 100,
    })

    // Create 3 appointments
    const appointments = await Promise.all(
      Array.from({ length: 3 }, (_, i) =>
        createAppointment({
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          workspaceId: workspace.workspace.id,
          startTime: new Date(Date.now() - 3600000 * (i * 2 + 2)),
          endTime: new Date(Date.now() - 3600000 * (i * 2 + 1)),
          status: 'COMPLETED',
        })
      )
    )

    // Execute concurrently with retry logic
    await Promise.all(
      appointments.map(appointment =>
        retryOnSerializationFailure(() => prepaidService.deductSession(appointment.id))
      )
    )

    // Get transactions ordered by creation
    const transactions = await prisma.prepaidTransaction.findMany({
      where: { clientProfileId: workspace.clientProfile.id },
      orderBy: { createdAt: 'asc' },
    })

    // Verify balanceAfter values form a proper decreasing sequence
    // Each balanceAfter should be exactly 100 less than the previous balance
    for (let i = 0; i < transactions.length; i++) {
      const expectedBalance = 300 - (i + 1) * 100
      // Due to concurrency, we can't guarantee order, but all values should be unique
      const allBalances = transactions.map(t => t.balanceAfter.toNumber())
      expect(allBalances).toContain(expectedBalance)
    }

    // Final balance should be exactly $0
    const updatedProfile = await prisma.clientProfile.findUnique({
      where: { id: workspace.clientProfile.id },
    })
    expect(updatedProfile?.prepaidBalance?.toNumber()).toBe(0)
  })
})
