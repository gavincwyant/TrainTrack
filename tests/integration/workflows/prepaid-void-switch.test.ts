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

// Helper to simulate the invoice PATCH endpoint behavior for marking as paid
async function markInvoiceAsPaid(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      client: {
        include: {
          clientProfile: true,
        },
      },
    },
  })

  if (!invoice) throw new Error('Invoice not found')

  // Check if this is a prepaid top-up invoice being marked as PAID
  const isPrepaidTopUp = invoice.notes?.includes("Prepaid balance replenishment")
  const isBeingMarkedPaid = invoice.status !== "PAID"

  // If marking a prepaid top-up invoice as paid, update the client's balance
  if (isPrepaidTopUp && isBeingMarkedPaid && invoice.client.clientProfile) {
    const clientProfile = invoice.client.clientProfile
    const currentBalance = clientProfile.prepaidBalance?.toNumber() || 0
    const invoiceAmount = invoice.amount.toNumber()
    const newBalance = currentBalance + invoiceAmount

    await prisma.$transaction([
      prisma.clientProfile.update({
        where: { id: clientProfile.id },
        data: { prepaidBalance: newBalance },
      }),
      prisma.prepaidTransaction.create({
        data: {
          clientProfileId: clientProfile.id,
          type: "CREDIT",
          amount: invoiceAmount,
          balanceAfter: newBalance,
          description: "Prepaid balance replenishment - invoice paid",
        },
      }),
    ])
  }

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: 'PAID', paidAt: new Date() },
  })
}

describe('Void Invoice & Switch Billing', () => {
  let prepaidService: PrepaidService

  beforeEach(async () => {
    prepaidService = new PrepaidService()
  })

  describe('Void prepaid top-up invoice', () => {
    it('should void top-up invoice and switch to PER_SESSION', async () => {
      // Create prepaid client with some balance remaining
      const workspace = await createTestWorkspace({
        billingFrequency: 'PREPAID',
        prepaidBalance: 150,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Generate a top-up invoice
      const topUpResult = await prepaidService.generateTopUpInvoice(
        workspace.client.id,
        workspace.trainer.id
      )
      expect(topUpResult).toBeDefined()
      expect(topUpResult?.invoiceId).toBeDefined()

      // Verify invoice was created
      const invoice = await prisma.invoice.findUnique({
        where: { id: topUpResult!.invoiceId },
      })
      expect(invoice?.status).toBe('SENT')
      expect(invoice?.notes).toContain('Prepaid balance replenishment')

      // Void the invoice and switch to PER_SESSION
      const voidResult = await prepaidService.voidInvoiceAndSwitchBilling(
        topUpResult!.invoiceId,
        'PER_SESSION'
      )

      expect(voidResult.success).toBe(true)
      expect(voidResult.creditAmount).toBe(150) // The remaining balance
      expect(voidResult.newBillingFrequency).toBe('PER_SESSION')

      // Verify invoice is now CANCELLED
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: topUpResult!.invoiceId },
      })
      expect(updatedInvoice?.status).toBe('CANCELLED')

      // Verify client billing frequency changed
      const updatedProfile = await prisma.clientProfile.findUnique({
        where: { id: workspace.clientProfile.id },
      })
      expect(updatedProfile?.billingFrequency).toBe('PER_SESSION')

      // Verify prepaid balance is preserved as credit
      expect(updatedProfile?.prepaidBalance?.toNumber()).toBe(150)
    })

    it('should void top-up invoice and switch to MONTHLY', async () => {
      const workspace = await createTestWorkspace({
        billingFrequency: 'PREPAID',
        prepaidBalance: 200,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      const topUpResult = await prepaidService.generateTopUpInvoice(
        workspace.client.id,
        workspace.trainer.id
      )

      const voidResult = await prepaidService.voidInvoiceAndSwitchBilling(
        topUpResult!.invoiceId,
        'MONTHLY'
      )

      expect(voidResult.success).toBe(true)
      expect(voidResult.newBillingFrequency).toBe('MONTHLY')

      const updatedProfile = await prisma.clientProfile.findUnique({
        where: { id: workspace.clientProfile.id },
      })
      expect(updatedProfile?.billingFrequency).toBe('MONTHLY')
      expect(updatedProfile?.prepaidBalance?.toNumber()).toBe(200)
    })
  })

  describe('Error cases', () => {
    it('should reject voiding non-prepaid invoice', async () => {
      // Create a regular per-session client and invoice
      const workspace = await createTestWorkspace({
        billingFrequency: 'PER_SESSION',
        sessionRate: 100,
      })

      // Create a regular invoice (not a prepaid top-up)
      const invoice = await prisma.invoice.create({
        data: {
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          amount: 100,
          dueDate: new Date(Date.now() + 86400000 * 30),
          status: 'SENT',
          notes: 'Regular per-session invoice', // Not a prepaid top-up
        },
      })

      const result = await prepaidService.voidInvoiceAndSwitchBilling(
        invoice.id,
        'PER_SESSION'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('not a prepaid top-up invoice')
    })

    it('should reject voiding paid invoice', async () => {
      const workspace = await createTestWorkspace({
        billingFrequency: 'PREPAID',
        prepaidBalance: 150,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      const topUpResult = await prepaidService.generateTopUpInvoice(
        workspace.client.id,
        workspace.trainer.id
      )

      // Mark the invoice as PAID
      await prisma.invoice.update({
        where: { id: topUpResult!.invoiceId },
        data: { status: 'PAID', paidAt: new Date() },
      })

      const result = await prepaidService.voidInvoiceAndSwitchBilling(
        topUpResult!.invoiceId,
        'PER_SESSION'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Cannot void a paid invoice')
    })

    it('should reject voiding cancelled invoice', async () => {
      const workspace = await createTestWorkspace({
        billingFrequency: 'PREPAID',
        prepaidBalance: 150,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      const topUpResult = await prepaidService.generateTopUpInvoice(
        workspace.client.id,
        workspace.trainer.id
      )

      // Mark the invoice as CANCELLED
      await prisma.invoice.update({
        where: { id: topUpResult!.invoiceId },
        data: { status: 'CANCELLED' },
      })

      const result = await prepaidService.voidInvoiceAndSwitchBilling(
        topUpResult!.invoiceId,
        'PER_SESSION'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('already cancelled')
    })

    it('should reject voiding non-existent invoice', async () => {
      const result = await prepaidService.voidInvoiceAndSwitchBilling(
        'non-existent-id',
        'PER_SESSION'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })
  })

  describe('Edge cases', () => {
    it('should handle zero balance at void time', async () => {
      const workspace = await createTestWorkspace({
        billingFrequency: 'PREPAID',
        prepaidBalance: 0,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      // Generate top-up invoice for client with $0 balance
      const topUpResult = await prepaidService.generateTopUpInvoice(
        workspace.client.id,
        workspace.trainer.id
      )

      const voidResult = await prepaidService.voidInvoiceAndSwitchBilling(
        topUpResult!.invoiceId,
        'PER_SESSION'
      )

      expect(voidResult.success).toBe(true)
      expect(voidResult.creditAmount).toBe(0) // No credit to retain

      const updatedProfile = await prisma.clientProfile.findUnique({
        where: { id: workspace.clientProfile.id },
      })
      expect(updatedProfile?.billingFrequency).toBe('PER_SESSION')
      expect(updatedProfile?.prepaidBalance?.toNumber()).toBe(0)
    })

    it('should create transaction record documenting credit retention', async () => {
      const workspace = await createTestWorkspace({
        billingFrequency: 'PREPAID',
        prepaidBalance: 250,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      const topUpResult = await prepaidService.generateTopUpInvoice(
        workspace.client.id,
        workspace.trainer.id
      )

      await prepaidService.voidInvoiceAndSwitchBilling(
        topUpResult!.invoiceId,
        'PER_SESSION'
      )

      // Find the CREDIT transaction created during void
      const creditTransaction = await prisma.prepaidTransaction.findFirst({
        where: {
          clientProfileId: workspace.clientProfile.id,
          type: 'CREDIT',
          description: { contains: 'Credit retained' },
        },
      })

      expect(creditTransaction).toBeDefined()
      expect(creditTransaction?.description).toContain('PER_SESSION')
      expect(creditTransaction?.balanceAfter.toNumber()).toBe(250)
    })

    it('should not create transaction record when zero balance', async () => {
      const workspace = await createTestWorkspace({
        billingFrequency: 'PREPAID',
        prepaidBalance: 0,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      const topUpResult = await prepaidService.generateTopUpInvoice(
        workspace.client.id,
        workspace.trainer.id
      )

      await prepaidService.voidInvoiceAndSwitchBilling(
        topUpResult!.invoiceId,
        'PER_SESSION'
      )

      // Should NOT create a credit transaction when balance is 0
      const creditTransaction = await prisma.prepaidTransaction.findFirst({
        where: {
          clientProfileId: workspace.clientProfile.id,
          type: 'CREDIT',
          description: { contains: 'Credit retained' },
        },
      })

      expect(creditTransaction).toBeNull()
    })
  })

  describe('Prepaid invoice payment', () => {
    it('should update client balance when prepaid top-up invoice is marked as paid', async () => {
      // Create prepaid client with low balance
      const workspace = await createTestWorkspace({
        billingFrequency: 'PREPAID',
        prepaidBalance: 20,
        prepaidTargetBalance: 400,
        sessionRate: 100,
      })

      // Generate top-up invoice ($380 to reach target)
      const topUpResult = await prepaidService.generateTopUpInvoice(
        workspace.client.id,
        workspace.trainer.id
      )
      expect(topUpResult).toBeDefined()

      // Verify invoice amount
      const invoice = await prisma.invoice.findUnique({
        where: { id: topUpResult!.invoiceId },
      })
      expect(invoice?.amount.toNumber()).toBe(380)

      // Verify balance before payment
      let profile = await prisma.clientProfile.findUnique({
        where: { id: workspace.clientProfile.id },
      })
      expect(profile?.prepaidBalance?.toNumber()).toBe(20)

      // Mark invoice as paid (simulating API endpoint behavior)
      await markInvoiceAsPaid(topUpResult!.invoiceId)

      // Verify balance after payment: $20 + $380 = $400
      profile = await prisma.clientProfile.findUnique({
        where: { id: workspace.clientProfile.id },
      })
      expect(profile?.prepaidBalance?.toNumber()).toBe(400)

      // Verify transaction record was created
      const transaction = await prisma.prepaidTransaction.findFirst({
        where: {
          clientProfileId: workspace.clientProfile.id,
          type: 'CREDIT',
          description: { contains: 'invoice paid' },
        },
      })
      expect(transaction).toBeDefined()
      expect(transaction?.amount.toNumber()).toBe(380)
      expect(transaction?.balanceAfter.toNumber()).toBe(400)
    })

    it('should not update balance for non-prepaid invoices', async () => {
      // Create per-session client
      const workspace = await createTestWorkspace({
        billingFrequency: 'PER_SESSION',
        sessionRate: 100,
      })

      // Create a regular invoice
      const invoice = await prisma.invoice.create({
        data: {
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          amount: 100,
          dueDate: new Date(Date.now() + 86400000 * 30),
          status: 'SENT',
          notes: 'Regular session invoice',
        },
      })

      // Mark as paid
      await markInvoiceAsPaid(invoice.id)

      // Should NOT create any prepaid transaction
      const transaction = await prisma.prepaidTransaction.findFirst({
        where: {
          clientProfileId: workspace.clientProfile.id,
          description: { contains: 'invoice paid' },
        },
      })
      expect(transaction).toBeNull()
    })

    it('should not double-credit when invoice is already paid', async () => {
      const workspace = await createTestWorkspace({
        billingFrequency: 'PREPAID',
        prepaidBalance: 50,
        prepaidTargetBalance: 500,
        sessionRate: 100,
      })

      const topUpResult = await prepaidService.generateTopUpInvoice(
        workspace.client.id,
        workspace.trainer.id
      )

      // Mark as paid first time
      await markInvoiceAsPaid(topUpResult!.invoiceId)

      let profile = await prisma.clientProfile.findUnique({
        where: { id: workspace.clientProfile.id },
      })
      expect(profile?.prepaidBalance?.toNumber()).toBe(500) // 50 + 450

      // Try to mark as paid again (should not add more credit)
      await markInvoiceAsPaid(topUpResult!.invoiceId)

      profile = await prisma.clientProfile.findUnique({
        where: { id: workspace.clientProfile.id },
      })
      expect(profile?.prepaidBalance?.toNumber()).toBe(500) // Still 500, not 950

      // Should only have one credit transaction
      const transactions = await prisma.prepaidTransaction.findMany({
        where: {
          clientProfileId: workspace.clientProfile.id,
          type: 'CREDIT',
          description: { contains: 'invoice paid' },
        },
      })
      expect(transactions.length).toBe(1)
    })
  })
})
