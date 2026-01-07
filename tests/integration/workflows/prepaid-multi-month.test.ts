import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/db'
import { InvoiceService } from '@/lib/services/invoice'
import { PrepaidService } from '@/lib/services/prepaid'
import { createTestWorkspace, createAppointment } from '@/tests/fixtures/workspace'

// Mock email service
vi.mock('@/lib/services/email', () => ({
  EmailService: class MockEmailService {
    async sendInvoiceEmail() { return Promise.resolve() }
  },
}))

describe('Multi-Month Prepaid Lifecycle', () => {
  let invoiceService: InvoiceService
  let prepaidService: PrepaidService

  beforeEach(async () => {
    invoiceService = new InvoiceService()
    prepaidService = new PrepaidService()
  })

  it('should handle full lifecycle: prepaid → low balance → top-up → void → credit applied → depleted', async () => {
    // ============================================
    // MONTH 1: Client starts prepaid, uses sessions
    // ============================================

    // Create prepaid client with $500 balance
    const workspace = await createTestWorkspace({
      billingFrequency: 'PREPAID',
      prepaidBalance: 500,
      prepaidTargetBalance: 500,
      sessionRate: 100,
    })

    // Use 3 sessions in month 1 ($300 total)
    for (let i = 1; i <= 3; i++) {
      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() - 86400000 * 30 - 3600000 * i * 2),
        endTime: new Date(Date.now() - 86400000 * 30 - 3600000 * (i * 2 - 1)),
        status: 'COMPLETED',
      })

      await prepaidService.deductSession(appointment.id)
    }

    // Verify balance after month 1: $500 - $300 = $200
    let profile = await prisma.clientProfile.findUnique({
      where: { id: workspace.clientProfile.id },
    })
    expect(profile?.prepaidBalance?.toNumber()).toBe(200)
    expect(profile?.billingFrequency).toBe('PREPAID')

    // ============================================
    // MONTH 2: Low balance triggers top-up invoice
    // ============================================

    // Use 2 more sessions ($200) - this brings balance to $0
    for (let i = 1; i <= 2; i++) {
      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() - 86400000 * 20 - 3600000 * i * 2),
        endTime: new Date(Date.now() - 86400000 * 20 - 3600000 * (i * 2 - 1)),
        status: 'COMPLETED',
      })

      await prepaidService.deductSession(appointment.id)
    }

    // Verify balance is now $0
    profile = await prisma.clientProfile.findUnique({
      where: { id: workspace.clientProfile.id },
    })
    expect(profile?.prepaidBalance?.toNumber()).toBe(0)

    // Generate top-up invoice (this is typically triggered when balance is low)
    const topUpResult = await prepaidService.generateTopUpInvoice(
      workspace.client.id,
      workspace.trainer.id
    )
    expect(topUpResult).toBeDefined()

    // Verify the invoice amount by querying it
    const topUpInvoice = await prisma.invoice.findUnique({
      where: { id: topUpResult!.invoiceId },
    })
    expect(topUpInvoice?.amount.toNumber()).toBe(500) // Full target balance

    // Simulate client pays the top-up
    await prisma.invoice.update({
      where: { id: topUpResult!.invoiceId },
      data: { status: 'PAID', paidAt: new Date() },
    })

    // Process the payment - add balance back
    await prisma.clientProfile.update({
      where: { id: workspace.clientProfile.id },
      data: { prepaidBalance: 500 },
    })

    // Add transaction record for payment
    await prisma.prepaidTransaction.create({
      data: {
        clientProfileId: workspace.clientProfile.id,
        type: 'CREDIT',
        amount: 500,
        balanceAfter: 500,
        description: 'Prepaid balance replenishment',
      },
    })

    // Use 1 session after top-up
    const monthTwoAppointment = await createAppointment({
      trainerId: workspace.trainer.id,
      clientId: workspace.client.id,
      workspaceId: workspace.workspace.id,
      startTime: new Date(Date.now() - 86400000 * 15 - 3600000),
      endTime: new Date(Date.now() - 86400000 * 15),
      status: 'COMPLETED',
    })

    await prepaidService.deductSession(monthTwoAppointment.id)

    // Balance should be $400 now
    profile = await prisma.clientProfile.findUnique({
      where: { id: workspace.clientProfile.id },
    })
    expect(profile?.prepaidBalance?.toNumber()).toBe(400)

    // ============================================
    // MONTH 3: Client voids top-up, switches to PER_SESSION
    // ============================================

    // Generate another top-up invoice (assume balance fell again for some reason)
    // First reduce balance to trigger a top-up scenario
    await prisma.clientProfile.update({
      where: { id: workspace.clientProfile.id },
      data: { prepaidBalance: 150 },
    })

    const newTopUpResult = await prepaidService.generateTopUpInvoice(
      workspace.client.id,
      workspace.trainer.id
    )
    expect(newTopUpResult).toBeDefined()

    // Client decides they no longer want prepaid - void invoice and switch
    const voidResult = await prepaidService.voidInvoiceAndSwitchBilling(
      newTopUpResult!.invoiceId,
      'PER_SESSION'
    )

    expect(voidResult.success).toBe(true)
    expect(voidResult.creditAmount).toBe(150) // Remaining balance becomes credit
    expect(voidResult.newBillingFrequency).toBe('PER_SESSION')

    // Verify client is now PER_SESSION with $150 credit
    profile = await prisma.clientProfile.findUnique({
      where: { id: workspace.clientProfile.id },
    })
    expect(profile?.billingFrequency).toBe('PER_SESSION')
    expect(profile?.prepaidBalance?.toNumber()).toBe(150)

    // ============================================
    // MONTH 4: Credit applied to per-session invoices
    // ============================================

    // Complete a session - should generate invoice with credit applied
    const monthFourAppointment1 = await createAppointment({
      trainerId: workspace.trainer.id,
      clientId: workspace.client.id,
      workspaceId: workspace.workspace.id,
      startTime: new Date(Date.now() - 86400000 * 5 - 3600000 * 2),
      endTime: new Date(Date.now() - 86400000 * 5 - 3600000),
      status: 'COMPLETED',
    })

    await invoiceService.generatePerSessionInvoice(monthFourAppointment1.id)

    // Invoice should be $0 ($100 session - $100 credit)
    let invoice = await prisma.invoice.findFirst({
      where: {
        workspaceId: workspace.workspace.id,
        clientId: workspace.client.id,
        lineItems: {
          some: {
            appointmentId: monthFourAppointment1.id,
          },
        },
      },
      include: { lineItems: true },
    })

    expect(invoice?.amount.toNumber()).toBe(0)

    // Remaining credit: $150 - $100 = $50
    profile = await prisma.clientProfile.findUnique({
      where: { id: workspace.clientProfile.id },
    })
    expect(profile?.prepaidBalance?.toNumber()).toBe(50)

    // Second session - partial credit remaining
    const monthFourAppointment2 = await createAppointment({
      trainerId: workspace.trainer.id,
      clientId: workspace.client.id,
      workspaceId: workspace.workspace.id,
      startTime: new Date(Date.now() - 86400000 * 3 - 3600000 * 2),
      endTime: new Date(Date.now() - 86400000 * 3 - 3600000),
      status: 'COMPLETED',
    })

    await invoiceService.generatePerSessionInvoice(monthFourAppointment2.id)

    // Invoice should be $50 ($100 session - $50 credit)
    invoice = await prisma.invoice.findFirst({
      where: {
        workspaceId: workspace.workspace.id,
        clientId: workspace.client.id,
        lineItems: {
          some: {
            appointmentId: monthFourAppointment2.id,
          },
        },
      },
      include: { lineItems: true },
    })

    expect(invoice?.amount.toNumber()).toBe(50)

    // Credit should be depleted
    profile = await prisma.clientProfile.findUnique({
      where: { id: workspace.clientProfile.id },
    })
    expect(profile?.prepaidBalance?.toNumber()).toBe(0)

    // ============================================
    // MONTH 5: Normal per-session billing (no credit)
    // ============================================

    const monthFiveAppointment = await createAppointment({
      trainerId: workspace.trainer.id,
      clientId: workspace.client.id,
      workspaceId: workspace.workspace.id,
      startTime: new Date(Date.now() - 3600000 * 2),
      endTime: new Date(Date.now() - 3600000),
      status: 'COMPLETED',
    })

    await invoiceService.generatePerSessionInvoice(monthFiveAppointment.id)

    // Invoice should be full $100 (no credit left)
    invoice = await prisma.invoice.findFirst({
      where: {
        workspaceId: workspace.workspace.id,
        clientId: workspace.client.id,
        lineItems: {
          some: {
            appointmentId: monthFiveAppointment.id,
          },
        },
      },
      include: { lineItems: true },
    })

    expect(invoice?.amount.toNumber()).toBe(100)
    expect(invoice?.lineItems.length).toBe(1) // Only session line item, no credit

    // Verify final state
    profile = await prisma.clientProfile.findUnique({
      where: { id: workspace.clientProfile.id },
    })
    expect(profile?.billingFrequency).toBe('PER_SESSION')
    expect(profile?.prepaidBalance?.toNumber()).toBe(0)

    // Verify transaction history has all the records
    const transactions = await prisma.prepaidTransaction.findMany({
      where: { clientProfileId: workspace.clientProfile.id },
      orderBy: { createdAt: 'asc' },
    })

    // Should have: 3 deductions (month 1) + 2 deductions (month 2) + 1 credit (top-up) +
    // 1 deduction (after top-up) + 1 credit retention + 2 credit applications
    expect(transactions.length).toBeGreaterThanOrEqual(8)

    // Verify deduction types exist
    const deductions = transactions.filter(t => t.type === 'DEDUCTION')
    expect(deductions.length).toBeGreaterThanOrEqual(6)

    // Verify credit retention transaction
    const creditRetention = transactions.find(t =>
      t.type === 'CREDIT' && t.description.includes('Credit retained')
    )
    expect(creditRetention).toBeDefined()
  })

  it('should handle lifecycle with switch to MONTHLY billing', async () => {
    // Create prepaid client
    const workspace = await createTestWorkspace({
      billingFrequency: 'PREPAID',
      prepaidBalance: 300,
      prepaidTargetBalance: 500,
      sessionRate: 100,
      monthlyInvoiceDay: 1,
    })

    // Use some sessions (60 days ago to ensure they're outside "last month" billing period)
    for (let i = 1; i <= 2; i++) {
      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() - 86400000 * 60 - 3600000 * i * 2),
        endTime: new Date(Date.now() - 86400000 * 60 - 3600000 * (i * 2 - 1)),
        status: 'COMPLETED',
      })

      await prepaidService.deductSession(appointment.id)
    }

    // Balance: $300 - $200 = $100
    let profile = await prisma.clientProfile.findUnique({
      where: { id: workspace.clientProfile.id },
    })
    expect(profile?.prepaidBalance?.toNumber()).toBe(100)

    // Generate top-up and void with switch to MONTHLY
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

    profile = await prisma.clientProfile.findUnique({
      where: { id: workspace.clientProfile.id },
    })
    expect(profile?.billingFrequency).toBe('MONTHLY')
    expect(profile?.prepaidBalance?.toNumber()).toBe(100)

    // Create sessions for monthly billing - must be in "last month" for generateMonthlyInvoice
    const now = new Date()
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    // Create appointment on the 15th of last month at noon
    const appointmentDate1 = new Date(firstDayLastMonth.getFullYear(), firstDayLastMonth.getMonth(), 15, 12, 0, 0)
    const appointmentDate2 = new Date(firstDayLastMonth.getFullYear(), firstDayLastMonth.getMonth(), 16, 12, 0, 0)

    await createAppointment({
      trainerId: workspace.trainer.id,
      clientId: workspace.client.id,
      workspaceId: workspace.workspace.id,
      startTime: appointmentDate1,
      endTime: new Date(appointmentDate1.getTime() + 3600000),
      status: 'COMPLETED',
    })

    await createAppointment({
      trainerId: workspace.trainer.id,
      clientId: workspace.client.id,
      workspaceId: workspace.workspace.id,
      startTime: appointmentDate2,
      endTime: new Date(appointmentDate2.getTime() + 3600000),
      status: 'COMPLETED',
    })

    // Generate monthly invoice - should apply credit
    await invoiceService.generateMonthlyInvoice(
      workspace.client.id,
      workspace.trainer.id
    )

    // Find the monthly invoice (exclude the voided prepaid top-up invoice)
    const invoice = await prisma.invoice.findFirst({
      where: {
        workspaceId: workspace.workspace.id,
        clientId: workspace.client.id,
        notes: { contains: 'Monthly invoice' },
        status: { not: 'CANCELLED' },
      },
      include: { lineItems: true },
    })

    expect(invoice).not.toBeNull()
    // 2 sessions at $100 = $200, minus $100 credit = $100
    expect(invoice!.amount.toNumber()).toBe(100)

    // Credit should be depleted
    profile = await prisma.clientProfile.findUnique({
      where: { id: workspace.clientProfile.id },
    })
    expect(profile?.prepaidBalance?.toNumber()).toBe(0)
  })

  it('should preserve transaction history through billing transitions', async () => {
    const workspace = await createTestWorkspace({
      billingFrequency: 'PREPAID',
      prepaidBalance: 200,
      prepaidTargetBalance: 500,
      sessionRate: 100,
    })

    // Create some deduction transactions
    const appointment = await createAppointment({
      trainerId: workspace.trainer.id,
      clientId: workspace.client.id,
      workspaceId: workspace.workspace.id,
      startTime: new Date(Date.now() - 86400000 * 5),
      endTime: new Date(Date.now() - 86400000 * 5 + 3600000),
      status: 'COMPLETED',
    })

    await prepaidService.deductSession(appointment.id)

    // Switch to PER_SESSION
    const topUpResult = await prepaidService.generateTopUpInvoice(
      workspace.client.id,
      workspace.trainer.id
    )

    await prepaidService.voidInvoiceAndSwitchBilling(
      topUpResult!.invoiceId,
      'PER_SESSION'
    )

    // Create per-session invoice with credit
    const perSessionAppointment = await createAppointment({
      trainerId: workspace.trainer.id,
      clientId: workspace.client.id,
      workspaceId: workspace.workspace.id,
      startTime: new Date(Date.now() - 3600000 * 2),
      endTime: new Date(Date.now() - 3600000),
      status: 'COMPLETED',
    })

    await invoiceService.generatePerSessionInvoice(perSessionAppointment.id)

    // Get all transactions to verify history is preserved
    const transactions = await prisma.prepaidTransaction.findMany({
      where: { clientProfileId: workspace.clientProfile.id },
      orderBy: { createdAt: 'asc' },
    })

    // Should have:
    // 1. DEDUCTION for prepaid session ($100)
    // 2. CREDIT for retained credit on switch
    // 3. DEDUCTION for credit applied to invoice

    expect(transactions.length).toBe(3)

    // First: deduction from prepaid
    expect(transactions[0].type).toBe('DEDUCTION')
    expect(transactions[0].amount.toNumber()).toBe(100)
    expect(transactions[0].balanceAfter.toNumber()).toBe(100)

    // Second: credit retention
    expect(transactions[1].type).toBe('CREDIT')
    expect(transactions[1].description).toContain('Credit retained')

    // Third: credit applied to invoice
    expect(transactions[2].type).toBe('DEDUCTION')
    expect(transactions[2].description).toContain('Credit applied')
  })
})
