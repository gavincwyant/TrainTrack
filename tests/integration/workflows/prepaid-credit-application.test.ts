import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/db'
import { InvoiceService } from '@/lib/services/invoice'
import { PrepaidService } from '@/lib/services/prepaid'
import { createTestWorkspace, createAppointment, createPrepaidClient } from '@/tests/fixtures/workspace'

// Mock email service
vi.mock('@/lib/services/email', () => ({
  EmailService: class MockEmailService {
    async sendInvoiceEmail() { return Promise.resolve() }
  },
}))

describe('Credit Application to Future Invoices', () => {
  let invoiceService: InvoiceService
  let prepaidService: PrepaidService

  beforeEach(async () => {
    invoiceService = new InvoiceService()
    prepaidService = new PrepaidService()
  })

  describe('Per-Session Billing', () => {
    it('should auto-apply credit to per-session invoice', async () => {
      // Create a PER_SESSION client with prepaid credit (simulating after void & switch)
      const workspace = await createTestWorkspace({
        billingFrequency: 'PER_SESSION',
        sessionRate: 100,
      })

      // Manually add prepaid balance to simulate credit retained after switch
      await prisma.clientProfile.update({
        where: { id: workspace.clientProfile.id },
        data: { prepaidBalance: 50 },
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

      // Generate invoice - should apply credit
      await invoiceService.generatePerSessionInvoice(appointment.id)

      // Verify invoice was created with credit applied
      const invoice = await prisma.invoice.findFirst({
        where: {
          workspaceId: workspace.workspace.id,
          clientId: workspace.client.id,
        },
        include: { lineItems: true },
      })

      expect(invoice).toBeDefined()
      expect(invoice?.amount.toNumber()).toBe(50) // 100 - 50 credit
      expect(invoice?.lineItems.length).toBe(2) // Session + Credit line item

      // Find the credit line item
      const creditLineItem = invoice?.lineItems.find(li =>
        li.description.includes('Prepaid credit applied')
      )
      expect(creditLineItem).toBeDefined()
      expect(creditLineItem?.total.toNumber()).toBe(-50) // Negative amount

      // Verify prepaid balance was deducted
      const updatedProfile = await prisma.clientProfile.findUnique({
        where: { id: workspace.clientProfile.id },
      })
      expect(updatedProfile?.prepaidBalance?.toNumber()).toBe(0)

      // Verify transaction was created
      const transaction = await prisma.prepaidTransaction.findFirst({
        where: {
          clientProfileId: workspace.clientProfile.id,
          type: 'DEDUCTION',
          description: 'Credit applied to invoice',
        },
      })
      expect(transaction).toBeDefined()
      expect(transaction?.amount.toNumber()).toBe(50)
    })

    it('should apply partial credit when credit < invoice amount', async () => {
      const workspace = await createTestWorkspace({
        billingFrequency: 'PER_SESSION',
        sessionRate: 150,
      })

      // Set 40 credit (less than session rate)
      await prisma.clientProfile.update({
        where: { id: workspace.clientProfile.id },
        data: { prepaidBalance: 40 },
      })

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() - 3600000 * 2),
        endTime: new Date(Date.now() - 3600000 * 1),
        status: 'COMPLETED',
      })

      await invoiceService.generatePerSessionInvoice(appointment.id)

      const invoice = await prisma.invoice.findFirst({
        where: {
          workspaceId: workspace.workspace.id,
          clientId: workspace.client.id,
        },
        include: { lineItems: true },
      })

      // Invoice should be 150 - 40 = 110
      expect(invoice?.amount.toNumber()).toBe(110)

      const creditLineItem = invoice?.lineItems.find(li =>
        li.description.includes('Prepaid credit applied')
      )
      expect(creditLineItem?.total.toNumber()).toBe(-40)

      // Credit should be fully depleted
      const updatedProfile = await prisma.clientProfile.findUnique({
        where: { id: workspace.clientProfile.id },
      })
      expect(updatedProfile?.prepaidBalance?.toNumber()).toBe(0)
    })

    it('should create $0 invoice when credit covers full amount', async () => {
      const workspace = await createTestWorkspace({
        billingFrequency: 'PER_SESSION',
        sessionRate: 100,
      })

      // Set credit >= session rate
      await prisma.clientProfile.update({
        where: { id: workspace.clientProfile.id },
        data: { prepaidBalance: 150 },
      })

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() - 3600000 * 2),
        endTime: new Date(Date.now() - 3600000 * 1),
        status: 'COMPLETED',
      })

      await invoiceService.generatePerSessionInvoice(appointment.id)

      const invoice = await prisma.invoice.findFirst({
        where: {
          workspaceId: workspace.workspace.id,
          clientId: workspace.client.id,
        },
        include: { lineItems: true },
      })

      // Invoice should be $0 (fully covered by credit)
      expect(invoice?.amount.toNumber()).toBe(0)

      // Should have session line item ($100) and credit line item (-$100)
      const sessionLineItem = invoice?.lineItems.find(li =>
        li.description.includes('Training session')
      )
      const creditLineItem = invoice?.lineItems.find(li =>
        li.description.includes('Prepaid credit applied')
      )

      expect(sessionLineItem?.total.toNumber()).toBe(100)
      expect(creditLineItem?.total.toNumber()).toBe(-100)

      // Verify remaining credit
      const updatedProfile = await prisma.clientProfile.findUnique({
        where: { id: workspace.clientProfile.id },
      })
      expect(updatedProfile?.prepaidBalance?.toNumber()).toBe(50) // 150 - 100
    })

    it('should deplete credit across multiple invoices', async () => {
      const workspace = await createTestWorkspace({
        billingFrequency: 'PER_SESSION',
        sessionRate: 100,
      })

      // Set credit for ~2.5 sessions
      await prisma.clientProfile.update({
        where: { id: workspace.clientProfile.id },
        data: { prepaidBalance: 250 },
      })

      // Create and process 3 appointments
      for (let i = 1; i <= 3; i++) {
        const appointment = await createAppointment({
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          workspaceId: workspace.workspace.id,
          startTime: new Date(Date.now() - 3600000 * (i * 2)),
          endTime: new Date(Date.now() - 3600000 * (i * 2 - 1)),
          status: 'COMPLETED',
        })

        await invoiceService.generatePerSessionInvoice(appointment.id)
      }

      // Get all invoices
      const invoices = await prisma.invoice.findMany({
        where: {
          workspaceId: workspace.workspace.id,
          clientId: workspace.client.id,
        },
        orderBy: { createdAt: 'asc' },
      })

      expect(invoices.length).toBe(3)

      // Invoice 1: $0 (100 credit applied to 100 session)
      expect(invoices[0].amount.toNumber()).toBe(0)

      // Invoice 2: $0 (100 credit applied to 100 session)
      expect(invoices[1].amount.toNumber()).toBe(0)

      // Invoice 3: $50 (50 credit applied to 100 session)
      expect(invoices[2].amount.toNumber()).toBe(50)

      // Credit should be fully depleted
      const updatedProfile = await prisma.clientProfile.findUnique({
        where: { id: workspace.clientProfile.id },
      })
      expect(updatedProfile?.prepaidBalance?.toNumber()).toBe(0)
    })
  })

  describe('Monthly Billing', () => {
    it('should auto-apply credit to monthly invoice', async () => {
      const workspace = await createTestWorkspace({
        billingFrequency: 'MONTHLY',
        sessionRate: 100,
        monthlyInvoiceDay: 1,
      })

      // Set prepaid credit
      await prisma.clientProfile.update({
        where: { id: workspace.clientProfile.id },
        data: { prepaidBalance: 75 },
      })

      // Create completed appointments in the past month
      const now = new Date()
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15)

      await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime: lastMonth,
        endTime: new Date(lastMonth.getTime() + 3600000),
        status: 'COMPLETED',
      })

      await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(lastMonth.getTime() + 86400000),
        endTime: new Date(lastMonth.getTime() + 86400000 + 3600000),
        status: 'COMPLETED',
      })

      // Generate monthly invoice
      await invoiceService.generateMonthlyInvoice(
        workspace.client.id,
        workspace.trainer.id
      )

      const invoice = await prisma.invoice.findFirst({
        where: {
          workspaceId: workspace.workspace.id,
          clientId: workspace.client.id,
        },
        include: { lineItems: true },
      })

      expect(invoice).toBeDefined()
      // 2 sessions at $100 = $200, minus $75 credit = $125
      expect(invoice?.amount.toNumber()).toBe(125)

      // Should have 3 line items: 2 sessions + 1 credit
      expect(invoice?.lineItems.length).toBe(3)

      const creditLineItem = invoice?.lineItems.find(li =>
        li.description.includes('Prepaid credit applied')
      )
      expect(creditLineItem?.total.toNumber()).toBe(-75)
    })
  })

  describe('Edge Cases', () => {
    it('should deduct from prepaid but NOT generate invoice when balance can still cover sessions', async () => {
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

      // This should deduct from prepaid balance but NOT generate invoice
      // (balance 400 >= session rate 100, can still afford sessions)
      await invoiceService.generatePerSessionInvoice(appointment.id)

      // NO invoice should be created (balance 400 >= session rate 100)
      const invoice = await prisma.invoice.findFirst({
        where: {
          workspaceId: workspace.workspace.id,
          clientId: workspace.client.id,
        },
      })

      expect(invoice).toBeNull()

      // Prepaid balance should be deducted normally
      const updatedProfile = await prisma.clientProfile.findUnique({
        where: { id: workspace.clientProfile.id },
      })
      expect(updatedProfile?.prepaidBalance?.toNumber()).toBe(400)
    })

    it('should not apply credit when balance is zero', async () => {
      const workspace = await createTestWorkspace({
        billingFrequency: 'PER_SESSION',
        sessionRate: 100,
      })

      // No prepaid balance
      expect(workspace.clientProfile.prepaidBalance).toBeNull()

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() - 3600000 * 2),
        endTime: new Date(Date.now() - 3600000 * 1),
        status: 'COMPLETED',
      })

      await invoiceService.generatePerSessionInvoice(appointment.id)

      const invoice = await prisma.invoice.findFirst({
        where: {
          workspaceId: workspace.workspace.id,
          clientId: workspace.client.id,
        },
        include: { lineItems: true },
      })

      // Full amount, no credit applied
      expect(invoice?.amount.toNumber()).toBe(100)
      expect(invoice?.lineItems.length).toBe(1) // Only session, no credit line item
    })

    it('should handle decimal credit amounts correctly', async () => {
      const workspace = await createTestWorkspace({
        billingFrequency: 'PER_SESSION',
        sessionRate: 100,
      })

      // Set decimal credit amount
      await prisma.clientProfile.update({
        where: { id: workspace.clientProfile.id },
        data: { prepaidBalance: 33.33 },
      })

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() - 3600000 * 2),
        endTime: new Date(Date.now() - 3600000 * 1),
        status: 'COMPLETED',
      })

      await invoiceService.generatePerSessionInvoice(appointment.id)

      const invoice = await prisma.invoice.findFirst({
        where: {
          workspaceId: workspace.workspace.id,
          clientId: workspace.client.id,
        },
        include: { lineItems: true },
      })

      // 100 - 33.33 = 66.67
      expect(invoice?.amount.toNumber()).toBeCloseTo(66.67, 2)

      const creditLineItem = invoice?.lineItems.find(li =>
        li.description.includes('Prepaid credit applied')
      )
      expect(creditLineItem?.total.toNumber()).toBeCloseTo(-33.33, 2)

      // Balance should be depleted
      const updatedProfile = await prisma.clientProfile.findUnique({
        where: { id: workspace.clientProfile.id },
      })
      expect(updatedProfile?.prepaidBalance?.toNumber()).toBe(0)
    })
  })
})
