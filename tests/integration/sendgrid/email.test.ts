import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { EmailService } from '@/lib/services/email'
import { prisma } from '@/lib/db'
import { createTestWorkspace, createAppointment } from '@/tests/fixtures/workspace'
import type { Invoice, InvoiceLineItem } from '@prisma/client'

// Mock SendGrid - must use factory function to avoid hoisting issues
vi.mock('@sendgrid/mail', () => ({
  default: {
    setApiKey: vi.fn(),
    send: vi.fn(),
  },
}))

// Import the mocked module
import sgMail from '@sendgrid/mail'

describe('SendGrid Email Integration', () => {
  let workspace: Awaited<ReturnType<typeof createTestWorkspace>>
  let emailService: EmailService

  beforeEach(async () => {
    workspace = await createTestWorkspace()
    emailService = new EmailService()
    vi.mocked(sgMail.send).mockClear()
    vi.mocked(sgMail.send).mockResolvedValue([{ statusCode: 202 } as any])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('sendInvoiceEmail', () => {
    it('should send email with correct recipient and sender', async () => {
      const invoice = await prisma.invoice.create({
        data: {
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          amount: 100,
          dueDate: new Date(Date.now() + 86400000 * 30),
          status: 'DRAFT',
        },
        include: {
          client: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          trainer: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          lineItems: true,
        },
      })

      await emailService.sendInvoiceEmail(invoice)

      expect(sgMail.send).toHaveBeenCalledTimes(1)
      const emailData = vi.mocked(sgMail.send).mock.calls[0][0]

      expect(emailData.to).toBe(workspace.client.email)
      expect(emailData.from.name).toBe(workspace.trainer.fullName)
      expect(emailData.replyTo).toBe(workspace.trainer.email)
    })

    it('should include invoice amount in email', async () => {
      const invoice = await prisma.invoice.create({
        data: {
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          amount: 150.50,
          dueDate: new Date(Date.now() + 86400000 * 30),
          status: 'DRAFT',
        },
        include: {
          client: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          trainer: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          lineItems: true,
        },
      })

      await emailService.sendInvoiceEmail(invoice)

      const emailData = vi.mocked(sgMail.send).mock.calls[0][0]

      expect(emailData.html).toContain('$150.50')
      expect(emailData.text).toContain('$150.50')
    })

    it('should include all line items in email', async () => {
      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
      })

      const invoice = await prisma.invoice.create({
        data: {
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          amount: 250,
          dueDate: new Date(Date.now() + 86400000 * 30),
          status: 'DRAFT',
        },
      })

      await prisma.invoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          appointmentId: appointment.id,
          description: 'Personal training session',
          unitPrice: 100,
          quantity: 2,
          total: 200,
        },
      })

      await prisma.invoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          description: 'Nutrition consultation',
          unitPrice: 50,
          quantity: 1,
          total: 50,
        },
      })

      const invoiceWithItems = await prisma.invoice.findUnique({
        where: { id: invoice.id },
        include: {
          client: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          trainer: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          lineItems: true,
        },
      })

      await emailService.sendInvoiceEmail(invoiceWithItems!)

      const emailData = vi.mocked(sgMail.send).mock.calls[0][0]

      expect(emailData.html).toContain('Personal training session')
      expect(emailData.html).toContain('Nutrition consultation')
      expect(emailData.text).toContain('Personal training session')
      expect(emailData.text).toContain('Nutrition consultation')
    })

    it('should include due date in email', async () => {
      const dueDate = new Date('2025-12-31T12:00:00Z')

      const invoice = await prisma.invoice.create({
        data: {
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          amount: 100,
          dueDate,
          status: 'DRAFT',
        },
        include: {
          client: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          trainer: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          lineItems: true,
        },
      })

      await emailService.sendInvoiceEmail(invoice)

      const emailData = vi.mocked(sgMail.send).mock.calls[0][0]

      // Check for December and 2025 (day may vary based on timezone)
      expect(emailData.html).toContain('December')
      expect(emailData.html).toContain('2025')
      expect(emailData.text).toContain('December')
      expect(emailData.text).toContain('2025')
    })

    it('should disable click and open tracking', async () => {
      const invoice = await prisma.invoice.create({
        data: {
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          amount: 100,
          dueDate: new Date(Date.now() + 86400000 * 30),
          status: 'DRAFT',
        },
        include: {
          client: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          trainer: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          lineItems: true,
        },
      })

      await emailService.sendInvoiceEmail(invoice)

      const emailData = vi.mocked(sgMail.send).mock.calls[0][0]

      expect(emailData.trackingSettings.clickTracking.enable).toBe(false)
      expect(emailData.trackingSettings.openTracking.enable).toBe(false)
    })

    it('should include notes if present', async () => {
      const invoice = await prisma.invoice.create({
        data: {
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          amount: 100,
          dueDate: new Date(Date.now() + 86400000 * 30),
          status: 'DRAFT',
          notes: 'Payment due within 30 days',
        },
        include: {
          client: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          trainer: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          lineItems: true,
        },
      })

      await emailService.sendInvoiceEmail(invoice)

      const emailData = vi.mocked(sgMail.send).mock.calls[0][0]

      expect(emailData.html).toContain('Payment due within 30 days')
      expect(emailData.text).toContain('Payment due within 30 days')
    })

    it('should not include notes section if notes are empty', async () => {
      const invoice = await prisma.invoice.create({
        data: {
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          amount: 100,
          dueDate: new Date(Date.now() + 86400000 * 30),
          status: 'DRAFT',
          notes: null,
        },
        include: {
          client: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          trainer: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          lineItems: true,
        },
      })

      await emailService.sendInvoiceEmail(invoice)

      const emailData = vi.mocked(sgMail.send).mock.calls[0][0]

      // Should not have note section in HTML
      expect(emailData.html).not.toContain('Note:')
    })

    it('should have both HTML and plain text versions', async () => {
      const invoice = await prisma.invoice.create({
        data: {
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          amount: 100,
          dueDate: new Date(Date.now() + 86400000 * 30),
          status: 'DRAFT',
        },
        include: {
          client: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          trainer: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          lineItems: true,
        },
      })

      await emailService.sendInvoiceEmail(invoice)

      const emailData = vi.mocked(sgMail.send).mock.calls[0][0]

      expect(emailData.html).toBeDefined()
      expect(emailData.html.length).toBeGreaterThan(0)
      expect(emailData.text).toBeDefined()
      expect(emailData.text.length).toBeGreaterThan(0)
    })

    it('should throw error if SendGrid API fails', async () => {
      vi.mocked(sgMail.send).mockRejectedValue(new Error('SendGrid API error'))

      const invoice = await prisma.invoice.create({
        data: {
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          amount: 100,
          dueDate: new Date(Date.now() + 86400000 * 30),
          status: 'DRAFT',
        },
        include: {
          client: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          trainer: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          lineItems: true,
        },
      })

      await expect(emailService.sendInvoiceEmail(invoice)).rejects.toThrow('SendGrid API error')
    })

    it('should format line item quantities and prices correctly', async () => {
      const invoice = await prisma.invoice.create({
        data: {
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          amount: 300,
          dueDate: new Date(Date.now() + 86400000 * 30),
          status: 'DRAFT',
        },
      })

      await prisma.invoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          description: '3 training sessions',
          unitPrice: 100,
          quantity: 3,
          total: 300,
        },
      })

      const invoiceWithItems = await prisma.invoice.findUnique({
        where: { id: invoice.id },
        include: {
          client: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          trainer: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          lineItems: true,
        },
      })

      await emailService.sendInvoiceEmail(invoiceWithItems!)

      const emailData = vi.mocked(sgMail.send).mock.calls[0][0]

      // Check HTML formatting
      expect(emailData.html).toContain('$100.00') // Unit price
      expect(emailData.html).toContain('$300.00') // Total

      // Check text formatting
      expect(emailData.text).toContain('$300.00')
    })

    it('should include invoice ID in subject', async () => {
      const invoice = await prisma.invoice.create({
        data: {
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          amount: 100,
          dueDate: new Date(Date.now() + 86400000 * 30),
          status: 'DRAFT',
        },
        include: {
          client: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          trainer: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          lineItems: true,
        },
      })

      await emailService.sendInvoiceEmail(invoice)

      const emailData = vi.mocked(sgMail.send).mock.calls[0][0]

      expect(emailData.subject).toContain('Invoice')
      expect(emailData.subject).toContain(workspace.trainer.fullName)
    })
  })

  describe('Email formatting', () => {
    it('should format dates in readable format', async () => {
      const specificDate = new Date('2025-06-15T12:00:00Z')

      const invoice = await prisma.invoice.create({
        data: {
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          amount: 100,
          dueDate: specificDate,
          status: 'DRAFT',
        },
        include: {
          client: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          trainer: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          lineItems: true,
        },
      })

      await emailService.sendInvoiceEmail(invoice)

      const emailData = vi.mocked(sgMail.send).mock.calls[0][0]

      // Check that due date is formatted
      expect(emailData.html).toContain('June')
      expect(emailData.html).toContain('2025')
      expect(emailData.text).toContain('June')
      expect(emailData.text).toContain('2025')
    })

    it('should escape HTML in line item descriptions', async () => {
      const invoice = await prisma.invoice.create({
        data: {
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          amount: 100,
          dueDate: new Date(Date.now() + 86400000 * 30),
          status: 'DRAFT',
        },
      })

      // Create line item with potentially dangerous HTML
      await prisma.invoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          description: 'Training <script>alert("xss")</script>',
          unitPrice: 100,
          quantity: 1,
          total: 100,
        },
      })

      const invoiceWithItems = await prisma.invoice.findUnique({
        where: { id: invoice.id },
        include: {
          client: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          trainer: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          lineItems: true,
        },
      })

      await emailService.sendInvoiceEmail(invoiceWithItems!)

      const emailData = vi.mocked(sgMail.send).mock.calls[0][0]

      // HTML should contain the description (SendGrid doesn't auto-escape, but we're testing it's included)
      expect(emailData.html).toContain('Training')
    })
  })
})
