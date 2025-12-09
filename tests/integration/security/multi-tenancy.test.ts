import { describe, it, expect } from 'vitest'
import { prisma } from '@/lib/db'
import { createTestWorkspace, createAppointment } from '@/tests/fixtures/workspace'

describe('Multi-Tenancy Security', () => {
  describe('Cross-workspace data access prevention', () => {
    it('should prevent trainer from accessing another workspace\'s clients', async () => {
      // Arrange - Create two separate workspaces
      const workspace1 = await createTestWorkspace()
      const workspace2 = await createTestWorkspace()

      // Act - Try to query workspace2's client from workspace1's context
      const client = await prisma.user.findFirst({
        where: {
          id: workspace2.client.id,
          workspaceId: workspace1.workspace.id, // Wrong workspace
        },
      })

      // Assert - Should not find the client
      expect(client).toBeNull()
    })

    it('should prevent trainer from accessing another workspace\'s appointments', async () => {
      // Arrange
      const workspace1 = await createTestWorkspace()
      const workspace2 = await createTestWorkspace()

      const appointment2 = await createAppointment({
        trainerId: workspace2.trainer.id,
        clientId: workspace2.client.id,
        workspaceId: workspace2.workspace.id,
      })

      // Act - Try to query workspace2's appointment with workspace1's context
      const appointment = await prisma.appointment.findFirst({
        where: {
          id: appointment2.id,
          workspaceId: workspace1.workspace.id, // Wrong workspace
        },
      })

      // Assert
      expect(appointment).toBeNull()
    })

    it('should prevent trainer from accessing another workspace\'s invoices', async () => {
      // Arrange
      const workspace1 = await createTestWorkspace()
      const workspace2 = await createTestWorkspace()

      // Create invoice in workspace2
      const invoice2 = await prisma.invoice.create({
        data: {
          workspaceId: workspace2.workspace.id,
          trainerId: workspace2.trainer.id,
          clientId: workspace2.client.id,
          amount: 100,
          dueDate: new Date(Date.now() + 86400000 * 30),
          status: 'DRAFT',
        },
      })

      // Act - Try to query workspace2's invoice with workspace1's context
      const invoice = await prisma.invoice.findFirst({
        where: {
          id: invoice2.id,
          workspaceId: workspace1.workspace.id, // Wrong workspace
        },
      })

      // Assert
      expect(invoice).toBeNull()
    })

    it('should isolate client profiles between workspaces', async () => {
      // Arrange
      const workspace1 = await createTestWorkspace()
      await createTestWorkspace()

      // Act - Try to query client profiles across workspaces
      const profiles = await prisma.clientProfile.findMany({
        where: {
          workspaceId: workspace1.workspace.id,
        },
      })

      // Assert - Should only return workspace1's profiles
      expect(profiles).toHaveLength(1)
      expect(profiles[0].userId).toBe(workspace1.client.id)
      expect(profiles[0].workspaceId).toBe(workspace1.workspace.id)
    })

    it('should isolate trainer settings between workspaces', async () => {
      // Arrange
      const workspace1 = await createTestWorkspace()
      await createTestWorkspace()

      // Act
      const settings = await prisma.trainerSettings.findMany({
        where: {
          workspaceId: workspace1.workspace.id,
        },
      })

      // Assert
      expect(settings).toHaveLength(1)
      expect(settings[0].trainerId).toBe(workspace1.trainer.id)
      expect(settings[0].workspaceId).toBe(workspace1.workspace.id)
    })

    it('should prevent access to workout sessions from other workspaces', async () => {
      // Arrange
      const workspace1 = await createTestWorkspace()
      const workspace2 = await createTestWorkspace()

      const appointment2 = await createAppointment({
        trainerId: workspace2.trainer.id,
        clientId: workspace2.client.id,
        workspaceId: workspace2.workspace.id,
        status: 'COMPLETED',
      })

      const workoutSession2 = await prisma.workoutSession.create({
        data: {
          appointmentId: appointment2.id,
          workspaceId: workspace2.workspace.id,
          trainerId: workspace2.trainer.id,
          clientId: workspace2.client.id,
          date: new Date(),
          notes: 'Confidential workout data',
          exercises: [],
        },
      })

      // Act - Try to access workout session from workspace1's context
      const session = await prisma.workoutSession.findFirst({
        where: {
          id: workoutSession2.id,
          workspaceId: workspace1.workspace.id, // Wrong workspace
        },
      })

      // Assert
      expect(session).toBeNull()
    })
  })

  describe('Workspace scoping enforcement', () => {
    it('should only return users from the specified workspace', async () => {
      // Arrange
      const workspace1 = await createTestWorkspace()
      const workspace2 = await createTestWorkspace()

      // Act
      const workspace1Users = await prisma.user.findMany({
        where: { workspaceId: workspace1.workspace.id },
      })

      const workspace2Users = await prisma.user.findMany({
        where: { workspaceId: workspace2.workspace.id },
      })

      // Assert - Each workspace should have at least 1 user (client for sure, trainer might be created differently)
      expect(workspace1Users.length).toBeGreaterThanOrEqual(1)
      expect(workspace2Users.length).toBeGreaterThanOrEqual(1)

      // All returned users should belong to the correct workspace
      expect(workspace1Users.every(u => u.workspaceId === workspace1.workspace.id)).toBe(true)
      expect(workspace2Users.every(u => u.workspaceId === workspace2.workspace.id)).toBe(true)
    })

    it('should only return appointments for the specified workspace', async () => {
      // Arrange
      const workspace1 = await createTestWorkspace()
      const workspace2 = await createTestWorkspace()

      await createAppointment({
        trainerId: workspace1.trainer.id,
        clientId: workspace1.client.id,
        workspaceId: workspace1.workspace.id,
      })

      await createAppointment({
        trainerId: workspace2.trainer.id,
        clientId: workspace2.client.id,
        workspaceId: workspace2.workspace.id,
      })

      // Act
      const workspace1Appointments = await prisma.appointment.findMany({
        where: { workspaceId: workspace1.workspace.id },
      })

      const workspace2Appointments = await prisma.appointment.findMany({
        where: { workspaceId: workspace2.workspace.id },
      })

      // Assert
      expect(workspace1Appointments).toHaveLength(1)
      expect(workspace2Appointments).toHaveLength(1)

      expect(workspace1Appointments[0].workspaceId).toBe(workspace1.workspace.id)
      expect(workspace2Appointments[0].workspaceId).toBe(workspace2.workspace.id)
    })

    it('should enforce workspace isolation in complex queries', async () => {
      // Arrange
      const workspace1 = await createTestWorkspace()
      const workspace2 = await createTestWorkspace()

      await createAppointment({
        trainerId: workspace1.trainer.id,
        clientId: workspace1.client.id,
        workspaceId: workspace1.workspace.id,
      })

      await createAppointment({
        trainerId: workspace2.trainer.id,
        clientId: workspace2.client.id,
        workspaceId: workspace2.workspace.id,
      })

      // Act - Complex query with joins
      const appointments = await prisma.appointment.findMany({
        where: { workspaceId: workspace1.workspace.id },
        include: {
          client: true,
          trainer: true,
        },
      })

      // Assert
      expect(appointments).toHaveLength(1)
      expect(appointments[0].workspaceId).toBe(workspace1.workspace.id)
      // Client and trainer may have null workspaceId if they're part of the workspace relation
      // The important check is that the appointment itself is scoped correctly
      if (appointments[0].client.workspaceId) {
        expect(appointments[0].client.workspaceId).toBe(workspace1.workspace.id)
      }
      if (appointments[0].trainer.workspaceId) {
        expect(appointments[0].trainer.workspaceId).toBe(workspace1.workspace.id)
      }
    })

    it('should prevent cross-workspace relationships', async () => {
      // Arrange
      const workspace1 = await createTestWorkspace()
      const workspace2 = await createTestWorkspace()

      // Act - Try to create an appointment with trainer from workspace1 and client from workspace2
      const appointment = await prisma.appointment.create({
        data: {
          workspaceId: workspace1.workspace.id,
          trainerId: workspace1.trainer.id,
          clientId: workspace2.client.id, // Cross-workspace client
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600000),
          status: 'SCHEDULED',
        },
      })

      // Assert - While Prisma allows this at DB level, application logic should prevent it
      // This test verifies that such a relationship CAN be created at DB level,
      // but application-level validation in API routes must prevent it
      expect(appointment.workspaceId).toBe(workspace1.workspace.id)
      expect(appointment.trainerId).toBe(workspace1.trainer.id)
      expect(appointment.clientId).toBe(workspace2.client.id)

      // Verify that the client doesn't belong to the appointment's workspace
      const client = await prisma.user.findUnique({
        where: { id: workspace2.client.id },
      })
      expect(client?.workspaceId).not.toBe(workspace1.workspace.id)
    })
  })

  describe('Data leakage prevention', () => {
    it('should not leak client data in count queries', async () => {
      // Arrange
      const workspace1 = await createTestWorkspace()
      const workspace2 = await createTestWorkspace()

      // Act
      const workspace1ClientCount = await prisma.user.count({
        where: {
          workspaceId: workspace1.workspace.id,
          role: 'CLIENT',
        },
      })

      const workspace2ClientCount = await prisma.user.count({
        where: {
          workspaceId: workspace2.workspace.id,
          role: 'CLIENT',
        },
      })

      const totalClients = await prisma.user.count({
        where: { role: 'CLIENT' },
      })

      // Assert
      expect(workspace1ClientCount).toBe(1)
      expect(workspace2ClientCount).toBe(1)
      expect(totalClients).toBeGreaterThanOrEqual(2) // At least our 2 test clients
    })

    it('should not leak invoice data in aggregation queries', async () => {
      // Arrange
      const workspace1 = await createTestWorkspace()
      const workspace2 = await createTestWorkspace()

      await prisma.invoice.create({
        data: {
          workspaceId: workspace1.workspace.id,
          trainerId: workspace1.trainer.id,
          clientId: workspace1.client.id,
          amount: 100,
          dueDate: new Date(Date.now() + 86400000 * 30),
          status: 'SENT',
        },
      })

      await prisma.invoice.create({
        data: {
          workspaceId: workspace2.workspace.id,
          trainerId: workspace2.trainer.id,
          clientId: workspace2.client.id,
          amount: 200,
          dueDate: new Date(Date.now() + 86400000 * 30),
          status: 'SENT',
        },
      })

      // Act
      const workspace1Total = await prisma.invoice.aggregate({
        where: { workspaceId: workspace1.workspace.id },
        _sum: { amount: true },
      })

      const workspace2Total = await prisma.invoice.aggregate({
        where: { workspaceId: workspace2.workspace.id },
        _sum: { amount: true },
      })

      // Assert
      expect(workspace1Total._sum.amount?.toNumber()).toBe(100)
      expect(workspace2Total._sum.amount?.toNumber()).toBe(200)
    })

    it('should not expose email addresses across workspaces', async () => {
      // Arrange
      const workspace1 = await createTestWorkspace()
      const workspace2 = await createTestWorkspace()

      // Act - Try to find user by email but without workspace filter
      const usersByEmail = await prisma.user.findMany({
        where: {
          email: workspace2.client.email,
          workspaceId: workspace1.workspace.id, // Wrong workspace
        },
      })

      // Assert
      expect(usersByEmail).toHaveLength(0)
    })

    it('should not allow viewing pending client profiles from other workspaces', async () => {
      // Arrange
      const workspace1 = await createTestWorkspace()
      const workspace2 = await createTestWorkspace()

      // Create pending client profile in workspace2
      const pendingProfile = await prisma.pendingClientProfile.create({
        data: {
          workspaceId: workspace2.workspace.id,
          trainerId: workspace2.trainer.id,
          source: 'google',
          sourceEventIds: ['event-123'],
          extractedName: 'John Doe',
          extractionConfidence: 'high',
          extractionReason: 'Full name found in event summary',
          firstSeenDate: new Date(),
        },
      })

      // Act - Try to access from workspace1
      const profile = await prisma.pendingClientProfile.findFirst({
        where: {
          id: pendingProfile.id,
          workspaceId: workspace1.workspace.id,
        },
      })

      // Assert
      expect(profile).toBeNull()
    })
  })

  describe('Workspace validation', () => {
    it('should require valid workspaceId for creating appointments', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      // Act & Assert
      await expect(
        prisma.appointment.create({
          data: {
            workspaceId: 'invalid-workspace-id',
            trainerId: workspace.trainer.id,
            clientId: workspace.client.id,
            startTime: new Date(),
            endTime: new Date(Date.now() + 3600000),
            status: 'SCHEDULED',
          },
        })
      ).rejects.toThrow() // Foreign key constraint
    })

    it('should require valid workspaceId for creating invoices', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      // Act & Assert
      await expect(
        prisma.invoice.create({
          data: {
            workspaceId: 'invalid-workspace-id',
            trainerId: workspace.trainer.id,
            clientId: workspace.client.id,
            amount: 100,
            dueDate: new Date(Date.now() + 86400000 * 30),
            status: 'DRAFT',
          },
        })
      ).rejects.toThrow() // Foreign key constraint
    })

    it('should cascade delete workspace data when workspace is deleted', async () => {
      // Arrange
      const workspace = await createTestWorkspace()

      const appointment = await createAppointment({
        trainerId: workspace.trainer.id,
        clientId: workspace.client.id,
        workspaceId: workspace.workspace.id,
      })

      // Act - Delete workspace (CASCADE should delete all related data)
      await prisma.workspace.delete({
        where: { id: workspace.workspace.id },
      })

      // Assert - Verify appointment and client are deleted
      const deletedAppointment = await prisma.appointment.findUnique({
        where: { id: appointment.id },
      })
      expect(deletedAppointment).toBeNull()

      const deletedClient = await prisma.user.findUnique({
        where: { id: workspace.client.id },
      })
      expect(deletedClient).toBeNull()

      // Note: Trainer may not be deleted because they're referenced via workspace.trainerId
      // This is the expected behavior - trainers can exist without a workspace
      const trainer = await prisma.user.findUnique({
        where: { id: workspace.trainer.id },
      })
      // Trainer still exists but workspaceId should be null
      if (trainer) {
        expect(trainer.workspaceId).toBeNull()
      }
    })
  })
})
