import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/db'
import { InvoiceService } from '@/lib/services/invoice'
import { PrepaidService } from '@/lib/services/prepaid'
import { createTestWorkspace, createAppointment, createPrepaidClient } from '@/tests/fixtures/workspace'
import { Prisma } from '@prisma/client'

// Mock email service
vi.mock('@/lib/services/email', () => ({
  EmailService: class MockEmailService {
    async sendInvoiceEmail() { return Promise.resolve() }
  },
}))

describe('Prepaid Session Workflow Tests', () => {
  let invoiceService: InvoiceService
  let prepaidService: PrepaidService

  beforeEach(async () => {
    invoiceService = new InvoiceService()
    prepaidService = new PrepaidService()
  })

  describe('Happy path workflow', () => {
    it('should deduct from prepaid balance, create transactions, and allow credits', async () => {
      // Create workspace with prepaid client
      const workspace = await createTestWorkspace({
        billingFrequency: 'PREPAID',
        prepaidBalance: 500,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Verify initial state
      expect(workspace.clientProfile.billingFrequency).toBe('PREPAID')
      expect(workspace.clientProfile.prepaidBalance?.toNumber()).toBe(500)
      expect(workspace.clientProfile.prepaidTargetBalance?.toNumber()).toBe(500)

      // Create and complete an appointment
      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() - 3600000 * 2), // 2 hours ago
        endTime: new Date(Date.now() - 3600000 * 1), // 1 hour ago
        status: 'COMPLETED',
      })

      // Generate invoice (which triggers prepaid deduction)
      await invoiceService.generatePerSessionInvoice(appointment.id)

      // Verify balance was deducted
      const updatedProfile = await prisma.clientProfile.findUnique({
        where: { id: workspace.clientProfile.id },
      })
      expect(updatedProfile?.prepaidBalance?.toNumber()).toBe(400)

      // Verify DEDUCTION transaction was created
      const deductionTransaction = await prisma.prepaidTransaction.findFirst({
        where: {
          clientProfileId: workspace.clientProfile.id,
          type: 'DEDUCTION',
          appointmentId: appointment.id,
        },
      })
      expect(deductionTransaction).toBeDefined()
      expect(deductionTransaction?.amount.toNumber()).toBe(100)
      expect(deductionTransaction?.balanceAfter.toNumber()).toBe(400)
      expect(deductionTransaction?.description).toContain('Training session')

      // Add $100 credit via PrepaidService
      const creditResult = await prepaidService.addCredit(
        workspace.client.id,
        100,
        'Manual top-up'
      )

      // Verify balance back to $500
      expect(creditResult.newBalance.toNumber()).toBe(500)

      const finalProfile = await prisma.clientProfile.findUnique({
        where: { id: workspace.clientProfile.id },
      })
      expect(finalProfile?.prepaidBalance?.toNumber()).toBe(500)

      // Verify CREDIT transaction was created
      const creditTransaction = await prisma.prepaidTransaction.findFirst({
        where: {
          clientProfileId: workspace.clientProfile.id,
          type: 'CREDIT',
        },
      })
      expect(creditTransaction).toBeDefined()
      expect(creditTransaction?.amount.toNumber()).toBe(100)
      expect(creditTransaction?.balanceAfter.toNumber()).toBe(500)
      expect(creditTransaction?.description).toBe('Manual top-up')

      // NO invoice should be created (balance 400 >= session rate 100, can still afford sessions)
      const invoice = await prisma.invoice.findFirst({
        where: {
          workspaceId: workspace.workspace.id,
          clientId: workspace.client.id,
        },
      })
      expect(invoice).toBeNull()
    })
  })

  describe('Low balance triggers invoice', () => {
    it('should generate top-up invoice when balance falls below next session cost', async () => {
      // Create workspace with low prepaid balance
      const workspace = await createTestWorkspace({
        billingFrequency: 'PREPAID',
        prepaidBalance: 150,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Schedule TWO appointments (one now, one tomorrow)
      const appointment1 = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() - 3600000 * 2), // 2 hours ago (completed)
        endTime: new Date(Date.now() - 3600000 * 1), // 1 hour ago
        status: 'COMPLETED',
      })

      await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() + 86400000), // Tomorrow (scheduled)
        endTime: new Date(Date.now() + 86400000 + 3600000), // Tomorrow + 1 hour
        status: 'SCHEDULED',
      })

      // Complete first appointment via generatePerSessionInvoice (balance → $50)
      // This internally calls deductSession for prepaid clients
      await invoiceService.generatePerSessionInvoice(appointment1.id)

      // Verify balance deducted to $50
      const updatedProfile = await prisma.clientProfile.findUnique({
        where: { id: workspace.clientProfile.id },
      })
      expect(updatedProfile?.prepaidBalance?.toNumber()).toBe(50)

      // The invoice service should have triggered the top-up invoice since balance ($50) < next session cost ($100)
      const topUpInvoice = await prisma.invoice.findFirst({
        where: {
          workspaceId: workspace.workspace.id,
          clientId: workspace.client.id,
        },
      })

      expect(topUpInvoice).toBeDefined()
      expect(topUpInvoice?.amount.toNumber()).toBe(450) // $500 target - $50 current
      expect(topUpInvoice?.status).toBe('SENT')
      expect(topUpInvoice?.notes).toContain('Prepaid balance replenishment')
      expect(topUpInvoice?.notes).toContain('$500')
      expect(topUpInvoice?.notes).toContain('$50')

      // Verify line items include the deduction
      const lineItems = await prisma.invoiceLineItem.findMany({
        where: { invoiceId: topUpInvoice!.id },
      })
      expect(lineItems.length).toBeGreaterThan(0)
    })
  })

  describe('Zero balance stays on PREPAID and triggers top-up invoice', () => {
    it('should stay on PREPAID and generate top-up invoice when balance is $0', async () => {
      // Create prepaid client with $0 balance
      const workspace = await createTestWorkspace({
        billingFrequency: 'PREPAID',
        prepaidBalance: 0,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Create and complete an appointment
      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() - 3600000 * 2),
        endTime: new Date(Date.now() - 3600000 * 1),
        status: 'COMPLETED',
      })

      // Attempt to deduct - should indicate invoice needed (NOT switch to per-session)
      const deductionResult = await prepaidService.deductSession(appointment.id)
      expect(deductionResult.success).toBe(false)
      expect(deductionResult.shouldGenerateInvoice).toBe(true)
      expect(deductionResult.shouldSwitchToPerSession).toBe(false)
      expect(deductionResult.amountDeducted.toNumber()).toBe(0)

      // Generate invoice (should generate top-up invoice, NOT switch billing mode)
      await invoiceService.generatePerSessionInvoice(appointment.id)

      // Verify billingFrequency stays as PREPAID (no longer switches)
      const updatedProfile = await prisma.clientProfile.findUnique({
        where: { id: workspace.clientProfile.id },
      })
      expect(updatedProfile?.billingFrequency).toBe('PREPAID')

      // Verify a prepaid top-up invoice was generated (NOT per-session invoice)
      const invoice = await prisma.invoice.findFirst({
        where: {
          workspaceId: workspace.workspace.id,
          clientId: workspace.client.id,
        },
        include: { lineItems: true },
      })

      expect(invoice).toBeDefined()
      expect(invoice?.amount.toNumber()).toBe(500) // Full target balance since current is $0
      expect(invoice?.status).toBe('SENT')
      expect(invoice?.isPrepaidTopUp).toBe(true)
      expect(invoice?.notes).toContain('Prepaid balance replenishment')
    })
  })

  describe('Group session uses correct rate', () => {
    it('should deduct group session rate instead of individual rate', async () => {
      // Create prepaid client with both rates defined
      const workspace = await createTestWorkspace({
        billingFrequency: 'PREPAID',
        prepaidBalance: 500,
        prepaidTargetBalance: 500,
        sessionRate: 100,
        groupSessionRate: 75,
        defaultGroupSessionRate: 75,
        groupSessionMatchingLogic: 'EXACT_MATCH',
      })

      // Create two appointments at the same time (group session)
      const startTime = new Date(Date.now() - 3600000 * 2)
      const endTime = new Date(Date.now() - 3600000 * 1)

      const appointment1 = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime,
        endTime,
        status: 'COMPLETED',
      })

      // Create another client for the group session
      const { user: client2, profile: profile2 } = await createPrepaidClient({
        workspaceId: workspace.workspace.id,
        prepaidBalance: 500,
        prepaidTargetBalance: 500,
        sessionRate: 100,
        groupSessionRate: 75,
      })

      const appointment2 = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: client2.id,
        workspaceId: workspace.workspace.id,
        startTime,
        endTime,
        status: 'COMPLETED',
      })

      // Generate invoice for first appointment (should be treated as group)
      await invoiceService.generatePerSessionInvoice(appointment1.id)

      // Verify deduction was $75 (not $100)
      const updatedProfile = await prisma.clientProfile.findUnique({
        where: { id: workspace.clientProfile.id },
      })
      expect(updatedProfile?.prepaidBalance?.toNumber()).toBe(425) // 500 - 75

      // Verify transaction shows group session
      const transaction = await prisma.prepaidTransaction.findFirst({
        where: {
          clientProfileId: workspace.clientProfile.id,
          type: 'DEDUCTION',
          appointmentId: appointment1.id,
        },
      })
      expect(transaction?.amount.toNumber()).toBe(75)
      expect(transaction?.description).toContain('Group training session')

      // Generate invoice for second appointment
      await invoiceService.generatePerSessionInvoice(appointment2.id)

      // Verify second client also got $75 deducted
      const updatedProfile2 = await prisma.clientProfile.findUnique({
        where: { id: profile2.id },
      })
      expect(updatedProfile2?.prepaidBalance?.toNumber()).toBe(425)
    })
  })

  describe('Partial balance deduction', () => {
    it('should deduct only available balance when insufficient funds', async () => {
      // Create prepaid client with insufficient balance
      const workspace = await createTestWorkspace({
        billingFrequency: 'PREPAID',
        prepaidBalance: 30,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Create and complete appointment
      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() - 3600000 * 2),
        endTime: new Date(Date.now() - 3600000 * 1),
        status: 'COMPLETED',
      })

      // Deduct session
      const deductionResult = await prepaidService.deductSession(appointment.id)

      // Verify only $30 deducted (all available)
      expect(deductionResult.success).toBe(true)
      expect(deductionResult.amountDeducted.toNumber()).toBe(30)
      expect(deductionResult.newBalance.toNumber()).toBe(0)
      expect(deductionResult.shouldSwitchToPerSession).toBe(false)

      // Verify balance is now $0
      const updatedProfile = await prisma.clientProfile.findUnique({
        where: { id: workspace.clientProfile.id },
      })
      expect(updatedProfile?.prepaidBalance?.toNumber()).toBe(0)

      // Verify transaction shows partial deduction
      const transaction = await prisma.prepaidTransaction.findFirst({
        where: {
          clientProfileId: workspace.clientProfile.id,
          type: 'DEDUCTION',
          appointmentId: appointment.id,
        },
      })
      expect(transaction?.amount.toNumber()).toBe(30)
      expect(transaction?.balanceAfter.toNumber()).toBe(0)

      // Now complete another appointment - should trigger invoice generation (stays on PREPAID)
      const appointment2 = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() - 3600000 * 1),
        endTime: new Date(Date.now()),
        status: 'COMPLETED',
      })

      const deductionResult2 = await prepaidService.deductSession(appointment2.id)
      expect(deductionResult2.shouldGenerateInvoice).toBe(true)
      expect(deductionResult2.shouldSwitchToPerSession).toBe(false)
      expect(deductionResult2.success).toBe(false)
    })
  })

  describe('Transaction history tracking', () => {
    it('should maintain complete transaction history with credits and deductions', async () => {
      const workspace = await createTestWorkspace({
        billingFrequency: 'PREPAID',
        prepaidBalance: 500,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Session 1
      const appt1 = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() - 86400000 * 3),
        endTime: new Date(Date.now() - 86400000 * 3 + 3600000),
        status: 'COMPLETED',
      })
      await invoiceService.generatePerSessionInvoice(appt1.id)

      // Session 2
      const appt2 = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() - 86400000 * 2),
        endTime: new Date(Date.now() - 86400000 * 2 + 3600000),
        status: 'COMPLETED',
      })
      await invoiceService.generatePerSessionInvoice(appt2.id)

      // Add credit
      await prepaidService.addCredit(workspace.client.id, 200, 'Monthly payment')

      // Session 3
      const appt3 = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() - 86400000),
        endTime: new Date(Date.now() - 86400000 + 3600000),
        status: 'COMPLETED',
      })
      await invoiceService.generatePerSessionInvoice(appt3.id)

      // Get transaction history
      const history = await prepaidService.getTransactions(workspace.clientProfile.id)

      expect(history.total).toBe(4) // 3 deductions + 1 credit
      expect(history.transactions.length).toBe(4)

      // Verify transaction types and order (most recent first)
      const types = history.transactions.map(t => t.type)
      expect(types.filter(t => t === 'DEDUCTION').length).toBe(3)
      expect(types.filter(t => t === 'CREDIT').length).toBe(1)

      // Verify final balance calculation
      const finalBalance = await prisma.clientProfile.findUnique({
        where: { id: workspace.clientProfile.id },
        select: { prepaidBalance: true },
      })
      // Started: 500, -100, -100, +200, -100 = 400
      expect(finalBalance?.prepaidBalance?.toNumber()).toBe(400)
    })
  })

  describe('Edge cases and validation', () => {
    it('should handle multiple deductions without race conditions', async () => {
      const workspace = await createTestWorkspace({
        billingFrequency: 'PREPAID',
        prepaidBalance: 300,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Create 3 appointments at different times
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

      // Process all deductions sequentially
      for (const appointment of appointments) {
        await invoiceService.generatePerSessionInvoice(appointment.id)
      }

      // Verify final balance is correct
      const finalProfile = await prisma.clientProfile.findUnique({
        where: { id: workspace.clientProfile.id },
      })
      expect(finalProfile?.prepaidBalance?.toNumber()).toBe(0) // 300 - 100 - 100 - 100

      // Verify all transactions recorded
      const transactions = await prisma.prepaidTransaction.findMany({
        where: {
          clientProfileId: workspace.clientProfile.id,
          type: 'DEDUCTION',
        },
        orderBy: { createdAt: 'asc' },
      })

      expect(transactions.length).toBe(3)
      expect(transactions[0].balanceAfter.toNumber()).toBe(200)
      expect(transactions[1].balanceAfter.toNumber()).toBe(100)
      expect(transactions[2].balanceAfter.toNumber()).toBe(0)
    })

    it('should not create duplicate deductions for same appointment (idempotency)', async () => {
      const workspace = await createTestWorkspace({
        billingFrequency: 'PREPAID',
        prepaidBalance: 500,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() - 3600000 * 2),
        endTime: new Date(Date.now() - 3600000 * 1),
        status: 'COMPLETED',
      })

      // First deduction
      const result1 = await prepaidService.deductSession(appointment.id)
      expect(result1.success).toBe(true)
      expect(result1.amountDeducted.toNumber()).toBe(100)

      // Try to deduct again - should return existing transaction (idempotent, no double-charge)
      const result2 = await prepaidService.deductSession(appointment.id)
      expect(result2.success).toBe(true)
      expect(result2.amountDeducted.toNumber()).toBe(100) // Same amount from existing transaction

      // Balance should be 400 (only deducted once - idempotency prevents double-charge)
      const profile = await prisma.clientProfile.findUnique({
        where: { id: workspace.clientProfile.id },
      })
      expect(profile?.prepaidBalance?.toNumber()).toBe(400)

      // But InvoiceService should prevent duplicate invoice generation
      await invoiceService.generatePerSessionInvoice(appointment.id)
      await invoiceService.generatePerSessionInvoice(appointment.id) // Call twice

      // When switching to PER_SESSION, only one invoice should be created
      const workspace2 = await createTestWorkspace({
        billingFrequency: 'PREPAID',
        prepaidBalance: 0,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      const appointment2 = await createAppointment({
        trainerId: workspace2.trainer.id,
        clientId: workspace2.client.id,
        workspaceId: workspace2.workspace.id,
        startTime: new Date(Date.now() - 3600000 * 2),
        endTime: new Date(Date.now() - 3600000 * 1),
        status: 'COMPLETED',
      })

      await invoiceService.generatePerSessionInvoice(appointment2.id)
      await invoiceService.generatePerSessionInvoice(appointment2.id) // Try again

      const invoices = await prisma.invoice.findMany({
        where: {
          workspaceId: workspace2.workspace.id,
          clientId: workspace2.client.id,
        },
      })

      expect(invoices.length).toBe(1) // Only one invoice created
    })

    it('should handle top-up invoice generation correctly', async () => {
      const workspace = await createTestWorkspace({
        billingFrequency: 'PREPAID',
        prepaidBalance: 250,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Manually trigger top-up invoice
      const result = await prepaidService.generateTopUpInvoice(
        workspace.client.id,
        workspace.trainer.id
      )

      expect(result).toBeDefined()
      expect(result?.invoiceId).toBeDefined()

      const invoice = await prisma.invoice.findUnique({
        where: { id: result!.invoiceId },
        include: { lineItems: true },
      })

      expect(invoice?.amount.toNumber()).toBe(250) // $500 target - $250 current
      expect(invoice?.status).toBe('SENT')
      expect(invoice?.notes).toContain('Prepaid balance replenishment')

      // Try to generate another top-up (balance is still 250, should generate another)
      const result2 = await prepaidService.generateTopUpInvoice(
        workspace.client.id,
        workspace.trainer.id
      )
      expect(result2).toBeDefined()
    })
  })

  describe('Prepaid client summary', () => {
    it('should correctly summarize prepaid client status', async () => {
      const workspace = await createTestWorkspace({
        billingFrequency: 'PREPAID',
        prepaidBalance: 500,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Create some activity
      const appt1 = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() - 86400000 * 2),
        endTime: new Date(Date.now() - 86400000 * 2 + 3600000),
        status: 'COMPLETED',
      })
      await invoiceService.generatePerSessionInvoice(appt1.id)

      const appt2 = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() - 86400000),
        endTime: new Date(Date.now() - 86400000 + 3600000),
        status: 'COMPLETED',
      })
      await invoiceService.generatePerSessionInvoice(appt2.id)

      // Get summary
      const summaries = await prepaidService.getPrepaidClientsSummary(
        workspace.trainer.id,
        workspace.workspace.id
      )

      expect(summaries.length).toBe(1)
      const summary = summaries[0]

      expect(summary.client.id).toBe(workspace.client.id)
      expect(summary.currentBalance).toBe(300) // 500 - 100 - 100
      expect(summary.targetBalance).toBe(500)
      expect(summary.sessionsConsumedSinceLastCredit).toBe(2)
      expect(summary.balanceStatus).toBe('healthy') // 300 > 25% of 500 (125)
      expect(summary.lastTransactionDate).toBeDefined()

      // Add more deductions to make it low
      const appt3 = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(Date.now()),
        status: 'COMPLETED',
      })
      await invoiceService.generatePerSessionInvoice(appt3.id)

      const appt4 = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() - 1800000),
        endTime: new Date(Date.now()),
        status: 'COMPLETED',
      })
      await invoiceService.generatePerSessionInvoice(appt4.id)

      const summaries2 = await prepaidService.getPrepaidClientsSummary(
        workspace.trainer.id,
        workspace.workspace.id
      )

      expect(summaries2[0].currentBalance).toBe(100)
      expect(summaries2[0].balanceStatus).toBe('low') // 100 < 25% of 500
      expect(summaries2[0].sessionsConsumedSinceLastCredit).toBe(4)
    })
  })
})
