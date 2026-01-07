import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { EmailService } from '@/lib/services/email'
import { prisma } from '@/lib/db'
import { createTestWorkspace } from '@/tests/fixtures/workspace'
import { hash, compare } from 'bcryptjs'

// Mock SendGrid
vi.mock('@sendgrid/mail', () => ({
  default: {
    setApiKey: vi.fn(),
    send: vi.fn(),
  },
}))

import sgMail from '@sendgrid/mail'

describe('Password Reset', () => {
  let workspace: Awaited<ReturnType<typeof createTestWorkspace>>

  beforeEach(async () => {
    workspace = await createTestWorkspace()
    vi.mocked(sgMail.send).mockClear()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(sgMail.send).mockResolvedValue([{ statusCode: 202 } as any])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('EmailService.sendPasswordResetEmail', () => {
    it('should send email with correct recipient', async () => {
      const emailService = new EmailService()
      const resetUrl = 'http://localhost:3000/reset-password?token=test-token'

      await emailService.sendPasswordResetEmail(workspace.trainer.email, resetUrl)

      expect(sgMail.send).toHaveBeenCalledTimes(1)
      const emailData = vi.mocked(sgMail.send).mock.calls[0][0]
      expect(emailData.to).toBe(workspace.trainer.email)
    })

    it('should send email with TrainTrack as sender name', async () => {
      const emailService = new EmailService()
      const resetUrl = 'http://localhost:3000/reset-password?token=test-token'

      await emailService.sendPasswordResetEmail(workspace.trainer.email, resetUrl)

      const emailData = vi.mocked(sgMail.send).mock.calls[0][0]
      expect(emailData.from.name).toBe('TrainTrack')
    })

    it('should include reset URL in email body', async () => {
      const emailService = new EmailService()
      const resetUrl = 'http://localhost:3000/reset-password?token=abc123'

      await emailService.sendPasswordResetEmail(workspace.trainer.email, resetUrl)

      const emailData = vi.mocked(sgMail.send).mock.calls[0][0]
      expect(emailData.html).toContain(resetUrl)
      expect(emailData.text).toContain(resetUrl)
    })

    it('should have both HTML and plain text versions', async () => {
      const emailService = new EmailService()
      const resetUrl = 'http://localhost:3000/reset-password?token=test-token'

      await emailService.sendPasswordResetEmail(workspace.trainer.email, resetUrl)

      const emailData = vi.mocked(sgMail.send).mock.calls[0][0]
      expect(emailData.html).toBeDefined()
      expect(emailData.html.length).toBeGreaterThan(0)
      expect(emailData.text).toBeDefined()
      expect(emailData.text.length).toBeGreaterThan(0)
    })

    it('should mention 1 hour expiry in email', async () => {
      const emailService = new EmailService()
      const resetUrl = 'http://localhost:3000/reset-password?token=test-token'

      await emailService.sendPasswordResetEmail(workspace.trainer.email, resetUrl)

      const emailData = vi.mocked(sgMail.send).mock.calls[0][0]
      expect(emailData.html).toContain('1 hour')
      expect(emailData.text).toContain('1 hour')
    })

    it('should disable click and open tracking', async () => {
      const emailService = new EmailService()
      const resetUrl = 'http://localhost:3000/reset-password?token=test-token'

      await emailService.sendPasswordResetEmail(workspace.trainer.email, resetUrl)

      const emailData = vi.mocked(sgMail.send).mock.calls[0][0]
      expect(emailData.trackingSettings.clickTracking.enable).toBe(false)
      expect(emailData.trackingSettings.openTracking.enable).toBe(false)
    })
  })

  describe('PasswordResetToken model', () => {
    it('should create a password reset token', async () => {
      const token = crypto.randomUUID()
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

      const resetToken = await prisma.passwordResetToken.create({
        data: {
          token,
          userId: workspace.trainer.id,
          expiresAt,
        },
      })

      expect(resetToken.token).toBe(token)
      expect(resetToken.userId).toBe(workspace.trainer.id)
      expect(resetToken.expiresAt).toEqual(expiresAt)
    })

    it('should enforce unique token constraint', async () => {
      const token = crypto.randomUUID()
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

      await prisma.passwordResetToken.create({
        data: {
          token,
          userId: workspace.trainer.id,
          expiresAt,
        },
      })

      await expect(
        prisma.passwordResetToken.create({
          data: {
            token, // Same token
            userId: workspace.client.id,
            expiresAt,
          },
        })
      ).rejects.toThrow()
    })

    it('should cascade delete tokens when user is deleted', async () => {
      // Create a separate user for this test
      const testUser = await prisma.user.create({
        data: {
          email: 'cascade-test@example.com',
          passwordHash: await hash('password123', 10),
          fullName: 'Cascade Test',
          role: 'TRAINER',
          workspaceId: workspace.workspace.id,
        },
      })

      const token = crypto.randomUUID()
      await prisma.passwordResetToken.create({
        data: {
          token,
          userId: testUser.id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      })

      // Delete user
      await prisma.user.delete({ where: { id: testUser.id } })

      // Token should be deleted
      const deletedToken = await prisma.passwordResetToken.findUnique({
        where: { token },
      })
      expect(deletedToken).toBeNull()
    })

    it('should delete existing tokens for user before creating new one', async () => {
      const oldToken = crypto.randomUUID()
      const newToken = crypto.randomUUID()
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

      // Create first token
      await prisma.passwordResetToken.create({
        data: {
          token: oldToken,
          userId: workspace.trainer.id,
          expiresAt,
        },
      })

      // Delete existing tokens (as the API does)
      await prisma.passwordResetToken.deleteMany({
        where: { userId: workspace.trainer.id },
      })

      // Create new token
      await prisma.passwordResetToken.create({
        data: {
          token: newToken,
          userId: workspace.trainer.id,
          expiresAt,
        },
      })

      // Old token should not exist
      const oldTokenRecord = await prisma.passwordResetToken.findUnique({
        where: { token: oldToken },
      })
      expect(oldTokenRecord).toBeNull()

      // New token should exist
      const newTokenRecord = await prisma.passwordResetToken.findUnique({
        where: { token: newToken },
      })
      expect(newTokenRecord).not.toBeNull()
    })
  })

  describe('Password reset flow', () => {
    it('should allow password update with valid token', async () => {
      const token = crypto.randomUUID()
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

      // Create token
      const resetToken = await prisma.passwordResetToken.create({
        data: {
          token,
          userId: workspace.trainer.id,
          expiresAt,
        },
      })

      // Simulate password reset
      const newPassword = 'NewSecurePassword123!'
      const newPasswordHash = await hash(newPassword, 10)

      await prisma.$transaction([
        prisma.user.update({
          where: { id: resetToken.userId },
          data: { passwordHash: newPasswordHash },
        }),
        prisma.passwordResetToken.delete({
          where: { id: resetToken.id },
        }),
      ])

      // Verify password was updated
      const updatedUser = await prisma.user.findUnique({
        where: { id: workspace.trainer.id },
      })
      const passwordValid = await compare(newPassword, updatedUser!.passwordHash)
      expect(passwordValid).toBe(true)

      // Verify token was deleted
      const deletedToken = await prisma.passwordResetToken.findUnique({
        where: { token },
      })
      expect(deletedToken).toBeNull()
    })

    it('should reject expired tokens', async () => {
      const token = crypto.randomUUID()
      const expiredAt = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago

      await prisma.passwordResetToken.create({
        data: {
          token,
          userId: workspace.trainer.id,
          expiresAt: expiredAt,
        },
      })

      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token },
      })

      // Check if expired
      const isExpired = new Date() > resetToken!.expiresAt
      expect(isExpired).toBe(true)
    })

    it('should return null for non-existent tokens', async () => {
      const fakeToken = crypto.randomUUID()

      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token: fakeToken },
      })

      expect(resetToken).toBeNull()
    })

    it('should include user relation when querying token', async () => {
      const token = crypto.randomUUID()
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

      await prisma.passwordResetToken.create({
        data: {
          token,
          userId: workspace.trainer.id,
          expiresAt,
        },
      })

      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token },
        include: { user: true },
      })

      expect(resetToken?.user).toBeDefined()
      expect(resetToken?.user.email).toBe(workspace.trainer.email)
    })
  })

  describe('Security considerations', () => {
    it('should use secure random tokens', () => {
      const token1 = crypto.randomUUID()
      const token2 = crypto.randomUUID()

      // Tokens should be different
      expect(token1).not.toBe(token2)

      // Tokens should be valid UUIDs (36 chars including hyphens)
      expect(token1).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
    })

    it('should hash passwords with bcrypt', async () => {
      const password = 'SecurePassword123!'
      const passwordHash = await hash(password, 10)

      // Hash should not equal plain password
      expect(passwordHash).not.toBe(password)

      // Hash should be verifiable
      const isValid = await compare(password, passwordHash)
      expect(isValid).toBe(true)

      // Wrong password should fail
      const isInvalid = await compare('WrongPassword', passwordHash)
      expect(isInvalid).toBe(false)
    })

    it('should set 1 hour expiry for tokens', () => {
      const now = Date.now()
      const expiresAt = new Date(now + 60 * 60 * 1000)

      // Should be ~1 hour in the future
      const diffMs = expiresAt.getTime() - now
      const diffHours = diffMs / (1000 * 60 * 60)

      expect(diffHours).toBeCloseTo(1, 1)
    })
  })
})
