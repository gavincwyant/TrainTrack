import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  requireWorkspace,
  getWorkspace,
  isTrainer,
  isClient,
  requireUserId,
  requireSystemAdmin,
  isSystemAdmin,
  createTenantScopedPrisma,
} from '@/lib/middleware/tenant'

// Mock the auth module
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// Import the mocked auth to control it in tests
import { auth } from '@/lib/auth'
const mockAuth = vi.mocked(auth)

describe('Tenant Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('requireWorkspace', () => {
    it('should return workspaceId when user has workspace', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'user-1',
          workspaceId: 'workspace-123',
          role: 'TRAINER',
        },
        expires: new Date().toISOString(),
      })

      const result = await requireWorkspace()

      expect(result).toBe('workspace-123')
    })

    it('should throw error when no session', async () => {
      mockAuth.mockResolvedValue(null)

      await expect(requireWorkspace()).rejects.toThrow(
        'No workspace context found'
      )
    })

    it('should throw error when session has no user', async () => {
      mockAuth.mockResolvedValue({
        user: undefined,
        expires: new Date().toISOString(),
      } as never)

      await expect(requireWorkspace()).rejects.toThrow(
        'No workspace context found'
      )
    })

    it('should throw error when user has no workspaceId', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'user-1',
          workspaceId: null,
          role: 'TRAINER',
        },
        expires: new Date().toISOString(),
      })

      await expect(requireWorkspace()).rejects.toThrow(
        'No workspace context found'
      )
    })
  })

  describe('getWorkspace', () => {
    it('should return workspaceId when user has workspace', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'user-1',
          workspaceId: 'workspace-456',
          role: 'CLIENT',
        },
        expires: new Date().toISOString(),
      })

      const result = await getWorkspace()

      expect(result).toBe('workspace-456')
    })

    it('should return null when no session', async () => {
      mockAuth.mockResolvedValue(null)

      const result = await getWorkspace()

      expect(result).toBeNull()
    })

    it('should return null when user has no workspaceId', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'user-1',
          workspaceId: null,
          role: 'TRAINER',
        },
        expires: new Date().toISOString(),
      })

      const result = await getWorkspace()

      expect(result).toBeNull()
    })
  })

  describe('isTrainer', () => {
    it('should return true for TRAINER role', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'user-1',
          workspaceId: 'workspace-1',
          role: 'TRAINER',
        },
        expires: new Date().toISOString(),
      })

      const result = await isTrainer()

      expect(result).toBe(true)
    })

    it('should return false for CLIENT role', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'user-1',
          workspaceId: 'workspace-1',
          role: 'CLIENT',
        },
        expires: new Date().toISOString(),
      })

      const result = await isTrainer()

      expect(result).toBe(false)
    })

    it('should return false when no session', async () => {
      mockAuth.mockResolvedValue(null)

      const result = await isTrainer()

      expect(result).toBe(false)
    })
  })

  describe('isClient', () => {
    it('should return true for CLIENT role', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'user-1',
          workspaceId: 'workspace-1',
          role: 'CLIENT',
        },
        expires: new Date().toISOString(),
      })

      const result = await isClient()

      expect(result).toBe(true)
    })

    it('should return false for TRAINER role', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'user-1',
          workspaceId: 'workspace-1',
          role: 'TRAINER',
        },
        expires: new Date().toISOString(),
      })

      const result = await isClient()

      expect(result).toBe(false)
    })

    it('should return false when no session', async () => {
      mockAuth.mockResolvedValue(null)

      const result = await isClient()

      expect(result).toBe(false)
    })
  })

  describe('requireUserId', () => {
    it('should return userId when authenticated', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'user-abc-123',
          workspaceId: 'workspace-1',
          role: 'TRAINER',
        },
        expires: new Date().toISOString(),
      })

      const result = await requireUserId()

      expect(result).toBe('user-abc-123')
    })

    it('should throw error when no session', async () => {
      mockAuth.mockResolvedValue(null)

      await expect(requireUserId()).rejects.toThrow('User not authenticated')
    })

    it('should throw error when session has no user id', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: undefined,
          workspaceId: 'workspace-1',
          role: 'TRAINER',
        },
        expires: new Date().toISOString(),
      } as never)

      await expect(requireUserId()).rejects.toThrow('User not authenticated')
    })
  })

  describe('requireSystemAdmin', () => {
    it('should not throw when user is system admin', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'admin-1',
          workspaceId: 'workspace-1',
          role: 'TRAINER',
          isSystemAdmin: true,
        },
        expires: new Date().toISOString(),
      })

      await expect(requireSystemAdmin()).resolves.not.toThrow()
    })

    it('should throw when user is not system admin', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'user-1',
          workspaceId: 'workspace-1',
          role: 'TRAINER',
          isSystemAdmin: false,
        },
        expires: new Date().toISOString(),
      })

      await expect(requireSystemAdmin()).rejects.toThrow(
        'Unauthorized: System admin access required'
      )
    })

    it('should throw when no session', async () => {
      mockAuth.mockResolvedValue(null)

      await expect(requireSystemAdmin()).rejects.toThrow(
        'Unauthorized: System admin access required'
      )
    })

    it('should throw when isSystemAdmin is undefined', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'user-1',
          workspaceId: 'workspace-1',
          role: 'TRAINER',
        },
        expires: new Date().toISOString(),
      })

      await expect(requireSystemAdmin()).rejects.toThrow(
        'Unauthorized: System admin access required'
      )
    })
  })

  describe('isSystemAdmin', () => {
    it('should return true when user is system admin', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'admin-1',
          workspaceId: 'workspace-1',
          role: 'TRAINER',
          isSystemAdmin: true,
        },
        expires: new Date().toISOString(),
      })

      const result = await isSystemAdmin()

      expect(result).toBe(true)
    })

    it('should return false when user is not system admin', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'user-1',
          workspaceId: 'workspace-1',
          role: 'TRAINER',
          isSystemAdmin: false,
        },
        expires: new Date().toISOString(),
      })

      const result = await isSystemAdmin()

      expect(result).toBe(false)
    })

    it('should return false when no session', async () => {
      mockAuth.mockResolvedValue(null)

      const result = await isSystemAdmin()

      expect(result).toBe(false)
    })

    it('should return false when isSystemAdmin is undefined', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'user-1',
          workspaceId: 'workspace-1',
          role: 'TRAINER',
        },
        expires: new Date().toISOString(),
      })

      const result = await isSystemAdmin()

      expect(result).toBe(false)
    })
  })

  describe('createTenantScopedPrisma', () => {
    it('should return an extended Prisma client', () => {
      const scopedPrisma = createTenantScopedPrisma('workspace-123')

      // The returned client should be defined
      expect(scopedPrisma).toBeDefined()

      // It should have standard Prisma model properties
      expect(scopedPrisma.user).toBeDefined()
      expect(scopedPrisma.workspace).toBeDefined()
      expect(scopedPrisma.appointment).toBeDefined()
    })

    it('should create different client instances for different workspaces', () => {
      const client1 = createTenantScopedPrisma('workspace-1')
      const client2 = createTenantScopedPrisma('workspace-2')

      // They should be different instances
      expect(client1).not.toBe(client2)
    })
  })
})
