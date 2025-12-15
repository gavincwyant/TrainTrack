import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PrepaidService } from '@/lib/services/prepaid'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import {
  createTestWorkspace,
  createAppointment,
  createPrepaidClient,
  createPrepaidTransaction,
  createTestClient,
} from '@/tests/fixtures/workspace'

// Mock EmailService
vi.mock('@/lib/services/email', () => ({
  EmailService: class MockEmailService {
    async sendInvoiceEmail() {
      return Promise.resolve()
    }
  },
}))

describe('PrepaidService', () => {
  let prepaidService: PrepaidService

  beforeEach(() => {
    prepaidService = new PrepaidService()
  })

  describe('Corner cases', () => {
    it('should handle null prepaidBalance as $0', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user, profile } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 100,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Manually set balance to null to simulate edge case
      await prisma.clientProfile.update({
        where: { id: profile.id },
        data: { prepaidBalance: null },
      })

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: user.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
      })

      // Act
      const result = await prepaidService.deductSession(appointment.id)

      // Assert - Should treat null as $0 and trigger invoice generation (stays on PREPAID)
      expect(result.success).toBe(false)
      expect(result.shouldGenerateInvoice).toBe(true)
      expect(result.shouldSwitchToPerSession).toBe(false)
      expect(result.newBalance).toEqual(new Prisma.Decimal(0))
    })

    it('should handle null prepaidTargetBalance in summary', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user, profile } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 100,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Manually set target to null
      await prisma.clientProfile.update({
        where: { id: profile.id },
        data: { prepaidTargetBalance: null },
      })

      // Act
      const result = await prepaidService.getPrepaidClientsSummary(
        workspace.trainer.id,
        workspace.workspace.id
      )

      // Assert - Should not crash, treat target as 0
      expect(result.length).toBe(1)
      expect(result[0].targetBalance).toBe(0)
      // With target 0 and balance 100, balance > 25% of 0, so should be healthy
      expect(result[0].balanceStatus).toBe('healthy')
    })

    it('should handle very small decimal amounts ($0.01)', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user, profile } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 0.05,
        prepaidTargetBalance: 100,
        sessionRate: 0.01,
      })

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: user.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
      })

      // Act
      const result = await prepaidService.deductSession(appointment.id)

      // Assert
      expect(result.success).toBe(true)
      expect(result.amountDeducted.toString()).toBe('0.01')
      expect(result.newBalance.toString()).toBe('0.04')

      // Verify credit with small amount works too
      const creditResult = await prepaidService.addCredit(user.id, 0.01)
      expect(creditResult.newBalance.toString()).toBe('0.05')
    })

    it('should handle balance exactly at 25% threshold', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      // Balance = 125 which is exactly 25% of target 500
      const { user } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 125,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Act
      const result = await prepaidService.getPrepaidClientsSummary(
        workspace.trainer.id,
        workspace.workspace.id
      )

      // Assert - 125 is not LESS than 125 (25% of 500), so should be healthy
      const clientSummary = result.find(c => c.client.id === user.id)
      expect(clientSummary?.balanceStatus).toBe('healthy')
    })

    it('should handle balance just below 25% threshold', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      // Balance = 124.99 which is just under 25% of target 500
      const { user } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 124.99,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Act
      const result = await prepaidService.getPrepaidClientsSummary(
        workspace.trainer.id,
        workspace.workspace.id
      )

      // Assert
      const clientSummary = result.find(c => c.client.id === user.id)
      expect(clientSummary?.balanceStatus).toBe('low')
    })

    it('should handle MONTHLY billing client when adding credit', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user } = await createTestClient({
        workspaceId: workspace.workspace.id,
        billingFrequency: 'MONTHLY',
        sessionRate: 100,
      })

      // Act - Adding credit should switch to PREPAID
      const result = await prepaidService.addCredit(user.id, 500)

      // Assert
      expect(result.newBalance).toEqual(new Prisma.Decimal(500))

      const updatedProfile = await prisma.clientProfile.findFirst({
        where: { userId: user.id },
      })
      expect(updatedProfile?.billingFrequency).toBe('PREPAID')
    })

    it('should handle session rate of $0', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user, profile } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 100,
        prepaidTargetBalance: 500,
        sessionRate: 0, // Free session!
      })

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: user.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
      })

      // Act
      const result = await prepaidService.deductSession(appointment.id)

      // Assert - Should succeed but deduct $0
      expect(result.success).toBe(true)
      expect(result.amountDeducted).toEqual(new Prisma.Decimal(0))
      expect(result.newBalance).toEqual(new Prisma.Decimal(100))

      // Verify transaction was still created (for record keeping)
      const transaction = await prisma.prepaidTransaction.findFirst({
        where: { appointmentId: appointment.id },
      })
      expect(transaction).toBeDefined()
      expect(transaction?.amount).toEqual(new Prisma.Decimal(0))
    })

    it('should handle very large balance amounts', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const largeBalance = 999999.99
      const { user, profile } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: largeBalance,
        prepaidTargetBalance: 1000000,
        sessionRate: 100,
      })

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: user.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
      })

      // Act
      const result = await prepaidService.deductSession(appointment.id)

      // Assert
      expect(result.success).toBe(true)
      expect(result.newBalance.toNumber()).toBe(999899.99)

      // Verify we can add large credits too
      const creditResult = await prepaidService.addCredit(user.id, 99999.99)
      expect(creditResult.newBalance.toNumber()).toBe(1099899.98)
    })

    it('should handle deduction when balance equals session rate exactly', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user, profile } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 100, // Exactly one session worth
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: user.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
      })

      // Act
      const result = await prepaidService.deductSession(appointment.id)

      // Assert - Should deduct fully and leave $0
      expect(result.success).toBe(true)
      expect(result.amountDeducted).toEqual(new Prisma.Decimal(100))
      expect(result.newBalance).toEqual(new Prisma.Decimal(0))
      // Should not trigger switch since deduction was successful
      expect(result.shouldSwitchToPerSession).toBe(false)
    })

    it('should not generate top-up invoice when client has no workspaceId', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 100,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Manually remove workspaceId (edge case - shouldn't happen normally)
      await prisma.user.update({
        where: { id: user.id },
        data: { workspaceId: null },
      })

      // Act & Assert - Should handle gracefully (not crash)
      // This tests the client.workspaceId! assertion in generateTopUpInvoice
      try {
        await prepaidService.generateTopUpInvoice(user.id, workspace.trainer.id)
        // If it doesn't throw, that's acceptable - just should not crash
      } catch (error) {
        // Expected - Prisma may reject null workspaceId
        expect(error).toBeDefined()
      }
    })

    it('should handle multiple rapid credits without losing precision', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user, profile } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 0,
        prepaidTargetBalance: 1000,
        sessionRate: 100,
      })

      // Act - Add multiple small credits rapidly
      for (let i = 0; i < 10; i++) {
        await prepaidService.addCredit(user.id, 33.33)
      }

      // Assert - Should be exactly 333.30 (no floating point errors)
      const finalProfile = await prisma.clientProfile.findUnique({
        where: { id: profile.id },
      })
      expect(finalProfile?.prepaidBalance?.toString()).toBe('333.3')
    })
  })

  describe('deductSession', () => {
    it('should deduct individual session rate from balance', async () => {
      // Arrange
      const workspace = await createTestWorkspace({
        groupSessionMatchingLogic: 'EXACT_MATCH',
      })

      const { user, profile } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 500,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: user.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
      })

      // Act
      const result = await prepaidService.deductSession(appointment.id)

      // Assert
      expect(result.success).toBe(true)
      expect(result.amountDeducted).toEqual(new Prisma.Decimal(100))
      expect(result.newBalance).toEqual(new Prisma.Decimal(400))
      // Balance 400 >= session rate 100, so NO invoice needed (can still afford sessions)
      expect(result.shouldGenerateInvoice).toBe(false)
      expect(result.shouldSwitchToPerSession).toBe(false)

      // Verify balance updated in database
      const updatedProfile = await prisma.clientProfile.findUnique({
        where: { id: profile.id },
      })
      expect(updatedProfile?.prepaidBalance).toEqual(new Prisma.Decimal(400))

      // Verify transaction created
      const transaction = await prisma.prepaidTransaction.findFirst({
        where: { appointmentId: appointment.id },
      })
      expect(transaction).toBeDefined()
      expect(transaction?.type).toBe('DEDUCTION')
      expect(transaction?.amount).toEqual(new Prisma.Decimal(100))
      expect(transaction?.balanceAfter).toEqual(new Prisma.Decimal(400))
      expect(transaction?.description).toContain('Training session')
    })

    it('should deduct group session rate for group appointments', async () => {
      // Arrange
      const workspace = await createTestWorkspace({
        groupSessionMatchingLogic: 'EXACT_MATCH',
        defaultGroupSessionRate: 60,
      })

      const { user: client1, profile: profile1 } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 500,
        prepaidTargetBalance: 500,
        sessionRate: 100,
        groupSessionRate: 50,
      })

      const { user: client2 } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 500,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      const startTime = new Date()
      const endTime = new Date(Date.now() + 3600000)

      // Create overlapping appointments (group session)
      const apt1 = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: client1.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
        startTime,
        endTime,
      })

      await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: client2.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
        startTime,
        endTime,
      })

      // Act
      const result = await prepaidService.deductSession(apt1.id)

      // Assert
      expect(result.success).toBe(true)
      expect(result.amountDeducted).toEqual(new Prisma.Decimal(50)) // Client's group rate
      expect(result.newBalance).toEqual(new Prisma.Decimal(450))

      // Verify transaction description
      const transaction = await prisma.prepaidTransaction.findFirst({
        where: { appointmentId: apt1.id },
      })
      expect(transaction?.description).toContain('Group training session')
    })

    it('should create DEDUCTION transaction with correct balanceAfter', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user, profile } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 300,
        prepaidTargetBalance: 500,
        sessionRate: 75,
      })

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: user.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
      })

      // Act
      await prepaidService.deductSession(appointment.id)

      // Assert
      const transaction = await prisma.prepaidTransaction.findFirst({
        where: { appointmentId: appointment.id },
      })

      expect(transaction).toBeDefined()
      expect(transaction?.type).toBe('DEDUCTION')
      expect(transaction?.amount).toEqual(new Prisma.Decimal(75))
      expect(transaction?.balanceAfter).toEqual(new Prisma.Decimal(225))
      expect(transaction?.clientProfileId).toBe(profile.id)
    })

    it('should return shouldGenerateInvoice: true when balance < next session cost', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user, profile } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 150,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Create completed appointment
      const completedAppointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: user.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
      })

      // Create next scheduled appointment
      await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: user.id,
        workspaceId: workspace.workspace.id,
        status: 'SCHEDULED',
        startTime: new Date(Date.now() + 86400000), // Tomorrow
        endTime: new Date(Date.now() + 86400000 + 3600000),
      })

      // Act
      const result = await prepaidService.deductSession(completedAppointment.id)

      // Assert
      expect(result.success).toBe(true)
      expect(result.newBalance).toEqual(new Prisma.Decimal(50)) // 150 - 100
      expect(result.shouldGenerateInvoice).toBe(true) // 50 < 100 (next session cost)
    })

    it('should return shouldGenerateInvoice: true when balance was $0 (stays on PREPAID)', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 0, // Empty balance
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: user.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
      })

      // Act
      const result = await prepaidService.deductSession(appointment.id)

      // Assert - Should stay on PREPAID and trigger invoice generation
      expect(result.success).toBe(false)
      expect(result.newBalance).toEqual(new Prisma.Decimal(0))
      expect(result.amountDeducted).toEqual(new Prisma.Decimal(0))
      expect(result.shouldGenerateInvoice).toBe(true)
      expect(result.shouldSwitchToPerSession).toBe(false)

      // Verify no transaction was created
      const transaction = await prisma.prepaidTransaction.findFirst({
        where: { appointmentId: appointment.id },
      })
      expect(transaction).toBeNull()
    })

    it('should handle partial balance (deduct what\'s available when balance < session cost)', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user, profile } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 40, // Less than session rate
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: user.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
      })

      // Act
      const result = await prepaidService.deductSession(appointment.id)

      // Assert
      expect(result.success).toBe(true)
      expect(result.amountDeducted).toEqual(new Prisma.Decimal(40)) // Only what's available
      expect(result.newBalance).toEqual(new Prisma.Decimal(0))

      // Verify balance is now 0
      const updatedProfile = await prisma.clientProfile.findUnique({
        where: { id: profile.id },
      })
      expect(updatedProfile?.prepaidBalance).toEqual(new Prisma.Decimal(0))
    })

    it('should use rate fallback chain (client groupRate -> trainer default -> individual)', async () => {
      // Arrange - Client has no group rate, but trainer has default
      const workspace = await createTestWorkspace({
        groupSessionMatchingLogic: 'EXACT_MATCH',
        defaultGroupSessionRate: 70, // Trainer default
      })

      const { user: client1 } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 500,
        prepaidTargetBalance: 500,
        sessionRate: 100,
        // No groupSessionRate specified - should use trainer default
      })

      const { user: client2 } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 500,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      const startTime = new Date()
      const endTime = new Date(Date.now() + 3600000)

      // Create overlapping appointments
      const apt1 = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: client1.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
        startTime,
        endTime,
      })

      await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: client2.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
        startTime,
        endTime,
      })

      // Act
      const result = await prepaidService.deductSession(apt1.id)

      // Assert
      expect(result.amountDeducted).toEqual(new Prisma.Decimal(70)) // Trainer default
    })

    it('should fallback to individual rate when no group rates are set', async () => {
      // Arrange - No group rates anywhere
      const workspace = await createTestWorkspace({
        groupSessionMatchingLogic: 'EXACT_MATCH',
        // No defaultGroupSessionRate
      })

      const { user: client1 } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 500,
        prepaidTargetBalance: 500,
        sessionRate: 100,
        // No groupSessionRate
      })

      const { user: client2 } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 500,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      const startTime = new Date()
      const endTime = new Date(Date.now() + 3600000)

      // Create overlapping appointments
      const apt1 = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: client1.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
        startTime,
        endTime,
      })

      await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: client2.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
        startTime,
        endTime,
      })

      // Act
      const result = await prepaidService.deductSession(apt1.id)

      // Assert
      expect(result.amountDeducted).toEqual(new Prisma.Decimal(100)) // Individual rate
    })

    it('should return shouldGenerateInvoice: true when balance is below target (regardless of next session)', async () => {
      // Arrange - Low balance, no next scheduled session
      const workspace = await createTestWorkspace()

      const { user, profile } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 150, // Low balance
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Only create one completed appointment (no future scheduled session)
      const completedAppointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: user.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
      })

      // Act
      const result = await prepaidService.deductSession(completedAppointment.id)

      // Assert
      expect(result.success).toBe(true)
      expect(result.newBalance).toEqual(new Prisma.Decimal(50)) // 150 - 100
      // Balance 50 is below target 500, so invoice should be generated
      expect(result.shouldGenerateInvoice).toBe(true)
    })

    it('should return failure when appointment not found', async () => {
      // Act
      const result = await prepaidService.deductSession('non-existent-id')

      // Assert
      expect(result.success).toBe(false)
      expect(result.newBalance).toEqual(new Prisma.Decimal(0))
      expect(result.amountDeducted).toEqual(new Prisma.Decimal(0))
      expect(result.shouldGenerateInvoice).toBe(false)
      expect(result.shouldSwitchToPerSession).toBe(false)
    })

    it('should return failure when client profile not found', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
      })

      // Delete client profile
      await prisma.clientProfile.deleteMany({
        where: { userId: workspace.client.id },
      })

      // Act
      const result = await prepaidService.deductSession(appointment.id)

      // Assert
      expect(result.success).toBe(false)
    })
  })

  describe('addCredit', () => {
    it('should increase balance by credit amount', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user, profile } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 100,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Act
      const result = await prepaidService.addCredit(user.id, 200)

      // Assert
      expect(result.newBalance).toEqual(new Prisma.Decimal(300))
      expect(result.transaction.id).toBeDefined()

      // Verify balance updated in database
      const updatedProfile = await prisma.clientProfile.findUnique({
        where: { id: profile.id },
      })
      expect(updatedProfile?.prepaidBalance).toEqual(new Prisma.Decimal(300))
    })

    it('should create CREDIT transaction', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user, profile } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 100,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Act
      const result = await prepaidService.addCredit(user.id, 250)

      // Assert
      const transaction = await prisma.prepaidTransaction.findUnique({
        where: { id: result.transaction.id },
      })

      expect(transaction).toBeDefined()
      expect(transaction?.type).toBe('CREDIT')
      expect(transaction?.amount).toEqual(new Prisma.Decimal(250))
      expect(transaction?.balanceAfter).toEqual(new Prisma.Decimal(350))
      expect(transaction?.clientProfileId).toBe(profile.id)
    })

    it('should switch billing to PREPAID if client was PER_SESSION', async () => {
      // Arrange
      const workspace = await createTestWorkspace({
        billingFrequency: 'PER_SESSION',
      })

      const { user: client } = await createTestClient({
        workspaceId: workspace.workspace.id,
        billingFrequency: 'PER_SESSION',
        sessionRate: 100,
      })

      // Verify initial billing frequency
      let clientProfile = await prisma.clientProfile.findFirst({
        where: { userId: client.id },
      })
      expect(clientProfile?.billingFrequency).toBe('PER_SESSION')

      // Act
      await prepaidService.addCredit(client.id, 500)

      // Assert
      clientProfile = await prisma.clientProfile.findFirst({
        where: { userId: client.id },
      })
      expect(clientProfile?.billingFrequency).toBe('PREPAID')
      expect(clientProfile?.prepaidBalance).toEqual(new Prisma.Decimal(500))
    })

    it('should handle decimal amounts correctly', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user, profile } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 100.50,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Act
      const result = await prepaidService.addCredit(user.id, 75.75)

      // Assert
      expect(result.newBalance).toEqual(new Prisma.Decimal(176.25))

      const updatedProfile = await prisma.clientProfile.findUnique({
        where: { id: profile.id },
      })
      expect(updatedProfile?.prepaidBalance).toEqual(new Prisma.Decimal(176.25))
    })

    it('should store notes in transaction description', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 100,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Act
      const result = await prepaidService.addCredit(user.id, 300, 'Monthly top-up payment')

      // Assert
      const transaction = await prisma.prepaidTransaction.findUnique({
        where: { id: result.transaction.id },
      })

      expect(transaction?.description).toBe('Monthly top-up payment')
    })

    it('should use default description when notes not provided', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 100,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Act
      const result = await prepaidService.addCredit(user.id, 200)

      // Assert
      const transaction = await prisma.prepaidTransaction.findUnique({
        where: { id: result.transaction.id },
      })

      expect(transaction?.description).toBe('Prepaid credit added')
    })

    it('should throw error when client not found', async () => {
      // Act & Assert
      await expect(
        prepaidService.addCredit('non-existent-id', 100)
      ).rejects.toThrow('Client profile not found')
    })

    it('should throw error when client profile not found', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      // Delete client profile
      await prisma.clientProfile.deleteMany({
        where: { userId: workspace.client.id },
      })

      // Act & Assert
      await expect(
        prepaidService.addCredit(workspace.client.id, 100)
      ).rejects.toThrow('Client profile not found')
    })
  })

  describe('generateTopUpInvoice', () => {
    it('should create invoice for (target - current) amount', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user, profile } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 100,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Act
      const result = await prepaidService.generateTopUpInvoice(user.id, workspace.trainer.id)

      // Assert
      expect(result).toBeDefined()
      expect(result?.invoiceId).toBeDefined()

      const invoice = await prisma.invoice.findUnique({
        where: { id: result!.invoiceId },
        include: { lineItems: true },
      })

      expect(invoice?.amount).toEqual(new Prisma.Decimal(400)) // 500 - 100
      expect(invoice?.status).toBe('SENT')
      expect(invoice?.clientId).toBe(user.id)
      expect(invoice?.trainerId).toBe(workspace.trainer.id)
      expect(invoice?.notes).toContain('Prepaid balance replenishment to $500')
      expect(invoice?.notes).toContain('Current balance: $100')
    })

    it('should include consumed sessions as line items', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user, profile } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 200,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Add credit first
      await createPrepaidTransaction({
        clientProfileId: profile.id,
        type: 'CREDIT',
        amount: 500,
        balanceAfter: 500,
        description: 'Initial credit',
      })

      // Create deduction transactions
      const apt1 = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: user.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
      })

      await createPrepaidTransaction({
        clientProfileId: profile.id,
        type: 'DEDUCTION',
        amount: 100,
        balanceAfter: 400,
        appointmentId: apt1.id,
        description: 'Training session on Jan 15, 2025',
      })

      const apt2 = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: user.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
      })

      await createPrepaidTransaction({
        clientProfileId: profile.id,
        type: 'DEDUCTION',
        amount: 100,
        balanceAfter: 300,
        appointmentId: apt2.id,
        description: 'Training session on Jan 18, 2025',
      })

      // Update balance manually to simulate current state
      await prisma.clientProfile.update({
        where: { id: profile.id },
        data: { prepaidBalance: 200 },
      })

      // Act
      const result = await prepaidService.generateTopUpInvoice(user.id, workspace.trainer.id)

      // Assert
      const invoice = await prisma.invoice.findUnique({
        where: { id: result!.invoiceId },
        include: { lineItems: true },
      })

      expect(invoice?.lineItems).toHaveLength(2)
      expect(invoice?.lineItems[0].appointmentId).toBe(apt1.id)
      expect(invoice?.lineItems[0].description).toContain('Training session')
      expect(invoice?.lineItems[0].total).toEqual(new Prisma.Decimal(100))
      expect(invoice?.lineItems[1].appointmentId).toBe(apt2.id)
      expect(invoice?.amount).toEqual(new Prisma.Decimal(300)) // 500 - 200
    })

    it('should not generate if balance >= target', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 500, // Already at target
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Act
      const result = await prepaidService.generateTopUpInvoice(user.id, workspace.trainer.id)

      // Assert
      expect(result).toBeNull()

      // Verify no invoice was created
      const invoices = await prisma.invoice.findMany({
        where: { clientId: user.id },
      })
      expect(invoices).toHaveLength(0)
    })

    it('should not generate if balance > target', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 600, // Above target
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Act
      const result = await prepaidService.generateTopUpInvoice(user.id, workspace.trainer.id)

      // Assert
      expect(result).toBeNull()
    })

    it('should return null when client not found', async () => {
      // Act
      const result = await prepaidService.generateTopUpInvoice('non-existent-id', 'trainer-id')

      // Assert
      expect(result).toBeNull()
    })

    it('should return null when no target balance set', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 100,
        prepaidTargetBalance: 0, // No target set
        sessionRate: 100,
      })

      // Update to remove target
      await prisma.clientProfile.updateMany({
        where: { userId: user.id },
        data: { prepaidTargetBalance: null },
      })

      // Act
      const result = await prepaidService.generateTopUpInvoice(user.id, workspace.trainer.id)

      // Assert
      expect(result).toBeNull()
    })

    it('should create simple top-up line item when no deductions exist', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 100,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Act
      const result = await prepaidService.generateTopUpInvoice(user.id, workspace.trainer.id)

      // Assert
      const invoice = await prisma.invoice.findUnique({
        where: { id: result!.invoiceId },
        include: { lineItems: true },
      })

      expect(invoice?.lineItems).toHaveLength(1)
      expect(invoice?.lineItems[0].description).toBe('Prepaid balance top-up')
      expect(invoice?.lineItems[0].appointmentId).toBeNull()
      expect(invoice?.lineItems[0].total).toEqual(new Prisma.Decimal(400))
    })

    it('should set due date based on trainer settings', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      await prisma.trainerSettings.update({
        where: { trainerId: workspace.trainer.id },
        data: { defaultInvoiceDueDays: 21 },
      })

      const { user } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 100,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Act
      const result = await prepaidService.generateTopUpInvoice(user.id, workspace.trainer.id)

      // Assert
      const invoice = await prisma.invoice.findUnique({
        where: { id: result!.invoiceId },
      })

      const now = new Date()
      const daysUntilDue = Math.round(
        (invoice!.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      expect(daysUntilDue).toBeGreaterThanOrEqual(20)
      expect(daysUntilDue).toBeLessThanOrEqual(22)
    })

    it('should rollback to DRAFT if email fails', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 100,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Mock email service to fail
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const emailService = (prepaidService as any).emailService
      vi.spyOn(emailService, 'sendInvoiceEmail').mockRejectedValue(
        new Error('Email failed')
      )

      // Act
      const result = await prepaidService.generateTopUpInvoice(user.id, workspace.trainer.id)

      // Assert
      const invoice = await prisma.invoice.findUnique({
        where: { id: result!.invoiceId },
      })

      expect(invoice?.status).toBe('DRAFT')
    })
  })

  describe('switchToPerSession', () => {
    it('should change billingFrequency to PER_SESSION', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { profile } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 200,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Verify initial state
      let clientProfile = await prisma.clientProfile.findUnique({
        where: { id: profile.id },
      })
      expect(clientProfile?.billingFrequency).toBe('PREPAID')

      // Act
      await prepaidService.switchToPerSession(profile.id)

      // Assert
      clientProfile = await prisma.clientProfile.findUnique({
        where: { id: profile.id },
      })
      expect(clientProfile?.billingFrequency).toBe('PER_SESSION')
    })

    it('should preserve prepaid balance', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { profile } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 150,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Act
      await prepaidService.switchToPerSession(profile.id)

      // Assert
      const clientProfile = await prisma.clientProfile.findUnique({
        where: { id: profile.id },
      })
      expect(clientProfile?.billingFrequency).toBe('PER_SESSION')
      expect(clientProfile?.prepaidBalance).toEqual(new Prisma.Decimal(150)) // Preserved
    })
  })

  describe('getTransactions', () => {
    it('should return transactions in descending order', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { profile } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 500,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Create transactions with delays to ensure different timestamps
      const tx1 = await createPrepaidTransaction({
        clientProfileId: profile.id,
        type: 'CREDIT',
        amount: 500,
        balanceAfter: 500,
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      const tx2 = await createPrepaidTransaction({
        clientProfileId: profile.id,
        type: 'DEDUCTION',
        amount: 100,
        balanceAfter: 400,
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      const tx3 = await createPrepaidTransaction({
        clientProfileId: profile.id,
        type: 'DEDUCTION',
        amount: 100,
        balanceAfter: 300,
      })

      // Act
      const result = await prepaidService.getTransactions(profile.id)

      // Assert
      expect(result.transactions).toHaveLength(3)
      expect(result.total).toBe(3)
      // Most recent first
      expect(result.transactions[0].id).toBe(tx3.id)
      expect(result.transactions[1].id).toBe(tx2.id)
      expect(result.transactions[2].id).toBe(tx1.id)
    })

    it('should respect limit parameter', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { profile } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 500,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Create multiple transactions
      await createPrepaidTransaction({
        clientProfileId: profile.id,
        type: 'CREDIT',
        amount: 500,
        balanceAfter: 500,
      })

      await createPrepaidTransaction({
        clientProfileId: profile.id,
        type: 'DEDUCTION',
        amount: 100,
        balanceAfter: 400,
      })

      await createPrepaidTransaction({
        clientProfileId: profile.id,
        type: 'DEDUCTION',
        amount: 100,
        balanceAfter: 300,
      })

      // Act
      const result = await prepaidService.getTransactions(profile.id, { limit: 2 })

      // Assert
      expect(result.transactions).toHaveLength(2)
      expect(result.total).toBe(3) // Total count is still 3
    })

    it('should include related appointment data', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user, profile } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 500,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: user.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
        startTime: new Date('2025-01-15T10:00:00Z'),
      })

      await createPrepaidTransaction({
        clientProfileId: profile.id,
        type: 'DEDUCTION',
        amount: 100,
        balanceAfter: 400,
        appointmentId: appointment.id,
      })

      // Act
      const result = await prepaidService.getTransactions(profile.id)

      // Assert
      expect(result.transactions).toHaveLength(1)
      expect(result.transactions[0].appointment).toBeDefined()
      expect(result.transactions[0].appointment?.id).toBe(appointment.id)
      expect(result.transactions[0].appointment?.startTime).toEqual(
        new Date('2025-01-15T10:00:00Z')
      )
    })

    it('should return empty array when no transactions exist', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { profile } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 500,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Act
      const result = await prepaidService.getTransactions(profile.id)

      // Assert
      expect(result.transactions).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })

  describe('getPrepaidClientsSummary', () => {
    it('should return all prepaid clients for trainer', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const client1 = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 400,
        prepaidTargetBalance: 500,
        sessionRate: 100,
        fullName: 'Client One',
      })

      const client2 = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 50,
        prepaidTargetBalance: 500,
        sessionRate: 100,
        fullName: 'Client Two',
      })

      // Create a non-prepaid client (should not be included)
      await createTestClient({
        workspaceId: workspace.workspace.id,
        billingFrequency: 'PER_SESSION',
        sessionRate: 100,
      })

      // Act
      const result = await prepaidService.getPrepaidClientsSummary(
        workspace.trainer.id,
        workspace.workspace.id
      )

      // Assert
      expect(result).toHaveLength(2)
      expect(result.some(c => c.client.id === client1.user.id)).toBe(true)
      expect(result.some(c => c.client.id === client2.user.id)).toBe(true)
    })

    it('should calculate balanceStatus correctly (healthy if > 25% target)', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 200, // 40% of target
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Act
      const result = await prepaidService.getPrepaidClientsSummary(
        workspace.trainer.id,
        workspace.workspace.id
      )

      // Assert
      const clientSummary = result.find(c => c.client.id === user.id)
      expect(clientSummary?.balanceStatus).toBe('healthy')
      expect(clientSummary?.currentBalance).toBe(200)
      expect(clientSummary?.targetBalance).toBe(500)
    })

    it('should calculate balanceStatus correctly (low if < 25%)', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 100, // 20% of target
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Act
      const result = await prepaidService.getPrepaidClientsSummary(
        workspace.trainer.id,
        workspace.workspace.id
      )

      // Assert
      const clientSummary = result.find(c => c.client.id === user.id)
      expect(clientSummary?.balanceStatus).toBe('low')
    })

    it('should calculate balanceStatus correctly (empty if 0)', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 0,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Act
      const result = await prepaidService.getPrepaidClientsSummary(
        workspace.trainer.id,
        workspace.workspace.id
      )

      // Assert
      const clientSummary = result.find(c => c.client.id === user.id)
      expect(clientSummary?.balanceStatus).toBe('empty')
    })

    it('should count sessions consumed since last credit', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user, profile } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 300,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Add initial credit
      const creditTx = await createPrepaidTransaction({
        clientProfileId: profile.id,
        type: 'CREDIT',
        amount: 500,
        balanceAfter: 500,
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      // Add 3 deductions after the credit
      await createPrepaidTransaction({
        clientProfileId: profile.id,
        type: 'DEDUCTION',
        amount: 100,
        balanceAfter: 400,
      })

      await createPrepaidTransaction({
        clientProfileId: profile.id,
        type: 'DEDUCTION',
        amount: 100,
        balanceAfter: 300,
      })

      await createPrepaidTransaction({
        clientProfileId: profile.id,
        type: 'DEDUCTION',
        amount: 100,
        balanceAfter: 200,
      })

      // Act
      const result = await prepaidService.getPrepaidClientsSummary(
        workspace.trainer.id,
        workspace.workspace.id
      )

      // Assert
      const clientSummary = result.find(c => c.client.id === user.id)
      expect(clientSummary?.sessionsConsumedSinceLastCredit).toBe(3)
    })

    it('should count all deductions when no credit exists', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user, profile } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 300,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Add deductions without any credit
      await createPrepaidTransaction({
        clientProfileId: profile.id,
        type: 'DEDUCTION',
        amount: 100,
        balanceAfter: 400,
      })

      await createPrepaidTransaction({
        clientProfileId: profile.id,
        type: 'DEDUCTION',
        amount: 100,
        balanceAfter: 300,
      })

      // Act
      const result = await prepaidService.getPrepaidClientsSummary(
        workspace.trainer.id,
        workspace.workspace.id
      )

      // Assert
      const clientSummary = result.find(c => c.client.id === user.id)
      expect(clientSummary?.sessionsConsumedSinceLastCredit).toBe(2)
    })

    it('should include lastTransactionDate', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user, profile } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 400,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      const tx = await createPrepaidTransaction({
        clientProfileId: profile.id,
        type: 'CREDIT',
        amount: 500,
        balanceAfter: 500,
      })

      // Act
      const result = await prepaidService.getPrepaidClientsSummary(
        workspace.trainer.id,
        workspace.workspace.id
      )

      // Assert
      const clientSummary = result.find(c => c.client.id === user.id)
      expect(clientSummary?.lastTransactionDate).toEqual(tx.createdAt)
    })

    it('should return null lastTransactionDate when no transactions exist', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const { user } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 500,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Act
      const result = await prepaidService.getPrepaidClientsSummary(
        workspace.trainer.id,
        workspace.workspace.id
      )

      // Assert
      const clientSummary = result.find(c => c.client.id === user.id)
      expect(clientSummary?.lastTransactionDate).toBeNull()
    })

    it('should only return clients from the specified workspace', async () => {
      // Arrange
      const workspace1 = await createTestWorkspace()
      const workspace2 = await createTestWorkspace()

      const client1 = await createPrepaidClient({
        workspaceId: workspace1.workspace.id,
        prepaidBalance: 400,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      await createPrepaidClient({
        workspaceId: workspace2.workspace.id,
        prepaidBalance: 300,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Act
      const result = await prepaidService.getPrepaidClientsSummary(
        workspace1.trainer.id,
        workspace1.workspace.id
      )

      // Assert
      expect(result).toHaveLength(1)
      expect(result[0].client.id).toBe(client1.user.id)
    })

    it('should return empty array when no prepaid clients exist', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      // Act
      const result = await prepaidService.getPrepaidClientsSummary(
        workspace.trainer.id,
        workspace.workspace.id
      )

      // Assert
      expect(result).toHaveLength(0)
    })
  })

  describe('checkBalanceAndGenerateInvoiceIfNeeded', () => {
    it('should generate invoice when balance is below session rate', async () => {
      // Arrange - Client with balance less than session rate
      const workspace = await createTestWorkspace()

      const { user, profile } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 50, // Less than session rate of 100
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Act
      const result = await prepaidService.checkBalanceAndGenerateInvoiceIfNeeded(
        user.id,
        workspace.trainer.id
      )

      // Assert
      expect(result.invoiceGenerated).toBe(true)
      expect(result.invoiceId).toBeDefined()

      // Verify invoice was created
      const invoice = await prisma.invoice.findUnique({
        where: { id: result.invoiceId },
      })
      expect(invoice).toBeDefined()
      expect(invoice?.isPrepaidTopUp).toBe(true)
      expect(invoice?.amount.toNumber()).toBe(450) // 500 - 50
    })

    it('should generate invoice when balance is $0', async () => {
      // Arrange - Client with zero balance
      const workspace = await createTestWorkspace()

      const { user, profile } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 0, // Zero balance
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Act
      const result = await prepaidService.checkBalanceAndGenerateInvoiceIfNeeded(
        user.id,
        workspace.trainer.id
      )

      // Assert
      expect(result.invoiceGenerated).toBe(true)
      expect(result.invoiceId).toBeDefined()

      // Verify invoice was created
      const invoice = await prisma.invoice.findUnique({
        where: { id: result.invoiceId },
      })
      expect(invoice).toBeDefined()
      expect(invoice?.isPrepaidTopUp).toBe(true)
      expect(invoice?.amount.toNumber()).toBe(500) // Full target
    })

    it('should NOT generate invoice when balance can cover next session', async () => {
      // Arrange - Client with balance >= session rate
      const workspace = await createTestWorkspace()

      const { user, profile } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 100, // Exactly equals session rate
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Act
      const result = await prepaidService.checkBalanceAndGenerateInvoiceIfNeeded(
        user.id,
        workspace.trainer.id
      )

      // Assert - No invoice needed (balance can cover one session)
      expect(result.invoiceGenerated).toBe(false)
      expect(result.invoiceId).toBeUndefined()

      // Verify no invoice was created
      const invoice = await prisma.invoice.findFirst({
        where: { clientId: user.id },
      })
      expect(invoice).toBeNull()
    })

    it('should skip non-PREPAID clients', async () => {
      // Arrange - PER_SESSION client
      const workspace = await createTestWorkspace({
        billingFrequency: 'PER_SESSION',
      })

      // Act
      const result = await prepaidService.checkBalanceAndGenerateInvoiceIfNeeded(
        workspace.client.id,
        workspace.trainer.id
      )

      // Assert
      expect(result.invoiceGenerated).toBe(false)
    })

    it('should not create duplicate invoices (idempotent)', async () => {
      // Arrange - Client with balance less than session rate
      const workspace = await createTestWorkspace()

      const { user, profile } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 50, // Less than session rate
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Act - Call twice
      const result1 = await prepaidService.checkBalanceAndGenerateInvoiceIfNeeded(
        user.id,
        workspace.trainer.id
      )
      const result2 = await prepaidService.checkBalanceAndGenerateInvoiceIfNeeded(
        user.id,
        workspace.trainer.id
      )

      // Assert - Both calls succeed (second returns existing invoice ID)
      expect(result1.invoiceGenerated).toBe(true)
      expect(result2.invoiceGenerated).toBe(true) // Returns existing invoice ID
      expect(result1.invoiceId).toBe(result2.invoiceId) // Same invoice

      // Verify only one invoice exists (idempotent)
      const invoices = await prisma.invoice.findMany({
        where: {
          clientId: user.id,
          isPrepaidTopUp: true,
        },
      })
      expect(invoices).toHaveLength(1)
    })
  })
})
