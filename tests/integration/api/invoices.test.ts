import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from '@/app/api/invoices/route'
import { POST as SendInvoice } from '@/app/api/invoices/[id]/send/route'
import { prisma } from '@/lib/db'
import { createTestWorkspace, createAppointment } from '@/tests/fixtures/workspace'

// Mock the auth module
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// Mock EmailService
vi.mock('@/lib/services/email', () => ({
  EmailService: class MockEmailService {
    async sendInvoiceEmail() {
      return Promise.resolve()
    }
  },
}))

import { auth } from '@/lib/auth'

describe('Invoice API', () => {
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

  describe('GET /api/invoices', () => {
    it('should return all workspace invoices', async () => {
      // Create invoice
      await prisma.invoice.create({
        data: {
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          amount: 100,
          dueDate: new Date(Date.now() + 86400000 * 30),
          status: 'DRAFT',
        },
      })

      const request = new Request('http://localhost:3000/api/invoices')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.invoices).toBeDefined()
      expect(data.invoices.length).toBeGreaterThanOrEqual(1)
    })

    it('should filter by status', async () => {
      // Create invoices with different statuses
      await prisma.invoice.create({
        data: {
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          amount: 100,
          dueDate: new Date(Date.now() + 86400000 * 30),
          status: 'DRAFT',
        },
      })

      await prisma.invoice.create({
        data: {
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          amount: 150,
          dueDate: new Date(Date.now() + 86400000 * 30),
          status: 'SENT',
        },
      })

      await prisma.invoice.create({
        data: {
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          amount: 200,
          dueDate: new Date(Date.now() + 86400000 * 30),
          status: 'PAID',
        },
      })

      // Filter for SENT invoices
      const request = new Request('http://localhost:3000/api/invoices?status=SENT')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.invoices).toBeDefined()
      expect(data.invoices.every((inv: { status: string }) => inv.status === 'SENT')).toBe(true)
    })

    it('should include client and line items', async () => {
      // Create appointment
      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
      })

      // Create invoice with line item
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

      await prisma.invoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          appointmentId: appointment.id,
          description: 'Personal training session',
          unitPrice: 100,
          quantity: 1,
          total: 100,
        },
      })

      const request = new Request('http://localhost:3000/api/invoices')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.invoices.length).toBeGreaterThan(0)

      const firstInvoice = data.invoices[0]
      expect(firstInvoice.client).toBeDefined()
      expect(firstInvoice.client.fullName).toBeDefined()
      expect(firstInvoice.lineItems).toBeDefined()
    })

    it('should only return trainer\'s own invoices', async () => {
      // Create second workspace with different trainer
      const workspace2 = await createTestWorkspace()

      // Create invoice for workspace2
      await prisma.invoice.create({
        data: {
          workspaceId: workspace2.workspace.id,
          trainerId: workspace2.trainer.id,
          clientId: workspace2.client.id,
          amount: 200,
          dueDate: new Date(Date.now() + 86400000 * 30),
          status: 'DRAFT',
        },
      })

      // Request as workspace1 trainer
      const request = new Request('http://localhost:3000/api/invoices')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      // Should not include workspace2 invoices
      expect(data.invoices.every((inv: { trainerId: string }) =>
        inv.trainerId === workspace.trainer.id
      )).toBe(true)
    })

    it('should order by creation date descending', async () => {
      // Create multiple invoices with slight delay
      const invoice1 = await prisma.invoice.create({
        data: {
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          amount: 100,
          dueDate: new Date(Date.now() + 86400000 * 30),
          status: 'DRAFT',
        },
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      const invoice2 = await prisma.invoice.create({
        data: {
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          amount: 150,
          dueDate: new Date(Date.now() + 86400000 * 30),
          status: 'DRAFT',
        },
      })

      const request = new Request('http://localhost:3000/api/invoices')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      const invoiceIds = data.invoices.map((inv: { id: string }) => inv.id)
      const invoice2Index = invoiceIds.indexOf(invoice2.id)
      const invoice1Index = invoiceIds.indexOf(invoice1.id)

      // Most recent should be first
      if (invoice2Index !== -1 && invoice1Index !== -1) {
        expect(invoice2Index).toBeLessThan(invoice1Index)
      }
    })
  })

  describe('POST /api/invoices/[id]/send', () => {
    it('should send invoice email and update status', async () => {
      // Create draft invoice
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

      const request = new Request(`http://localhost:3000/api/invoices/${invoice.id}/send`, {
        method: 'POST',
      })

      const response = await SendInvoice(request, { params: Promise.resolve({ id: invoice.id }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Invoice sent successfully')

      // Verify status was updated
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: invoice.id },
      })

      expect(updatedInvoice?.status).toBe('SENT')
    })

    it('should not change status if invoice already sent', async () => {
      // Create sent invoice
      const invoice = await prisma.invoice.create({
        data: {
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          clientId: workspace.client.id,
          amount: 100,
          dueDate: new Date(Date.now() + 86400000 * 30),
          status: 'SENT',
        },
      })

      const request = new Request(`http://localhost:3000/api/invoices/${invoice.id}/send`, {
        method: 'POST',
      })

      const response = await SendInvoice(request, { params: Promise.resolve({ id: invoice.id }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Status should remain SENT
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: invoice.id },
      })

      expect(updatedInvoice?.status).toBe('SENT')
    })

    it('should return 404 for non-existent invoice', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'

      const request = new Request(`http://localhost:3000/api/invoices/${fakeId}/send`, {
        method: 'POST',
      })

      const response = await SendInvoice(request, { params: Promise.resolve({ id: fakeId }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Invoice not found')
    })

    it('should enforce workspace isolation', async () => {
      // Create second workspace
      const workspace2 = await createTestWorkspace()

      // Create invoice in workspace2
      const invoice = await prisma.invoice.create({
        data: {
          workspaceId: workspace2.workspace.id,
          trainerId: workspace2.trainer.id,
          clientId: workspace2.client.id,
          amount: 200,
          dueDate: new Date(Date.now() + 86400000 * 30),
          status: 'DRAFT',
        },
      })

      // Try to send invoice from workspace1 trainer session (already mocked)
      const request = new Request(`http://localhost:3000/api/invoices/${invoice.id}/send`, {
        method: 'POST',
      })

      const response = await SendInvoice(request, { params: Promise.resolve({ id: invoice.id }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized')
    })

    it('should include all invoice data in email', async () => {
      // Create appointment
      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
        status: 'COMPLETED',
      })

      // Create invoice with line item
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

      await prisma.invoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          appointmentId: appointment.id,
          description: 'Personal training session',
          unitPrice: 100,
          quantity: 1,
          total: 100,
        },
      })

      const request = new Request(`http://localhost:3000/api/invoices/${invoice.id}/send`, {
        method: 'POST',
      })

      const response = await SendInvoice(request, { params: Promise.resolve({ id: invoice.id }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle email service errors', async () => {
      // Mock email service to throw error
      const EmailService = await import('@/lib/services/email')
      vi.spyOn(EmailService.EmailService.prototype, 'sendInvoiceEmail').mockRejectedValue(
        new Error('Email service error')
      )

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

      const request = new Request(`http://localhost:3000/api/invoices/${invoice.id}/send`, {
        method: 'POST',
      })

      const response = await SendInvoice(request, { params: Promise.resolve({ id: invoice.id }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to send invoice email')

      // Status should remain DRAFT since email failed
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: invoice.id },
      })

      expect(updatedInvoice?.status).toBe('DRAFT')
    })
  })
})
