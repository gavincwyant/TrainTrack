/**
 * Tenant Isolation Tests
 *
 * Critical security tests to verify that data from one workspace
 * cannot be accessed by users from another workspace.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/db'
import { createTestWorkspace, createAppointment, TestWorkspace } from '@/tests/fixtures/workspace'

// Mock the auth module to avoid next-auth import issues
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

import { createTenantScopedPrisma } from '@/lib/middleware/tenant'

describe('Tenant Isolation', () => {
  let workspaceA: TestWorkspace
  let workspaceB: TestWorkspace

  beforeEach(async () => {
    // Create two completely separate workspaces
    workspaceA = await createTestWorkspace({ trainerEmail: 'trainer-a@test.com' })
    workspaceB = await createTestWorkspace({ trainerEmail: 'trainer-b@test.com' })
  })

  describe('Appointment Isolation', () => {
    it('trainer cannot see appointments from another workspace', async () => {
      // Create appointment in workspace A
      const appointmentA = await createAppointment({
        trainerId: workspaceA.trainer.id,
        clientId: workspaceA.client.id,
        workspaceId: workspaceA.workspace.id,
      })

      // Create appointment in workspace B
      const appointmentB = await createAppointment({
        trainerId: workspaceB.trainer.id,
        clientId: workspaceB.client.id,
        workspaceId: workspaceB.workspace.id,
      })

      // Trainer A's scoped prisma should only see workspace A's appointment
      const scopedPrismaA = createTenantScopedPrisma(workspaceA.workspace.id)
      const appointmentsSeenByA = await scopedPrismaA.appointment.findMany()

      expect(appointmentsSeenByA).toHaveLength(1)
      expect(appointmentsSeenByA[0].id).toBe(appointmentA.id)
      expect(appointmentsSeenByA.find(a => a.id === appointmentB.id)).toBeUndefined()

      // Trainer B's scoped prisma should only see workspace B's appointment
      const scopedPrismaB = createTenantScopedPrisma(workspaceB.workspace.id)
      const appointmentsSeenByB = await scopedPrismaB.appointment.findMany()

      expect(appointmentsSeenByB).toHaveLength(1)
      expect(appointmentsSeenByB[0].id).toBe(appointmentB.id)
      expect(appointmentsSeenByB.find(a => a.id === appointmentA.id)).toBeUndefined()
    })

    it('trainer cannot update appointments from another workspace', async () => {
      // Create appointment in workspace A
      const appointmentA = await createAppointment({
        trainerId: workspaceA.trainer.id,
        clientId: workspaceA.client.id,
        workspaceId: workspaceA.workspace.id,
      })

      // Trainer B tries to update workspace A's appointment
      const scopedPrismaB = createTenantScopedPrisma(workspaceB.workspace.id)

      // This should not update anything (workspace filter won't match)
      const result = await scopedPrismaB.appointment.updateMany({
        where: { id: appointmentA.id },
        data: { status: 'CANCELLED' },
      })

      expect(result.count).toBe(0)

      // Verify appointment was NOT modified
      const unchangedAppointment = await prisma.appointment.findUnique({
        where: { id: appointmentA.id },
      })
      expect(unchangedAppointment?.status).toBe('SCHEDULED')
    })

    it('trainer cannot delete appointments from another workspace', async () => {
      // Create appointment in workspace A
      const appointmentA = await createAppointment({
        trainerId: workspaceA.trainer.id,
        clientId: workspaceA.client.id,
        workspaceId: workspaceA.workspace.id,
      })

      // Trainer B tries to delete workspace A's appointment
      const scopedPrismaB = createTenantScopedPrisma(workspaceB.workspace.id)

      const result = await scopedPrismaB.appointment.deleteMany({
        where: { id: appointmentA.id },
      })

      expect(result.count).toBe(0)

      // Verify appointment still exists
      const stillExists = await prisma.appointment.findUnique({
        where: { id: appointmentA.id },
      })
      expect(stillExists).not.toBeNull()
    })
  })

  describe('Client Isolation', () => {
    it('trainer cannot see clients from another workspace', async () => {
      // Query clients visible to workspace A
      const scopedPrismaA = createTenantScopedPrisma(workspaceA.workspace.id)
      const clientsSeenByA = await scopedPrismaA.clientProfile.findMany()

      // Should only see workspace A's client
      expect(clientsSeenByA).toHaveLength(1)
      expect(clientsSeenByA[0].userId).toBe(workspaceA.client.id)

      // Query clients visible to workspace B
      const scopedPrismaB = createTenantScopedPrisma(workspaceB.workspace.id)
      const clientsSeenByB = await scopedPrismaB.clientProfile.findMany()

      // Should only see workspace B's client
      expect(clientsSeenByB).toHaveLength(1)
      expect(clientsSeenByB[0].userId).toBe(workspaceB.client.id)

      // Cross-check: A should not see B's client
      const crossCheck = clientsSeenByA.find(c => c.userId === workspaceB.client.id)
      expect(crossCheck).toBeUndefined()
    })
  })

  describe('Invoice Isolation', () => {
    it('trainer cannot see invoices from another workspace', async () => {
      // Create invoice in workspace A
      const invoiceA = await prisma.invoice.create({
        data: {
          workspaceId: workspaceA.workspace.id,
          trainerId: workspaceA.trainer.id,
          clientId: workspaceA.client.id,
          amount: 100,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'DRAFT',
        },
      })

      // Create invoice in workspace B
      const invoiceB = await prisma.invoice.create({
        data: {
          workspaceId: workspaceB.workspace.id,
          trainerId: workspaceB.trainer.id,
          clientId: workspaceB.client.id,
          amount: 200,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'DRAFT',
        },
      })

      // Trainer A should only see their invoice
      const scopedPrismaA = createTenantScopedPrisma(workspaceA.workspace.id)
      const invoicesSeenByA = await scopedPrismaA.invoice.findMany()

      expect(invoicesSeenByA).toHaveLength(1)
      expect(invoicesSeenByA[0].id).toBe(invoiceA.id)
      expect(invoicesSeenByA[0].amount.toString()).toBe('100')

      // Trainer B should only see their invoice
      const scopedPrismaB = createTenantScopedPrisma(workspaceB.workspace.id)
      const invoicesSeenByB = await scopedPrismaB.invoice.findMany()

      expect(invoicesSeenByB).toHaveLength(1)
      expect(invoicesSeenByB[0].id).toBe(invoiceB.id)
      expect(invoicesSeenByB[0].amount.toString()).toBe('200')
    })
  })

  describe('Direct ID Access Prevention', () => {
    it('findUnique with wrong workspace returns null', async () => {
      // Create appointment in workspace A
      const appointmentA = await createAppointment({
        trainerId: workspaceA.trainer.id,
        clientId: workspaceA.client.id,
        workspaceId: workspaceA.workspace.id,
      })

      // Trainer B tries to access by direct ID
      const scopedPrismaB = createTenantScopedPrisma(workspaceB.workspace.id)
      const result = await scopedPrismaB.appointment.findUnique({
        where: { id: appointmentA.id },
      })

      // Should return null even though the ID exists
      expect(result).toBeNull()
    })
  })
})
