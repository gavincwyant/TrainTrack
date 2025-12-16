import { describe, it, expect, beforeEach } from 'vitest'
import { ClientDeduplicationService } from '@/lib/services/client-deduplication'
import { createTestWorkspace, createTestClient } from '@/tests/fixtures/workspace'
import { prisma } from '@/lib/db'

describe('ClientDeduplicationService', () => {
  let service: ClientDeduplicationService

  beforeEach(() => {
    service = new ClientDeduplicationService()
  })

  describe('findMatchingClient', () => {
    describe('email matching', () => {
      it('should find client by exact email match', async () => {
        const workspace = await createTestWorkspace({
          clientEmail: 'john.smith@example.com',
        })

        const result = await service.findMatchingClient(
          workspace.workspace.id,
          workspace.trainer.id,
          'Different Name',
          'john.smith@example.com'
        )

        expect(result).not.toBeNull()
        expect(result?.type).toBe('existing_client')
        expect(result?.client.id).toBe(workspace.client.id)
        expect(result?.matchReason).toBe('email exact match')
      })

      it('should match email case-insensitively', async () => {
        const workspace = await createTestWorkspace({
          clientEmail: 'john.smith@example.com',
        })

        const result = await service.findMatchingClient(
          workspace.workspace.id,
          workspace.trainer.id,
          'Different Name',
          'JOHN.SMITH@EXAMPLE.COM'
        )

        expect(result).not.toBeNull()
        expect(result?.matchReason).toBe('email exact match')
      })

      it('should not find client with different email', async () => {
        const workspace = await createTestWorkspace({
          clientEmail: 'john.smith@example.com',
        })

        const result = await service.findMatchingClient(
          workspace.workspace.id,
          workspace.trainer.id,
          'Different Name',
          'other@example.com'
        )

        expect(result).toBeNull()
      })
    })

    describe('name matching', () => {
      it('should find client by exact name match', async () => {
        const workspace = await createTestWorkspace()
        const clientName = workspace.client.fullName

        const result = await service.findMatchingClient(
          workspace.workspace.id,
          workspace.trainer.id,
          clientName
        )

        expect(result).not.toBeNull()
        expect(result?.type).toBe('existing_client')
        expect(result?.matchReason).toBe('name exact match')
      })

      it('should match name case-insensitively', async () => {
        const workspace = await createTestWorkspace()
        const clientName = workspace.client.fullName

        const result = await service.findMatchingClient(
          workspace.workspace.id,
          workspace.trainer.id,
          clientName.toUpperCase()
        )

        expect(result).not.toBeNull()
        expect(result?.matchReason).toBe('name exact match')
      })

      it('should match name with extra whitespace', async () => {
        const workspace = await createTestWorkspace()
        const clientName = workspace.client.fullName

        const result = await service.findMatchingClient(
          workspace.workspace.id,
          workspace.trainer.id,
          `  ${clientName}  `
        )

        expect(result).not.toBeNull()
      })

      it('should match name with extra internal spaces collapsed', async () => {
        const workspace = await createTestWorkspace()
        // Create client with known name
        const client = await createTestClient({
          workspaceId: workspace.workspace.id,
          email: 'john.doe@example.com',
        })

        // Update to known name
        await prisma.user.update({
          where: { id: client.user.id },
          data: { fullName: 'John Doe' },
        })

        const result = await service.findMatchingClient(
          workspace.workspace.id,
          workspace.trainer.id,
          'John    Doe' // Multiple spaces
        )

        expect(result).not.toBeNull()
      })

      it('should match name ignoring punctuation', async () => {
        const workspace = await createTestWorkspace()
        const client = await createTestClient({
          workspaceId: workspace.workspace.id,
        })

        await prisma.user.update({
          where: { id: client.user.id },
          data: { fullName: 'John Smith Jr.' },
        })

        const result = await service.findMatchingClient(
          workspace.workspace.id,
          workspace.trainer.id,
          'John Smith Jr'
        )

        expect(result).not.toBeNull()
      })
    })

    describe('fuzzy name matching', () => {
      it('should match single word name if it appears in full name', async () => {
        const workspace = await createTestWorkspace()
        const client = await createTestClient({
          workspaceId: workspace.workspace.id,
        })

        await prisma.user.update({
          where: { id: client.user.id },
          data: { fullName: 'John Smith' },
        })

        const result = await service.findMatchingClient(
          workspace.workspace.id,
          workspace.trainer.id,
          'John'
        )

        expect(result).not.toBeNull()
        expect(result?.matchReason).toBe('name fuzzy match')
      })

      it('should match reversed name order', async () => {
        const workspace = await createTestWorkspace()
        const client = await createTestClient({
          workspaceId: workspace.workspace.id,
        })

        await prisma.user.update({
          where: { id: client.user.id },
          data: { fullName: 'John Smith' },
        })

        const result = await service.findMatchingClient(
          workspace.workspace.id,
          workspace.trainer.id,
          'Smith John'
        )

        expect(result).not.toBeNull()
        expect(result?.matchReason).toBe('name fuzzy match')
      })

      it('should match abbreviated first name', async () => {
        const workspace = await createTestWorkspace()
        const client = await createTestClient({
          workspaceId: workspace.workspace.id,
        })

        await prisma.user.update({
          where: { id: client.user.id },
          data: { fullName: 'John Smith' },
        })

        const result = await service.findMatchingClient(
          workspace.workspace.id,
          workspace.trainer.id,
          'J Smith'
        )

        expect(result).not.toBeNull()
        expect(result?.matchReason).toBe('name fuzzy match')
      })

      it('should not match completely different names', async () => {
        const workspace = await createTestWorkspace()
        const client = await createTestClient({
          workspaceId: workspace.workspace.id,
        })

        await prisma.user.update({
          where: { id: client.user.id },
          data: { fullName: 'John Smith' },
        })

        const result = await service.findMatchingClient(
          workspace.workspace.id,
          workspace.trainer.id,
          'Jane Doe'
        )

        expect(result).toBeNull()
      })
    })

    describe('workspace isolation', () => {
      it('should not match client from different workspace', async () => {
        const workspace1 = await createTestWorkspace({
          clientEmail: 'shared@example.com',
        })
        const workspace2 = await createTestWorkspace()

        const result = await service.findMatchingClient(
          workspace2.workspace.id,
          workspace2.trainer.id,
          'Any Name',
          'shared@example.com'
        )

        expect(result).toBeNull()
      })
    })
  })

  describe('findMatchingPendingProfile', () => {
    async function createPendingProfile(options: {
      workspaceId: string
      trainerId: string
      name: string
      email?: string
      status?: 'pending' | 'rejected' | 'approved'
    }) {
      return await prisma.pendingClientProfile.create({
        data: {
          workspaceId: options.workspaceId,
          trainerId: options.trainerId,
          source: 'google',
          sourceEventIds: ['event-1'],
          extractedName: options.name,
          extractedEmail: options.email?.toLowerCase() || null,
          extractionConfidence: 'high',
          extractionReason: 'test',
          firstSeenDate: new Date(),
          occurrenceCount: 1,
          status: options.status || 'pending',
          defaultSessionRate: 100,
          defaultBillingFrequency: 'PER_SESSION',
        },
      })
    }

    describe('email matching', () => {
      it('should find pending profile by exact email match', async () => {
        const workspace = await createTestWorkspace()
        const profile = await createPendingProfile({
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          name: 'John Smith',
          email: 'john.smith@example.com',
        })

        const result = await service.findMatchingPendingProfile(
          workspace.workspace.id,
          workspace.trainer.id,
          'Different Name',
          'john.smith@example.com'
        )

        expect(result).not.toBeNull()
        expect(result?.type).toBe('pending_profile')
        expect(result?.profile.id).toBe(profile.id)
        expect(result?.matchReason).toBe('email exact match')
      })

      it('should match email case-insensitively', async () => {
        const workspace = await createTestWorkspace()
        await createPendingProfile({
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          name: 'John Smith',
          email: 'john.smith@example.com',
        })

        const result = await service.findMatchingPendingProfile(
          workspace.workspace.id,
          workspace.trainer.id,
          'Different Name',
          'JOHN.SMITH@EXAMPLE.COM'
        )

        expect(result).not.toBeNull()
      })
    })

    describe('name matching', () => {
      it('should find pending profile by exact name match', async () => {
        const workspace = await createTestWorkspace()
        const profile = await createPendingProfile({
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          name: 'John Smith',
        })

        const result = await service.findMatchingPendingProfile(
          workspace.workspace.id,
          workspace.trainer.id,
          'John Smith'
        )

        expect(result).not.toBeNull()
        expect(result?.profile.id).toBe(profile.id)
        expect(result?.matchReason).toBe('name exact match')
      })

      it('should use fuzzy matching for pending profiles', async () => {
        const workspace = await createTestWorkspace()
        await createPendingProfile({
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          name: 'John Smith',
        })

        const result = await service.findMatchingPendingProfile(
          workspace.workspace.id,
          workspace.trainer.id,
          'J Smith'
        )

        expect(result).not.toBeNull()
        expect(result?.matchReason).toBe('name fuzzy match')
      })
    })

    describe('status filtering', () => {
      it('should find pending status profiles', async () => {
        const workspace = await createTestWorkspace()
        await createPendingProfile({
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          name: 'John Smith',
          status: 'pending',
        })

        const result = await service.findMatchingPendingProfile(
          workspace.workspace.id,
          workspace.trainer.id,
          'John Smith'
        )

        expect(result).not.toBeNull()
      })

      it('should find rejected status profiles (prevents re-showing)', async () => {
        const workspace = await createTestWorkspace()
        await createPendingProfile({
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          name: 'John Smith',
          status: 'rejected',
        })

        const result = await service.findMatchingPendingProfile(
          workspace.workspace.id,
          workspace.trainer.id,
          'John Smith'
        )

        expect(result).not.toBeNull()
      })

      it('should not find approved status profiles', async () => {
        const workspace = await createTestWorkspace()
        await createPendingProfile({
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          name: 'John Smith',
          status: 'approved',
        })

        const result = await service.findMatchingPendingProfile(
          workspace.workspace.id,
          workspace.trainer.id,
          'John Smith'
        )

        expect(result).toBeNull()
      })
    })

    describe('trainer isolation', () => {
      it('should not match pending profile from different trainer', async () => {
        const workspace1 = await createTestWorkspace()
        const workspace2 = await createTestWorkspace()

        await createPendingProfile({
          workspaceId: workspace1.workspace.id,
          trainerId: workspace1.trainer.id,
          name: 'John Smith',
        })

        const result = await service.findMatchingPendingProfile(
          workspace2.workspace.id,
          workspace2.trainer.id,
          'John Smith'
        )

        expect(result).toBeNull()
      })
    })
  })

  describe('findAnyDuplicate', () => {
    it('should prioritize existing client over pending profile', async () => {
      const workspace = await createTestWorkspace()

      // Update client to known name
      await prisma.user.update({
        where: { id: workspace.client.id },
        data: { fullName: 'John Smith' },
      })

      // Also create pending profile with same name
      await prisma.pendingClientProfile.create({
        data: {
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          source: 'google',
          sourceEventIds: ['event-1'],
          extractedName: 'John Smith',
          extractedEmail: null,
          extractionConfidence: 'high',
          extractionReason: 'test',
          firstSeenDate: new Date(),
          occurrenceCount: 1,
          status: 'pending',
          defaultSessionRate: 100,
          defaultBillingFrequency: 'PER_SESSION',
        },
      })

      const result = await service.findAnyDuplicate(
        workspace.workspace.id,
        workspace.trainer.id,
        'John Smith'
      )

      expect(result).not.toBeNull()
      expect(result?.type).toBe('existing_client')
    })

    it('should return pending profile if no existing client match', async () => {
      const workspace = await createTestWorkspace()

      await prisma.pendingClientProfile.create({
        data: {
          workspaceId: workspace.workspace.id,
          trainerId: workspace.trainer.id,
          source: 'google',
          sourceEventIds: ['event-1'],
          extractedName: 'Unique Name',
          extractedEmail: null,
          extractionConfidence: 'high',
          extractionReason: 'test',
          firstSeenDate: new Date(),
          occurrenceCount: 1,
          status: 'pending',
          defaultSessionRate: 100,
          defaultBillingFrequency: 'PER_SESSION',
        },
      })

      const result = await service.findAnyDuplicate(
        workspace.workspace.id,
        workspace.trainer.id,
        'Unique Name'
      )

      expect(result).not.toBeNull()
      expect(result?.type).toBe('pending_profile')
    })

    it('should return null if no duplicates found', async () => {
      const workspace = await createTestWorkspace()

      const result = await service.findAnyDuplicate(
        workspace.workspace.id,
        workspace.trainer.id,
        'Completely New Person'
      )

      expect(result).toBeNull()
    })
  })

  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      expect(service.validateEmail('test@example.com')).toBe(true)
      expect(service.validateEmail('user.name@domain.org')).toBe(true)
      expect(service.validateEmail('user+tag@example.co.uk')).toBe(true)
    })

    it('should reject invalid email formats', () => {
      expect(service.validateEmail('')).toBe(false)
      expect(service.validateEmail('notanemail')).toBe(false)
      expect(service.validateEmail('@nodomain.com')).toBe(false)
      expect(service.validateEmail('noat.com')).toBe(false)
      expect(service.validateEmail('spaces in@email.com')).toBe(false)
    })
  })

  describe('isEmailInUse', () => {
    it('should return true if email is used by any user', async () => {
      const workspace = await createTestWorkspace({
        clientEmail: 'used@example.com',
      })

      const result = await service.isEmailInUse(
        workspace.workspace.id,
        'used@example.com'
      )

      expect(result).toBe(true)
    })

    it('should return true for trainer email too', async () => {
      const workspace = await createTestWorkspace({
        trainerEmail: 'trainer@example.com',
      })

      const result = await service.isEmailInUse(
        workspace.workspace.id,
        'trainer@example.com'
      )

      expect(result).toBe(true)
    })

    it('should return false if email is not in use', async () => {
      const workspace = await createTestWorkspace()

      const result = await service.isEmailInUse(
        workspace.workspace.id,
        'unused@example.com'
      )

      expect(result).toBe(false)
    })

    it('should be case-insensitive', async () => {
      const workspace = await createTestWorkspace({
        clientEmail: 'user@example.com',
      })

      const result = await service.isEmailInUse(
        workspace.workspace.id,
        'USER@EXAMPLE.COM'
      )

      expect(result).toBe(true)
    })

    it('should not find email from different workspace', async () => {
      const workspace1 = await createTestWorkspace({
        clientEmail: 'shared@example.com',
      })
      const workspace2 = await createTestWorkspace()

      const result = await service.isEmailInUse(
        workspace2.workspace.id,
        'shared@example.com'
      )

      expect(result).toBe(false)
    })
  })
})
