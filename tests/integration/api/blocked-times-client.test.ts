import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from '@/app/api/blocked-times/route'
import {
  createTestWorkspace,
  createClientWithGroupSettings,
  createBlockedTime,
} from '@/tests/fixtures/workspace'

// Mock the auth module
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

import { auth } from '@/lib/auth'

describe('Blocked Times API - Client Access', () => {
  let workspace: Awaited<ReturnType<typeof createTestWorkspace>>
  let client: Awaited<ReturnType<typeof createClientWithGroupSettings>>

  beforeEach(async () => {
    workspace = await createTestWorkspace()

    // Create a client in the workspace
    client = await createClientWithGroupSettings({
      workspaceId: workspace.workspace.id,
      permission: 'NO_GROUP_SESSIONS',
      discoverable: true,
      fullName: 'Test Client',
    })
  })

  describe('GET /api/blocked-times - Client view', () => {
    beforeEach(() => {
      // Mock auth to return client session
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: client.user.id,
          email: client.user.email,
          name: client.user.fullName,
          role: 'CLIENT',
          workspaceId: workspace.workspace.id,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      })
    })

    it('should return trainer blocked times for client', async () => {
      // Create blocked time for the trainer
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const endTime = new Date(tomorrow)
      endTime.setHours(12, 0, 0, 0)

      const blockedTime = await createBlockedTime({
        trainerId: workspace.trainer.id,
        workspaceId: workspace.workspace.id,
        startTime: tomorrow,
        endTime: endTime,
        reason: 'Personal time',
      })

      const request = new Request('http://localhost:3000/api/blocked-times')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.blockedTimes).toBeDefined()
      expect(data.blockedTimes.length).toBeGreaterThanOrEqual(1)

      const found = data.blockedTimes.find((bt: { id: string }) => bt.id === blockedTime.id)
      expect(found).toBeDefined()
      expect(found.reason).toBe('Personal time')
    })

    it('should return multiple blocked times', async () => {
      // Create multiple blocked times
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      await createBlockedTime({
        trainerId: workspace.trainer.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(tomorrow.setHours(8, 0, 0, 0)),
        endTime: new Date(tomorrow.setHours(9, 0, 0, 0)),
        reason: 'Morning block',
      })

      tomorrow.setHours(14, 0, 0, 0)
      await createBlockedTime({
        trainerId: workspace.trainer.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(tomorrow.setHours(14, 0, 0, 0)),
        endTime: new Date(tomorrow.setHours(15, 0, 0, 0)),
        reason: 'Afternoon block',
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.blockedTimes.length).toBeGreaterThanOrEqual(2)
    })

    it('should return recurring blocked times', async () => {
      // Create recurring blocked time (every Monday 8-9am)
      const monday = new Date()
      monday.setDate(monday.getDate() + ((1 + 7 - monday.getDay()) % 7)) // Next Monday
      monday.setHours(8, 0, 0, 0)
      const endTime = new Date(monday)
      endTime.setHours(9, 0, 0, 0)

      const recurringBlock = await createBlockedTime({
        trainerId: workspace.trainer.id,
        workspaceId: workspace.workspace.id,
        startTime: monday,
        endTime: endTime,
        reason: 'Weekly team meeting',
        isRecurring: true,
        dayOfWeek: 1, // Monday
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)

      const found = data.blockedTimes.find((bt: { id: string }) => bt.id === recurringBlock.id)
      expect(found).toBeDefined()
      expect(found.isRecurring).toBe(true)
      expect(found.dayOfWeek).toBe(1)
    })

    it('should only return blocked times from own workspace', async () => {
      // Create another workspace with its own blocked times
      const workspace2 = await createTestWorkspace()
      const blockedTimeOtherWorkspace = await createBlockedTime({
        trainerId: workspace2.trainer.id,
        workspaceId: workspace2.workspace.id,
        startTime: new Date(Date.now() + 86400000),
        endTime: new Date(Date.now() + 90000000),
        reason: 'Other workspace block',
      })

      // Create blocked time in client's workspace
      const ownBlockedTime = await createBlockedTime({
        trainerId: workspace.trainer.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() + 86400000),
        endTime: new Date(Date.now() + 90000000),
        reason: 'Own workspace block',
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)

      // Should include own workspace blocked time
      const foundOwn = data.blockedTimes.find((bt: { id: string }) => bt.id === ownBlockedTime.id)
      expect(foundOwn).toBeDefined()

      // Should NOT include other workspace blocked time
      const foundOther = data.blockedTimes.find((bt: { id: string }) => bt.id === blockedTimeOtherWorkspace.id)
      expect(foundOther).toBeUndefined()
    })

    it('should return empty array when no blocked times exist', async () => {
      // No blocked times created

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.blockedTimes).toBeDefined()
      expect(data.blockedTimes).toHaveLength(0)
    })

    it('should order blocked times by start time ascending', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      // Create in reverse order
      const laterBlock = await createBlockedTime({
        trainerId: workspace.trainer.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(new Date(tomorrow).setHours(14, 0, 0, 0)),
        endTime: new Date(new Date(tomorrow).setHours(15, 0, 0, 0)),
        reason: 'Later block',
      })

      const earlierBlock = await createBlockedTime({
        trainerId: workspace.trainer.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(new Date(tomorrow).setHours(8, 0, 0, 0)),
        endTime: new Date(new Date(tomorrow).setHours(9, 0, 0, 0)),
        reason: 'Earlier block',
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)

      // Find indices of both blocks
      const earlierIndex = data.blockedTimes.findIndex((bt: { id: string }) => bt.id === earlierBlock.id)
      const laterIndex = data.blockedTimes.findIndex((bt: { id: string }) => bt.id === laterBlock.id)

      // Earlier block should come before later block
      expect(earlierIndex).toBeLessThan(laterIndex)
    })
  })

  describe('GET /api/blocked-times - Trainer view', () => {
    beforeEach(() => {
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

    it('should return own blocked times for trainer', async () => {
      // Create blocked time for the trainer
      const blockedTime = await createBlockedTime({
        trainerId: workspace.trainer.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() + 86400000),
        endTime: new Date(Date.now() + 90000000),
        reason: 'Trainer block',
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)

      const found = data.blockedTimes.find((bt: { id: string }) => bt.id === blockedTime.id)
      expect(found).toBeDefined()
      expect(found.reason).toBe('Trainer block')
    })

    it('should only return trainer\'s own blocked times (not other trainers)', async () => {
      // Create another workspace with its own trainer and blocked times
      const workspace2 = await createTestWorkspace()
      const blockedTimeOtherTrainer = await createBlockedTime({
        trainerId: workspace2.trainer.id,
        workspaceId: workspace2.workspace.id,
        startTime: new Date(Date.now() + 86400000),
        endTime: new Date(Date.now() + 90000000),
        reason: 'Other trainer block',
      })

      // Create blocked time for own trainer
      const ownBlockedTime = await createBlockedTime({
        trainerId: workspace.trainer.id,
        workspaceId: workspace.workspace.id,
        startTime: new Date(Date.now() + 86400000),
        endTime: new Date(Date.now() + 90000000),
        reason: 'Own trainer block',
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)

      // Should include own blocked time
      const foundOwn = data.blockedTimes.find((bt: { id: string }) => bt.id === ownBlockedTime.id)
      expect(foundOwn).toBeDefined()

      // Should NOT include other trainer's blocked time
      const foundOther = data.blockedTimes.find((bt: { id: string }) => bt.id === blockedTimeOtherTrainer.id)
      expect(foundOther).toBeUndefined()
    })
  })

  describe('GET /api/blocked-times - Error handling', () => {
    it('should handle unauthenticated requests', async () => {
      // Mock auth to return no session
      vi.mocked(auth).mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch blocked times')
    })
  })
})
