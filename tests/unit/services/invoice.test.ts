import { describe, it, expect, beforeEach, vi } from 'vitest'
import { InvoiceService } from '@/lib/services/invoice'
import { createTestWorkspace, createAppointment, createTestClient } from '@/tests/fixtures/workspace'
import { prisma } from '@/lib/db'
import { clearSentEmails } from '@/tests/mocks/sendgrid'
import { Prisma } from '@prisma/client'

// Mock the email service
vi.mock('@/lib/services/email', () => {
  return {
    EmailService: class MockEmailService {
      async sendInvoiceEmail() {
        return Promise.resolve()
      }
    },
  }
})

describe('InvoiceService', () => {
  let invoiceService: InvoiceService

  beforeEach(() => {
    invoiceService = new InvoiceService()
    clearSentEmails()
  })

  describe('generatePerSessionInvoice', () => {
    it('should create invoice with correct amount for completed appointment', async () => {
      // Arrange
      const workspace = await createTestWorkspace({
        billingFrequency: 'PER_SESSION',
        sessionRate: 150,
        autoInvoiceEnabled: true,
      })

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
        startTime: new Date('2025-01-15T10:00:00Z'),
        endTime: new Date('2025-01-15T11:00:00Z'),
      })

      // Act
      await invoiceService.generatePerSessionInvoice(appointment.id)

      // Assert
      const invoice = await prisma.invoice.findFirst({
        where: {
          lineItems: {
            some: { appointmentId: appointment.id },
          },
        },
        include: { lineItems: true },
      })

      expect(invoice).toBeDefined()
      expect(invoice?.amount).toEqual(new Prisma.Decimal(150))
      expect(invoice?.status).toBe('SENT')
      expect(invoice?.clientId).toBe(workspace.client.id)
      expect(invoice?.trainerId).toBe(workspace.trainer.id)
      expect(invoice?.lineItems).toHaveLength(1)
      expect(invoice?.lineItems[0].unitPrice).toEqual(new Prisma.Decimal(150))
    })

    it('should not generate invoice if already exists for appointment', async () => {
      // Arrange
      const workspace = await createTestWorkspace({
        billingFrequency: 'PER_SESSION',
        sessionRate: 100,
        autoInvoiceEnabled: true,
      })

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
      })

      // Create first invoice
      await invoiceService.generatePerSessionInvoice(appointment.id)

      // Act - try to create second invoice
      await invoiceService.generatePerSessionInvoice(appointment.id)

      // Assert - only one invoice should exist
      const invoices = await prisma.invoice.findMany({
        where: {
          lineItems: {
            some: { appointmentId: appointment.id },
          },
        },
      })

      expect(invoices).toHaveLength(1)
    })

    it('should skip invoice if auto-invoicing disabled', async () => {
      // Arrange
      const workspace = await createTestWorkspace({
        billingFrequency: 'PER_SESSION',
        sessionRate: 100,
        autoInvoiceEnabled: false, // Disabled
      })

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
      })

      // Act
      await invoiceService.generatePerSessionInvoice(appointment.id)

      // Assert
      const invoice = await prisma.invoice.findFirst({
        where: {
          lineItems: {
            some: { appointmentId: appointment.id },
          },
        },
      })

      expect(invoice).toBeNull()
    })

    it('should skip invoice if appointment not completed', async () => {
      // Arrange
      const workspace = await createTestWorkspace({
        billingFrequency: 'PER_SESSION',
        sessionRate: 100,
        autoInvoiceEnabled: true,
      })

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        status: 'SCHEDULED', // Not completed
      })

      // Act
      await invoiceService.generatePerSessionInvoice(appointment.id)

      // Assert
      const invoice = await prisma.invoice.findFirst({
        where: {
          lineItems: {
            some: { appointmentId: appointment.id },
          },
        },
      })

      expect(invoice).toBeNull()
    })

    it('should skip invoice if client has MONTHLY billing', async () => {
      // Arrange
      const workspace = await createTestWorkspace({
        billingFrequency: 'MONTHLY', // Monthly billing
        sessionRate: 100,
        autoInvoiceEnabled: true,
      })

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
      })

      // Act
      await invoiceService.generatePerSessionInvoice(appointment.id)

      // Assert
      const invoice = await prisma.invoice.findFirst({
        where: {
          lineItems: {
            some: { appointmentId: appointment.id },
          },
        },
      })

      expect(invoice).toBeNull()
    })

    it('should rollback to DRAFT if email fails', async () => {
      // Arrange
      const workspace = await createTestWorkspace({
        billingFrequency: 'PER_SESSION',
        sessionRate: 100,
        autoInvoiceEnabled: true,
      })

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
      })

      // Spy on the email service to make it fail
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const emailService = (invoiceService as any).emailService
      vi.spyOn(emailService, 'sendInvoiceEmail').mockRejectedValue(new Error('Email failed'))

      // Act
      await invoiceService.generatePerSessionInvoice(appointment.id)

      // Assert
      const invoice = await prisma.invoice.findFirst({
        where: {
          lineItems: {
            some: { appointmentId: appointment.id },
          },
        },
      })

      expect(invoice?.status).toBe('DRAFT')
    })

    it('should return early if appointment not found', async () => {
      // Act & Assert - should not throw
      await expect(
        invoiceService.generatePerSessionInvoice('non-existent-id')
      ).resolves.toBeUndefined()
    })

    it('should return early if client profile not found', async () => {
      // Arrange
      const workspace = await createTestWorkspace({
        billingFrequency: 'PER_SESSION',
        sessionRate: 100,
        autoInvoiceEnabled: true,
      })

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
      })

      // Delete the client profile
      await prisma.clientProfile.deleteMany({
        where: { userId: workspace.client.id },
      })

      // Act & Assert - should not throw
      await expect(
        invoiceService.generatePerSessionInvoice(appointment.id)
      ).resolves.toBeUndefined()

      // Verify no invoice was created
      const invoice = await prisma.invoice.findFirst({
        where: {
          lineItems: {
            some: { appointmentId: appointment.id },
          },
        },
      })

      expect(invoice).toBeNull()
    })

    it('should set correct due date based on trainer settings', async () => {
      // Arrange
      const workspace = await createTestWorkspace({
        billingFrequency: 'PER_SESSION',
        sessionRate: 100,
        autoInvoiceEnabled: true,
      })

      // Update trainer settings with custom due days
      await prisma.trainerSettings.update({
        where: { trainerId: workspace.trainer.id },
        data: { defaultInvoiceDueDays: 14 },
      })

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
      })

      // Act
      await invoiceService.generatePerSessionInvoice(appointment.id)

      // Assert
      const invoice = await prisma.invoice.findFirst({
        where: {
          lineItems: {
            some: { appointmentId: appointment.id },
          },
        },
      })

      // Check that due date is approximately 14 days from now (within 1 day margin)
      const now = new Date()
      const daysUntilDue = Math.round(
        (invoice!.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      expect(invoice?.dueDate).toBeDefined()
      expect(daysUntilDue).toBeGreaterThanOrEqual(13)
      expect(daysUntilDue).toBeLessThanOrEqual(15)
    })
  })

  describe('generateMonthlyInvoice', () => {
    it('should aggregate multiple sessions into one invoice', async () => {
      // Arrange
      const workspace = await createTestWorkspace({
        billingFrequency: 'MONTHLY',
        sessionRate: 100,
        autoInvoiceEnabled: true,
      })

      // Create 4 completed appointments in the previous month
      const lastMonth = new Date()
      lastMonth.setMonth(lastMonth.getMonth() - 1)
      lastMonth.setDate(15)

      await Promise.all([
        createAppointment({
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          workspaceId: workspace.workspace.id,
          status: 'COMPLETED',
          startTime: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 5, 10, 0),
          endTime: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 5, 11, 0),
        }),
        createAppointment({
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          workspaceId: workspace.workspace.id,
          status: 'COMPLETED',
          startTime: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 12, 10, 0),
          endTime: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 12, 11, 0),
        }),
        createAppointment({
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          workspaceId: workspace.workspace.id,
          status: 'COMPLETED',
          startTime: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 19, 10, 0),
          endTime: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 19, 11, 0),
        }),
        createAppointment({
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          workspaceId: workspace.workspace.id,
          status: 'COMPLETED',
          startTime: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 26, 10, 0),
          endTime: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 26, 11, 0),
        }),
      ])

      // Act
      await invoiceService.generateMonthlyInvoice(workspace.client.id, workspace.trainer.id)

      // Assert
      const invoice = await prisma.invoice.findFirst({
        where: {
          clientId: workspace.client.id,
          trainerId: workspace.trainer.id,
        },
        include: { lineItems: true },
      })

      expect(invoice).toBeDefined()
      expect(invoice?.amount).toEqual(new Prisma.Decimal(400)) // 4 sessions × $100
      expect(invoice?.status).toBe('SENT')
      expect(invoice?.lineItems).toHaveLength(4)
    })

    it('should skip if no completed appointments in billing period', async () => {
      // Arrange
      const workspace = await createTestWorkspace({
        billingFrequency: 'MONTHLY',
        sessionRate: 100,
        autoInvoiceEnabled: true,
      })

      // No appointments created

      // Act
      await invoiceService.generateMonthlyInvoice(workspace.client.id, workspace.trainer.id)

      // Assert
      const invoice = await prisma.invoice.findFirst({
        where: {
          clientId: workspace.client.id,
          trainerId: workspace.trainer.id,
        },
      })

      expect(invoice).toBeNull()
    })

    it('should skip if auto-invoicing disabled', async () => {
      // Arrange
      const workspace = await createTestWorkspace({
        billingFrequency: 'MONTHLY',
        sessionRate: 100,
        autoInvoiceEnabled: false, // Disabled
      })

      // Create appointment in previous month
      const lastMonth = new Date()
      lastMonth.setMonth(lastMonth.getMonth() - 1)

      await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
        startTime: lastMonth,
      })

      // Act
      await invoiceService.generateMonthlyInvoice(workspace.client.id, workspace.trainer.id)

      // Assert
      const invoice = await prisma.invoice.findFirst({
        where: {
          clientId: workspace.client.id,
          trainerId: workspace.trainer.id,
        },
      })

      expect(invoice).toBeNull()
    })

    it('should skip if client has PER_SESSION billing', async () => {
      // Arrange
      const workspace = await createTestWorkspace({
        billingFrequency: 'PER_SESSION', // Per-session billing
        sessionRate: 100,
        autoInvoiceEnabled: true,
      })

      // Act
      await invoiceService.generateMonthlyInvoice(workspace.client.id, workspace.trainer.id)

      // Assert
      const invoice = await prisma.invoice.findFirst({
        where: {
          clientId: workspace.client.id,
          trainerId: workspace.trainer.id,
        },
      })

      expect(invoice).toBeNull()
    })

    it('should not create duplicate invoice for same period', async () => {
      // Arrange
      const workspace = await createTestWorkspace({
        billingFrequency: 'MONTHLY',
        sessionRate: 100,
        autoInvoiceEnabled: true,
      })

      // Create appointment in previous month
      const lastMonth = new Date()
      lastMonth.setMonth(lastMonth.getMonth() - 1)

      await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
        startTime: lastMonth,
      })

      // Act - generate twice
      await invoiceService.generateMonthlyInvoice(workspace.client.id, workspace.trainer.id)
      await invoiceService.generateMonthlyInvoice(workspace.client.id, workspace.trainer.id)

      // Assert - only one invoice should exist
      const invoices = await prisma.invoice.findMany({
        where: {
          clientId: workspace.client.id,
          trainerId: workspace.trainer.id,
        },
      })

      expect(invoices).toHaveLength(1)
    })

    it('should return early if client not found', async () => {
      // Act & Assert - should not throw
      await expect(
        invoiceService.generateMonthlyInvoice('non-existent-client-id', 'non-existent-trainer-id')
      ).resolves.toBeUndefined()
    })

    it('should return early if client profile not found', async () => {
      // Arrange - create a user without a client profile
      const workspace = await createTestWorkspace()

      // Delete the client profile
      await prisma.clientProfile.deleteMany({
        where: { userId: workspace.client.id },
      })

      // Act & Assert - should not throw
      await expect(
        invoiceService.generateMonthlyInvoice(workspace.client.id, workspace.trainer.id)
      ).resolves.toBeUndefined()
    })

    it('should rollback to DRAFT if monthly invoice email fails', async () => {
      // Arrange
      const workspace = await createTestWorkspace({
        billingFrequency: 'MONTHLY',
        sessionRate: 100,
        autoInvoiceEnabled: true,
      })

      // Create appointment in previous month
      const lastMonth = new Date()
      lastMonth.setMonth(lastMonth.getMonth() - 1)

      await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
        startTime: lastMonth,
      })

      // Spy on the email service to make it fail
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const emailService = (invoiceService as any).emailService
      vi.spyOn(emailService, 'sendInvoiceEmail').mockRejectedValue(new Error('Email failed'))

      // Act
      await invoiceService.generateMonthlyInvoice(workspace.client.id, workspace.trainer.id)

      // Assert
      const invoice = await prisma.invoice.findFirst({
        where: {
          clientId: workspace.client.id,
          trainerId: workspace.trainer.id,
        },
      })

      expect(invoice?.status).toBe('DRAFT')
    })
  })

  describe('processMonthlyInvoices', () => {
    it('should process invoices for trainers on invoice day', async () => {
      // Arrange
      const today = new Date().getDate()

      const workspace = await createTestWorkspace({
        billingFrequency: 'MONTHLY',
        sessionRate: 100,
        autoInvoiceEnabled: true,
        monthlyInvoiceDay: today, // Set to today
      })

      // Create completed appointment in previous month
      const lastMonth = new Date()
      lastMonth.setMonth(lastMonth.getMonth() - 1)

      await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
        startTime: lastMonth,
      })

      // Act
      await invoiceService.processMonthlyInvoices()

      // Assert
      const invoice = await prisma.invoice.findFirst({
        where: {
          clientId: workspace.client.id,
          trainerId: workspace.trainer.id,
        },
      })

      expect(invoice).toBeDefined()
    })

    it('should skip trainers not on invoice day', async () => {
      // Arrange
      const today = new Date().getDate()
      const notToday = today === 1 ? 15 : 1 // Different day

      const workspace = await createTestWorkspace({
        billingFrequency: 'MONTHLY',
        sessionRate: 100,
        autoInvoiceEnabled: true,
        monthlyInvoiceDay: notToday, // Not today
      })

      // Create completed appointment
      const lastMonth = new Date()
      lastMonth.setMonth(lastMonth.getMonth() - 1)

      await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
        startTime: lastMonth,
      })

      // Act
      await invoiceService.processMonthlyInvoices()

      // Assert
      const invoice = await prisma.invoice.findFirst({
        where: {
          clientId: workspace.client.id,
          trainerId: workspace.trainer.id,
        },
      })

      expect(invoice).toBeNull()
    })

    it('should continue processing even if one client fails', async () => {
      // Arrange
      const today = new Date().getDate()

      await createTestWorkspace({
        billingFrequency: 'MONTHLY',
        sessionRate: 100,
        autoInvoiceEnabled: true,
        monthlyInvoiceDay: today,
      })

      // Spy on generateMonthlyInvoice to make it fail once
      const spy = vi.spyOn(invoiceService, 'generateMonthlyInvoice')
      spy.mockRejectedValueOnce(new Error('Test error'))
      spy.mockResolvedValueOnce(undefined)

      // Act & Assert - should not throw
      await expect(invoiceService.processMonthlyInvoices()).resolves.toBeUndefined()
    })
  })

  describe('Group Session Billing', () => {
    describe('Group Detection with EXACT_MATCH', () => {
      it('should detect group session when appointments have exact same start and end times', async () => {
        // Arrange
        const workspace = await createTestWorkspace({
          billingFrequency: 'PER_SESSION',
          sessionRate: 100,
          autoInvoiceEnabled: true,
          groupSessionMatchingLogic: 'EXACT_MATCH',
          defaultGroupSessionRate: 60,
        })

        const client2 = await createTestClient({
          workspaceId: workspace.workspace.id,
          sessionRate: 100,
          autoInvoiceEnabled: true,
        })

        const startTime = new Date('2025-01-15T10:00:00Z')
        const endTime = new Date('2025-01-15T11:00:00Z')

        // Create overlapping appointments
        const apt1 = await createAppointment({
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          workspaceId: workspace.workspace.id,
          status: 'COMPLETED',
          startTime,
          endTime,
        })

        await createAppointment({
          trainerId: workspace.trainer.id,
          clientId: client2.user.id,
          workspaceId: workspace.workspace.id,
          status: 'COMPLETED',
          startTime,
          endTime,
        })

        // Act
        await invoiceService.generatePerSessionInvoice(apt1.id)

        // Assert
        const invoice = await prisma.invoice.findFirst({
          where: {
            lineItems: {
              some: { appointmentId: apt1.id },
            },
          },
          include: { lineItems: true },
        })

        expect(invoice).toBeDefined()
        // Should use trainer default group rate (60) since client has no specific group rate
        expect(invoice?.amount).toEqual(new Prisma.Decimal(60))
        expect(invoice?.lineItems[0].description).toContain('Group')
      })

      it('should NOT detect group session when end times differ', async () => {
        // Arrange
        const workspace = await createTestWorkspace({
          billingFrequency: 'PER_SESSION',
          sessionRate: 100,
          autoInvoiceEnabled: true,
          groupSessionMatchingLogic: 'EXACT_MATCH',
          defaultGroupSessionRate: 60,
        })

        const client2 = await createTestClient({
          workspaceId: workspace.workspace.id,
          sessionRate: 100,
          autoInvoiceEnabled: true,
        })

        const startTime = new Date('2025-01-15T10:00:00Z')

        // Create appointments with same start but different end times
        const apt1 = await createAppointment({
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          workspaceId: workspace.workspace.id,
          status: 'COMPLETED',
          startTime,
          endTime: new Date('2025-01-15T11:00:00Z'),
        })

        await createAppointment({
          trainerId: workspace.trainer.id,
          clientId: client2.user.id,
          workspaceId: workspace.workspace.id,
          status: 'COMPLETED',
          startTime,
          endTime: new Date('2025-01-15T11:30:00Z'), // Different end time
        })

        // Act
        await invoiceService.generatePerSessionInvoice(apt1.id)

        // Assert
        const invoice = await prisma.invoice.findFirst({
          where: {
            lineItems: {
              some: { appointmentId: apt1.id },
            },
          },
          include: { lineItems: true },
        })

        expect(invoice).toBeDefined()
        // Should use individual rate (100) since times don't match exactly
        expect(invoice?.amount).toEqual(new Prisma.Decimal(100))
        expect(invoice?.lineItems[0].description).not.toContain('Group')
      })
    })

    describe('Group Detection with START_MATCH', () => {
      it('should detect group session when appointments have same start time', async () => {
        // Arrange
        const workspace = await createTestWorkspace({
          billingFrequency: 'PER_SESSION',
          sessionRate: 100,
          autoInvoiceEnabled: true,
          groupSessionMatchingLogic: 'START_MATCH',
          defaultGroupSessionRate: 60,
        })

        const client2 = await createTestClient({
          workspaceId: workspace.workspace.id,
          sessionRate: 100,
          autoInvoiceEnabled: true,
        })

        const startTime = new Date('2025-01-15T10:00:00Z')

        // Create appointments with same start but different end times
        const apt1 = await createAppointment({
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          workspaceId: workspace.workspace.id,
          status: 'COMPLETED',
          startTime,
          endTime: new Date('2025-01-15T11:00:00Z'),
        })

        await createAppointment({
          trainerId: workspace.trainer.id,
          clientId: client2.user.id,
          workspaceId: workspace.workspace.id,
          status: 'COMPLETED',
          startTime,
          endTime: new Date('2025-01-15T11:30:00Z'), // Different end time but same start
        })

        // Act
        await invoiceService.generatePerSessionInvoice(apt1.id)

        // Assert
        const invoice = await prisma.invoice.findFirst({
          where: {
            lineItems: {
              some: { appointmentId: apt1.id },
            },
          },
          include: { lineItems: true },
        })

        expect(invoice).toBeDefined()
        // Should use group rate since start times match
        expect(invoice?.amount).toEqual(new Prisma.Decimal(60))
        expect(invoice?.lineItems[0].description).toContain('Group')
      })
    })

    describe('Group Detection with ANY_OVERLAP', () => {
      it('should detect group session when appointments overlap at all', async () => {
        // Arrange
        const workspace = await createTestWorkspace({
          billingFrequency: 'PER_SESSION',
          sessionRate: 100,
          autoInvoiceEnabled: true,
          groupSessionMatchingLogic: 'ANY_OVERLAP',
          defaultGroupSessionRate: 60,
        })

        const client2 = await createTestClient({
          workspaceId: workspace.workspace.id,
          sessionRate: 100,
          autoInvoiceEnabled: true,
        })

        // Create appointments that partially overlap
        const apt1 = await createAppointment({
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          workspaceId: workspace.workspace.id,
          status: 'COMPLETED',
          startTime: new Date('2025-01-15T10:00:00Z'),
          endTime: new Date('2025-01-15T11:00:00Z'),
        })

        await createAppointment({
          trainerId: workspace.trainer.id,
          clientId: client2.user.id,
          workspaceId: workspace.workspace.id,
          status: 'COMPLETED',
          startTime: new Date('2025-01-15T10:30:00Z'), // Starts during apt1
          endTime: new Date('2025-01-15T11:30:00Z'),
        })

        // Act
        await invoiceService.generatePerSessionInvoice(apt1.id)

        // Assert
        const invoice = await prisma.invoice.findFirst({
          where: {
            lineItems: {
              some: { appointmentId: apt1.id },
            },
          },
          include: { lineItems: true },
        })

        expect(invoice).toBeDefined()
        // Should use group rate since times overlap
        expect(invoice?.amount).toEqual(new Prisma.Decimal(60))
        expect(invoice?.lineItems[0].description).toContain('Group')
      })
    })

    describe('Rate Fallback Chain', () => {
      it('should use client group rate when set', async () => {
        // Arrange - Client has specific group rate
        const workspace = await createTestWorkspace({
          billingFrequency: 'PER_SESSION',
          sessionRate: 100,
          groupSessionRate: 50, // Client-specific group rate
          autoInvoiceEnabled: true,
          groupSessionMatchingLogic: 'EXACT_MATCH',
          defaultGroupSessionRate: 60, // Trainer default
        })

        const client2 = await createTestClient({
          workspaceId: workspace.workspace.id,
          sessionRate: 100,
          autoInvoiceEnabled: true,
        })

        const startTime = new Date('2025-01-15T10:00:00Z')
        const endTime = new Date('2025-01-15T11:00:00Z')

        const apt1 = await createAppointment({
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          workspaceId: workspace.workspace.id,
          status: 'COMPLETED',
          startTime,
          endTime,
        })

        await createAppointment({
          trainerId: workspace.trainer.id,
          clientId: client2.user.id,
          workspaceId: workspace.workspace.id,
          status: 'COMPLETED',
          startTime,
          endTime,
        })

        // Act
        await invoiceService.generatePerSessionInvoice(apt1.id)

        // Assert
        const invoice = await prisma.invoice.findFirst({
          where: {
            lineItems: {
              some: { appointmentId: apt1.id },
            },
          },
          include: { lineItems: true },
        })

        expect(invoice).toBeDefined()
        // Should use client-specific group rate (50), not trainer default (60)
        expect(invoice?.amount).toEqual(new Prisma.Decimal(50))
      })

      it('should use trainer default group rate when client has no group rate', async () => {
        // Arrange
        const workspace = await createTestWorkspace({
          billingFrequency: 'PER_SESSION',
          sessionRate: 100,
          // No client group rate specified
          autoInvoiceEnabled: true,
          groupSessionMatchingLogic: 'EXACT_MATCH',
          defaultGroupSessionRate: 60, // Trainer default
        })

        const client2 = await createTestClient({
          workspaceId: workspace.workspace.id,
          sessionRate: 100,
          autoInvoiceEnabled: true,
        })

        const startTime = new Date('2025-01-15T10:00:00Z')
        const endTime = new Date('2025-01-15T11:00:00Z')

        const apt1 = await createAppointment({
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          workspaceId: workspace.workspace.id,
          status: 'COMPLETED',
          startTime,
          endTime,
        })

        await createAppointment({
          trainerId: workspace.trainer.id,
          clientId: client2.user.id,
          workspaceId: workspace.workspace.id,
          status: 'COMPLETED',
          startTime,
          endTime,
        })

        // Act
        await invoiceService.generatePerSessionInvoice(apt1.id)

        // Assert
        const invoice = await prisma.invoice.findFirst({
          where: {
            lineItems: {
              some: { appointmentId: apt1.id },
            },
          },
          include: { lineItems: true },
        })

        expect(invoice).toBeDefined()
        // Should use trainer default group rate (60)
        expect(invoice?.amount).toEqual(new Prisma.Decimal(60))
      })

      it('should fallback to individual rate when no group rates are set', async () => {
        // Arrange
        const workspace = await createTestWorkspace({
          billingFrequency: 'PER_SESSION',
          sessionRate: 100,
          // No client group rate
          autoInvoiceEnabled: true,
          groupSessionMatchingLogic: 'EXACT_MATCH',
          // No trainer default group rate
        })

        const client2 = await createTestClient({
          workspaceId: workspace.workspace.id,
          sessionRate: 100,
          autoInvoiceEnabled: true,
        })

        const startTime = new Date('2025-01-15T10:00:00Z')
        const endTime = new Date('2025-01-15T11:00:00Z')

        const apt1 = await createAppointment({
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          workspaceId: workspace.workspace.id,
          status: 'COMPLETED',
          startTime,
          endTime,
        })

        await createAppointment({
          trainerId: workspace.trainer.id,
          clientId: client2.user.id,
          workspaceId: workspace.workspace.id,
          status: 'COMPLETED',
          startTime,
          endTime,
        })

        // Act
        await invoiceService.generatePerSessionInvoice(apt1.id)

        // Assert
        const invoice = await prisma.invoice.findFirst({
          where: {
            lineItems: {
              some: { appointmentId: apt1.id },
            },
          },
          include: { lineItems: true },
        })

        expect(invoice).toBeDefined()
        // Should fallback to individual rate (100)
        expect(invoice?.amount).toEqual(new Prisma.Decimal(100))
        // But description should still indicate group session
        expect(invoice?.lineItems[0].description).toContain('Group')
      })
    })

    describe('Cancellation Scenarios', () => {
      it('should bill as individual session when other group members cancelled', async () => {
        // Arrange
        const workspace = await createTestWorkspace({
          billingFrequency: 'PER_SESSION',
          sessionRate: 100,
          autoInvoiceEnabled: true,
          groupSessionMatchingLogic: 'EXACT_MATCH',
          defaultGroupSessionRate: 60,
        })

        const client2 = await createTestClient({
          workspaceId: workspace.workspace.id,
          sessionRate: 100,
          autoInvoiceEnabled: true,
        })

        const startTime = new Date('2025-01-15T10:00:00Z')
        const endTime = new Date('2025-01-15T11:00:00Z')

        // Client 1's appointment is completed
        const apt1 = await createAppointment({
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          workspaceId: workspace.workspace.id,
          status: 'COMPLETED',
          startTime,
          endTime,
        })

        // Client 2's appointment was cancelled
        await createAppointment({
          trainerId: workspace.trainer.id,
          clientId: client2.user.id,
          workspaceId: workspace.workspace.id,
          status: 'CANCELLED', // Cancelled - should not count for group
          startTime,
          endTime,
        })

        // Act
        await invoiceService.generatePerSessionInvoice(apt1.id)

        // Assert
        const invoice = await prisma.invoice.findFirst({
          where: {
            lineItems: {
              some: { appointmentId: apt1.id },
            },
          },
          include: { lineItems: true },
        })

        expect(invoice).toBeDefined()
        // Should bill at individual rate since cancelled appointments don't count
        expect(invoice?.amount).toEqual(new Prisma.Decimal(100))
        expect(invoice?.lineItems[0].description).not.toContain('Group')
      })
    })

    describe('Monthly Invoice with Mixed Sessions', () => {
      it('should apply correct rates for mix of group and individual sessions', async () => {
        // Arrange
        const workspace = await createTestWorkspace({
          billingFrequency: 'MONTHLY',
          sessionRate: 100,
          groupSessionRate: 50, // Client-specific group rate
          autoInvoiceEnabled: true,
          groupSessionMatchingLogic: 'EXACT_MATCH',
          defaultGroupSessionRate: 60,
        })

        const client2 = await createTestClient({
          workspaceId: workspace.workspace.id,
          sessionRate: 100,
          autoInvoiceEnabled: true,
        })

        const lastMonth = new Date()
        lastMonth.setMonth(lastMonth.getMonth() - 1)

        // Session 1 - Individual (no overlap)
        await createAppointment({
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          workspaceId: workspace.workspace.id,
          status: 'COMPLETED',
          startTime: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 5, 10, 0),
          endTime: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 5, 11, 0),
        })

        // Session 2 - Group (overlapping with client2)
        const groupStartTime = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 12, 10, 0)
        const groupEndTime = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 12, 11, 0)

        await createAppointment({
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          workspaceId: workspace.workspace.id,
          status: 'COMPLETED',
          startTime: groupStartTime,
          endTime: groupEndTime,
        })

        await createAppointment({
          trainerId: workspace.trainer.id,
          clientId: client2.user.id,
          workspaceId: workspace.workspace.id,
          status: 'COMPLETED',
          startTime: groupStartTime,
          endTime: groupEndTime,
        })

        // Session 3 - Individual (no overlap)
        await createAppointment({
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          workspaceId: workspace.workspace.id,
          status: 'COMPLETED',
          startTime: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 19, 10, 0),
          endTime: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 19, 11, 0),
        })

        // Act
        await invoiceService.generateMonthlyInvoice(workspace.client.id, workspace.trainer.id)

        // Assert
        const invoice = await prisma.invoice.findFirst({
          where: {
            clientId: workspace.client.id,
            trainerId: workspace.trainer.id,
          },
          include: { lineItems: true },
        })

        expect(invoice).toBeDefined()
        expect(invoice?.lineItems).toHaveLength(3)
        // Total should be: 100 (individual) + 50 (group, client rate) + 100 (individual) = 250
        expect(invoice?.amount).toEqual(new Prisma.Decimal(250))

        // Check one line item is marked as group
        const groupLineItems = invoice?.lineItems.filter(li => li.description.includes('Group'))
        expect(groupLineItems).toHaveLength(1)
      })
    })
  })
})
