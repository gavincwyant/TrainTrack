import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/db'
import {
  createTestWorkspace,
  createClientWithGroupSettings,
  addAllowedClient,
} from '@/tests/fixtures/workspace'

/**
 * Unit tests for the group session permission checking logic.
 *
 * The canClientBookWithAppointment function logic is embedded in the appointments route.
 * These tests verify the permission checking logic by creating the required data
 * and checking if the logic correctly evaluates permissions.
 *
 * Permission precedence:
 * 1. groupSessionOverride on appointment (if set)
 * 2. Client profile's groupSessionPermission (default)
 *
 * Permission values:
 * - ALLOW_ALL / ALLOW_ALL_GROUP: Anyone can book
 * - ALLOW_SPECIFIC / ALLOW_SPECIFIC_CLIENTS: Only clients in allowed list can book
 * - NO_GROUP / NO_GROUP_SESSIONS: No one else can book
 */

// Helper function that mirrors the logic in appointments route
async function canClientBookWithAppointment(
  clientProfileId: string,
  existingAppointment: { clientId: string; groupSessionOverride: string | null }
): Promise<boolean> {
  // Get the existing appointment's client profile
  const existingClientProfile = await prisma.clientProfile.findUnique({
    where: { userId: existingAppointment.clientId },
    include: {
      allowedGroupClients: {
        select: { allowedProfileId: true },
      },
    },
  })

  if (!existingClientProfile) {
    return false // No profile = no group sessions allowed
  }

  // Determine effective permission (override takes precedence)
  const effectivePermission = existingAppointment.groupSessionOverride || existingClientProfile.groupSessionPermission

  if (effectivePermission === 'ALLOW_ALL_GROUP' || effectivePermission === 'ALLOW_ALL') {
    return true
  }

  if (effectivePermission === 'ALLOW_SPECIFIC_CLIENTS' || effectivePermission === 'ALLOW_SPECIFIC') {
    // Check if the booking client is in the allowed list
    return existingClientProfile.allowedGroupClients.some(
      (agc) => agc.allowedProfileId === clientProfileId
    )
  }

  // NO_GROUP_SESSIONS or NO_GROUP
  return false
}

describe('Group Session Permission Logic', () => {
  let workspace: Awaited<ReturnType<typeof createTestWorkspace>>

  beforeEach(async () => {
    workspace = await createTestWorkspace()
  })

  describe('canClientBookWithAppointment - ALLOW_ALL_GROUP', () => {
    it('should return true when client has ALLOW_ALL_GROUP permission', async () => {
      const clientAllowAll = await createClientWithGroupSettings({
        workspaceId: workspace.workspace.id,
        permission: 'ALLOW_ALL_GROUP',
        discoverable: true,
      })

      const clientBooker = await createClientWithGroupSettings({
        workspaceId: workspace.workspace.id,
        permission: 'NO_GROUP_SESSIONS',
        discoverable: true,
      })

      const result = await canClientBookWithAppointment(
        clientBooker.profile.id,
        { clientId: clientAllowAll.user.id, groupSessionOverride: null }
      )

      expect(result).toBe(true)
    })

    it('should return true for any client when ALLOW_ALL_GROUP', async () => {
      const clientAllowAll = await createClientWithGroupSettings({
        workspaceId: workspace.workspace.id,
        permission: 'ALLOW_ALL_GROUP',
        discoverable: true,
      })

      // Create multiple clients and check they can all book
      const clients = await Promise.all([
        createClientWithGroupSettings({
          workspaceId: workspace.workspace.id,
          permission: 'NO_GROUP_SESSIONS',
          discoverable: false,
        }),
        createClientWithGroupSettings({
          workspaceId: workspace.workspace.id,
          permission: 'ALLOW_ALL_GROUP',
          discoverable: true,
        }),
        createClientWithGroupSettings({
          workspaceId: workspace.workspace.id,
          permission: 'ALLOW_SPECIFIC_CLIENTS',
          discoverable: true,
        }),
      ])

      for (const client of clients) {
        const result = await canClientBookWithAppointment(
          client.profile.id,
          { clientId: clientAllowAll.user.id, groupSessionOverride: null }
        )
        expect(result).toBe(true)
      }
    })
  })

  describe('canClientBookWithAppointment - ALLOW_SPECIFIC_CLIENTS', () => {
    it('should return true when booker is in allowed list', async () => {
      const clientAllowSpecific = await createClientWithGroupSettings({
        workspaceId: workspace.workspace.id,
        permission: 'ALLOW_SPECIFIC_CLIENTS',
        discoverable: true,
      })

      const clientBooker = await createClientWithGroupSettings({
        workspaceId: workspace.workspace.id,
        permission: 'NO_GROUP_SESSIONS',
        discoverable: true,
      })

      // Add booker to allowed list
      await addAllowedClient(clientAllowSpecific.profile.id, clientBooker.profile.id)

      const result = await canClientBookWithAppointment(
        clientBooker.profile.id,
        { clientId: clientAllowSpecific.user.id, groupSessionOverride: null }
      )

      expect(result).toBe(true)
    })

    it('should return false when booker is NOT in allowed list', async () => {
      const clientAllowSpecific = await createClientWithGroupSettings({
        workspaceId: workspace.workspace.id,
        permission: 'ALLOW_SPECIFIC_CLIENTS',
        discoverable: true,
      })

      const clientBooker = await createClientWithGroupSettings({
        workspaceId: workspace.workspace.id,
        permission: 'NO_GROUP_SESSIONS',
        discoverable: true,
      })

      // Do NOT add booker to allowed list

      const result = await canClientBookWithAppointment(
        clientBooker.profile.id,
        { clientId: clientAllowSpecific.user.id, groupSessionOverride: null }
      )

      expect(result).toBe(false)
    })

    it('should return true only for allowed clients, false for others', async () => {
      const clientAllowSpecific = await createClientWithGroupSettings({
        workspaceId: workspace.workspace.id,
        permission: 'ALLOW_SPECIFIC_CLIENTS',
        discoverable: true,
      })

      const allowedClient = await createClientWithGroupSettings({
        workspaceId: workspace.workspace.id,
        permission: 'NO_GROUP_SESSIONS',
        discoverable: true,
      })

      const notAllowedClient = await createClientWithGroupSettings({
        workspaceId: workspace.workspace.id,
        permission: 'NO_GROUP_SESSIONS',
        discoverable: true,
      })

      // Only add allowedClient to the list
      await addAllowedClient(clientAllowSpecific.profile.id, allowedClient.profile.id)

      const resultAllowed = await canClientBookWithAppointment(
        allowedClient.profile.id,
        { clientId: clientAllowSpecific.user.id, groupSessionOverride: null }
      )
      expect(resultAllowed).toBe(true)

      const resultNotAllowed = await canClientBookWithAppointment(
        notAllowedClient.profile.id,
        { clientId: clientAllowSpecific.user.id, groupSessionOverride: null }
      )
      expect(resultNotAllowed).toBe(false)
    })
  })

  describe('canClientBookWithAppointment - NO_GROUP_SESSIONS', () => {
    it('should return false when client has NO_GROUP_SESSIONS permission', async () => {
      const clientNoGroup = await createClientWithGroupSettings({
        workspaceId: workspace.workspace.id,
        permission: 'NO_GROUP_SESSIONS',
        discoverable: false,
      })

      const clientBooker = await createClientWithGroupSettings({
        workspaceId: workspace.workspace.id,
        permission: 'ALLOW_ALL_GROUP',
        discoverable: true,
      })

      const result = await canClientBookWithAppointment(
        clientBooker.profile.id,
        { clientId: clientNoGroup.user.id, groupSessionOverride: null }
      )

      expect(result).toBe(false)
    })

    it('should return false for all clients when NO_GROUP_SESSIONS', async () => {
      const clientNoGroup = await createClientWithGroupSettings({
        workspaceId: workspace.workspace.id,
        permission: 'NO_GROUP_SESSIONS',
        discoverable: false,
      })

      const clients = await Promise.all([
        createClientWithGroupSettings({
          workspaceId: workspace.workspace.id,
          permission: 'NO_GROUP_SESSIONS',
          discoverable: false,
        }),
        createClientWithGroupSettings({
          workspaceId: workspace.workspace.id,
          permission: 'ALLOW_ALL_GROUP',
          discoverable: true,
        }),
      ])

      for (const client of clients) {
        const result = await canClientBookWithAppointment(
          client.profile.id,
          { clientId: clientNoGroup.user.id, groupSessionOverride: null }
        )
        expect(result).toBe(false)
      }
    })
  })

  describe('canClientBookWithAppointment - Override precedence', () => {
    it('should use override ALLOW_ALL to enable group sessions even when default is NO_GROUP', async () => {
      const clientNoGroup = await createClientWithGroupSettings({
        workspaceId: workspace.workspace.id,
        permission: 'NO_GROUP_SESSIONS', // Default is NO
        discoverable: false,
      })

      const clientBooker = await createClientWithGroupSettings({
        workspaceId: workspace.workspace.id,
        permission: 'NO_GROUP_SESSIONS',
        discoverable: true,
      })

      // With override ALLOW_ALL, should allow
      const result = await canClientBookWithAppointment(
        clientBooker.profile.id,
        { clientId: clientNoGroup.user.id, groupSessionOverride: 'ALLOW_ALL' }
      )

      expect(result).toBe(true)
    })

    it('should use override NO_GROUP to block group sessions even when default is ALLOW_ALL', async () => {
      const clientAllowAll = await createClientWithGroupSettings({
        workspaceId: workspace.workspace.id,
        permission: 'ALLOW_ALL_GROUP', // Default allows all
        discoverable: true,
      })

      const clientBooker = await createClientWithGroupSettings({
        workspaceId: workspace.workspace.id,
        permission: 'NO_GROUP_SESSIONS',
        discoverable: true,
      })

      // With override NO_GROUP, should block
      const result = await canClientBookWithAppointment(
        clientBooker.profile.id,
        { clientId: clientAllowAll.user.id, groupSessionOverride: 'NO_GROUP' }
      )

      expect(result).toBe(false)
    })

    it('should use override ALLOW_SPECIFIC when set on appointment', async () => {
      const clientAllowAll = await createClientWithGroupSettings({
        workspaceId: workspace.workspace.id,
        permission: 'ALLOW_ALL_GROUP', // Default allows all
        discoverable: true,
      })

      const allowedClient = await createClientWithGroupSettings({
        workspaceId: workspace.workspace.id,
        permission: 'NO_GROUP_SESSIONS',
        discoverable: true,
      })

      const notAllowedClient = await createClientWithGroupSettings({
        workspaceId: workspace.workspace.id,
        permission: 'NO_GROUP_SESSIONS',
        discoverable: true,
      })

      // Add allowedClient to the allowed list
      await addAllowedClient(clientAllowAll.profile.id, allowedClient.profile.id)

      // With override ALLOW_SPECIFIC, should only allow those in the list
      const resultAllowed = await canClientBookWithAppointment(
        allowedClient.profile.id,
        { clientId: clientAllowAll.user.id, groupSessionOverride: 'ALLOW_SPECIFIC' }
      )
      expect(resultAllowed).toBe(true)

      const resultNotAllowed = await canClientBookWithAppointment(
        notAllowedClient.profile.id,
        { clientId: clientAllowAll.user.id, groupSessionOverride: 'ALLOW_SPECIFIC' }
      )
      expect(resultNotAllowed).toBe(false)
    })

    it('should use client default when override is null', async () => {
      const clientAllowAll = await createClientWithGroupSettings({
        workspaceId: workspace.workspace.id,
        permission: 'ALLOW_ALL_GROUP',
        discoverable: true,
      })

      const clientBooker = await createClientWithGroupSettings({
        workspaceId: workspace.workspace.id,
        permission: 'NO_GROUP_SESSIONS',
        discoverable: true,
      })

      // Null override should use client default (ALLOW_ALL_GROUP)
      const result = await canClientBookWithAppointment(
        clientBooker.profile.id,
        { clientId: clientAllowAll.user.id, groupSessionOverride: null }
      )

      expect(result).toBe(true)
    })
  })

  describe('canClientBookWithAppointment - Edge cases', () => {
    it('should return false when existing appointment client has no profile', async () => {
      // Create a user without a client profile
      const userWithoutProfile = await prisma.user.create({
        data: {
          email: 'noprofile@test.com',
          passwordHash: 'test',
          fullName: 'No Profile User',
          role: 'CLIENT',
          workspaceId: workspace.workspace.id,
        },
      })

      const clientBooker = await createClientWithGroupSettings({
        workspaceId: workspace.workspace.id,
        permission: 'NO_GROUP_SESSIONS',
        discoverable: true,
      })

      const result = await canClientBookWithAppointment(
        clientBooker.profile.id,
        { clientId: userWithoutProfile.id, groupSessionOverride: null }
      )

      expect(result).toBe(false)
    })
  })
})
