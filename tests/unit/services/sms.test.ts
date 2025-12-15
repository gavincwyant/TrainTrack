import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Create mock function that persists
const mockTwilioCreate = vi.fn()

// Mock Twilio before any imports
vi.mock('twilio', () => {
  return {
    default: vi.fn(() => ({
      messages: {
        create: mockTwilioCreate,
      },
    })),
  }
})

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    notificationLog: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

// Import after mocks are set up
import { SMSService } from '@/lib/services/sms'
import { prisma } from '@/lib/db'

describe('SMSService', () => {
  let smsService: SMSService
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    vi.clearAllMocks()
    originalEnv = { ...process.env }

    // Set up environment
    process.env.TWILIO_ACCOUNT_SID = 'test_account_sid'
    process.env.TWILIO_AUTH_TOKEN = 'test_auth_token'
    process.env.TWILIO_PHONE_NUMBER = '+15551234567'
    process.env.NEXTAUTH_URL = 'http://localhost:3000'

    // Create service
    smsService = new SMSService()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('isConfigured()', () => {
    it('should return true when Twilio credentials are set', () => {
      expect(smsService.isConfigured()).toBe(true)
    })

    it('should return false when Twilio credentials are missing', () => {
      delete process.env.TWILIO_ACCOUNT_SID
      delete process.env.TWILIO_AUTH_TOKEN
      const unconfiguredService = new SMSService()
      expect(unconfiguredService.isConfigured()).toBe(false)
    })

    it('should return false when phone number is missing', () => {
      delete process.env.TWILIO_PHONE_NUMBER
      const unconfiguredService = new SMSService()
      expect(unconfiguredService.isConfigured()).toBe(false)
    })
  })

  describe('sendSMS()', () => {
    beforeEach(() => {
      // Reset mocks for each test
      vi.mocked(prisma.notificationLog.create).mockResolvedValue({
        id: 'log-123',
        workspaceId: 'workspace-1',
        recipientId: 'client-1',
        recipientType: 'CLIENT',
        channel: 'SMS',
        type: 'TEST',
        phoneNumber: '+14155551234',
        emailAddress: null,
        messageContent: 'Test message',
        status: 'PENDING',
        externalId: null,
        errorMessage: null,
        attemptCount: 1,
        lastAttemptAt: new Date(),
        nextRetryAt: null,
        sentAt: null,
        deliveredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        appointmentId: null,
        invoiceId: null,
      })
    })

    it('should send SMS successfully', async () => {
      mockTwilioCreate.mockResolvedValue({ sid: 'SM123456789' })

      const result = await smsService.sendSMS({
        to: '4155551234',
        body: 'Test message',
        workspaceId: 'workspace-1',
        recipientId: 'client-1',
        type: 'TEST',
      })

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('SM123456789')
      expect(result.logId).toBe('log-123')

      // Verify Twilio was called correctly
      expect(mockTwilioCreate).toHaveBeenCalledWith({
        body: 'Test message',
        from: '+15551234567',
        to: '+14155551234',
        statusCallback: 'http://localhost:3000/api/webhooks/twilio/status',
      })

      // Verify notification log was updated
      expect(prisma.notificationLog.update).toHaveBeenCalledWith({
        where: { id: 'log-123' },
        data: expect.objectContaining({
          status: 'SENT',
          externalId: 'SM123456789',
        }),
      })
    })

    it('should return error when Twilio is not configured', async () => {
      delete process.env.TWILIO_ACCOUNT_SID
      const unconfiguredService = new SMSService()

      const result = await unconfiguredService.sendSMS({
        to: '4155551234',
        body: 'Test message',
        workspaceId: 'workspace-1',
        recipientId: 'client-1',
        type: 'TEST',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Twilio not configured')
    })

    it('should return error for invalid phone number', async () => {
      const result = await smsService.sendSMS({
        to: '123', // Too short
        body: 'Test message',
        workspaceId: 'workspace-1',
        recipientId: 'client-1',
        type: 'TEST',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid phone number')
    })

    it('should handle Twilio errors and update log', async () => {
      mockTwilioCreate.mockRejectedValue(new Error('Twilio API error'))

      const result = await smsService.sendSMS({
        to: '4155551234',
        body: 'Test message',
        workspaceId: 'workspace-1',
        recipientId: 'client-1',
        type: 'TEST',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Twilio API error')
      expect(result.logId).toBe('log-123')

      // Verify notification log was updated with failure
      expect(prisma.notificationLog.update).toHaveBeenCalledWith({
        where: { id: 'log-123' },
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage: 'Twilio API error',
        }),
      })
    })

    it('should format phone number to E.164', async () => {
      mockTwilioCreate.mockResolvedValue({ sid: 'SM123456789' })

      await smsService.sendSMS({
        to: '(415) 555-1234', // Various format
        body: 'Test message',
        workspaceId: 'workspace-1',
        recipientId: 'client-1',
        type: 'TEST',
      })

      expect(mockTwilioCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+14155551234', // Should be E.164 formatted
        })
      )
    })
  })

  describe('sendAppointmentReminder()', () => {
    const mockAppointment = {
      id: 'apt-1',
      workspaceId: 'workspace-1',
      clientId: 'client-1',
      trainerId: 'trainer-1',
      startTime: new Date('2025-01-15T14:00:00Z'),
      endTime: new Date('2025-01-15T15:00:00Z'),
      status: 'SCHEDULED',
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      client: {
        id: 'client-1',
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '4155551234',
      },
      trainer: {
        id: 'trainer-1',
        fullName: 'Jane Trainer',
        email: 'jane@example.com',
      },
    }

    beforeEach(() => {
      vi.mocked(prisma.notificationLog.create).mockResolvedValue({
        id: 'log-123',
        workspaceId: 'workspace-1',
        recipientId: 'client-1',
        recipientType: 'CLIENT',
        channel: 'SMS',
        type: 'APPOINTMENT_REMINDER',
        phoneNumber: '+14155551234',
        emailAddress: null,
        messageContent: 'Test',
        status: 'PENDING',
        externalId: null,
        errorMessage: null,
        attemptCount: 1,
        lastAttemptAt: new Date(),
        nextRetryAt: null,
        sentAt: null,
        deliveredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        appointmentId: 'apt-1',
        invoiceId: null,
      })
    })

    it('should send appointment reminder with correct message', async () => {
      mockTwilioCreate.mockResolvedValue({ sid: 'SM123456789' })

      const result = await smsService.sendAppointmentReminder(mockAppointment, 24)

      expect(result.success).toBe(true)
      expect(mockTwilioCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('Jane Trainer'),
        })
      )
      // Verify body also contains time info
      const callArg = mockTwilioCreate.mock.calls[0][0]
      expect(callArg.body).toContain('24 hours')
    })

    it('should use singular "hour" for 1 hour reminder', async () => {
      mockTwilioCreate.mockResolvedValue({ sid: 'SM123456789' })

      await smsService.sendAppointmentReminder(mockAppointment, 1)

      const callArg = mockTwilioCreate.mock.calls[0][0]
      expect(callArg.body).toContain('1 hour')
    })

    it('should return error for client without phone', async () => {
      const appointmentNoPhone = {
        ...mockAppointment,
        client: { ...mockAppointment.client, phone: null },
      }

      const result = await smsService.sendAppointmentReminder(appointmentNoPhone, 24)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid or missing phone number')
    })
  })

  describe('sendInvoiceNotification()', () => {
    const mockInvoice = {
      id: 'inv-1',
      workspaceId: 'workspace-1',
      clientId: 'client-1',
      trainerId: 'trainer-1',
      invoiceNumber: 'INV-001',
      amount: 150.00,
      status: 'SENT',
      dueDate: new Date('2025-01-20'),
      createdAt: new Date(),
      updatedAt: new Date(),
      paidAt: null,
      client: {
        id: 'client-1',
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '4155551234',
      },
      trainer: {
        id: 'trainer-1',
        fullName: 'Jane Trainer',
        email: 'jane@example.com',
      },
    }

    beforeEach(() => {
      vi.mocked(prisma.notificationLog.create).mockResolvedValue({
        id: 'log-123',
        workspaceId: 'workspace-1',
        recipientId: 'client-1',
        recipientType: 'CLIENT',
        channel: 'SMS',
        type: 'INVOICE_SENT',
        phoneNumber: '+14155551234',
        emailAddress: null,
        messageContent: 'Test',
        status: 'PENDING',
        externalId: null,
        errorMessage: null,
        attemptCount: 1,
        lastAttemptAt: new Date(),
        nextRetryAt: null,
        sentAt: null,
        deliveredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        appointmentId: null,
        invoiceId: 'inv-1',
      })
    })

    it('should send SENT notification with correct message', async () => {
      mockTwilioCreate.mockResolvedValue({ sid: 'SM123456789' })

      const result = await smsService.sendInvoiceNotification(mockInvoice, 'SENT')

      expect(result.success).toBe(true)
      const callArg = mockTwilioCreate.mock.calls[0][0]
      expect(callArg.body).toContain('New invoice')
      expect(callArg.body).toContain('$150.00')
    })

    it('should send DUE_SOON notification', async () => {
      mockTwilioCreate.mockResolvedValue({ sid: 'SM123456789' })

      await smsService.sendInvoiceNotification(mockInvoice, 'DUE_SOON')

      const callArg = mockTwilioCreate.mock.calls[0][0]
      expect(callArg.body).toContain('Reminder')
    })

    it('should send OVERDUE notification', async () => {
      mockTwilioCreate.mockResolvedValue({ sid: 'SM123456789' })

      await smsService.sendInvoiceNotification(mockInvoice, 'OVERDUE')

      const callArg = mockTwilioCreate.mock.calls[0][0]
      expect(callArg.body).toContain('was due')
    })

    it('should return error for client without phone', async () => {
      const invoiceNoPhone = {
        ...mockInvoice,
        client: { ...mockInvoice.client, phone: null },
      }

      const result = await smsService.sendInvoiceNotification(invoiceNoPhone, 'SENT')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid or missing phone number')
    })
  })

  describe('retryNotification()', () => {
    it('should retry failed notification', async () => {
      vi.mocked(prisma.notificationLog.findUnique).mockResolvedValue({
        id: 'log-123',
        workspaceId: 'workspace-1',
        recipientId: 'client-1',
        recipientType: 'CLIENT',
        channel: 'SMS',
        type: 'TEST',
        phoneNumber: '+14155551234',
        emailAddress: null,
        messageContent: 'Original message',
        status: 'FAILED',
        externalId: null,
        errorMessage: 'Previous error',
        attemptCount: 1,
        lastAttemptAt: new Date(),
        nextRetryAt: new Date(),
        sentAt: null,
        deliveredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        appointmentId: null,
        invoiceId: null,
      })

      mockTwilioCreate.mockResolvedValue({ sid: 'SM987654321' })

      const result = await smsService.retryNotification('log-123')

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('SM987654321')

      // Verify attempt count was incremented
      expect(prisma.notificationLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'log-123' },
          data: expect.objectContaining({
            attemptCount: 2,
          }),
        })
      )
    })

    it('should return error if notification not found', async () => {
      vi.mocked(prisma.notificationLog.findUnique).mockResolvedValue(null)

      const result = await smsService.retryNotification('non-existent')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Notification not found')
    })

    it('should return error for non-SMS notification', async () => {
      vi.mocked(prisma.notificationLog.findUnique).mockResolvedValue({
        id: 'log-123',
        workspaceId: 'workspace-1',
        recipientId: 'client-1',
        recipientType: 'CLIENT',
        channel: 'EMAIL',
        type: 'TEST',
        phoneNumber: null,
        emailAddress: 'test@example.com',
        messageContent: 'Test',
        status: 'FAILED',
        externalId: null,
        errorMessage: null,
        attemptCount: 1,
        lastAttemptAt: new Date(),
        nextRetryAt: new Date(),
        sentAt: null,
        deliveredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        appointmentId: null,
        invoiceId: null,
      })

      const result = await smsService.retryNotification('log-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not an SMS notification')
    })

    it('should not schedule retry after max attempts', async () => {
      vi.mocked(prisma.notificationLog.findUnique).mockResolvedValue({
        id: 'log-123',
        workspaceId: 'workspace-1',
        recipientId: 'client-1',
        recipientType: 'CLIENT',
        channel: 'SMS',
        type: 'TEST',
        phoneNumber: '+14155551234',
        emailAddress: null,
        messageContent: 'Test',
        status: 'FAILED',
        externalId: null,
        errorMessage: null,
        attemptCount: 2, // Already tried twice, this will be 3rd attempt
        lastAttemptAt: new Date(),
        nextRetryAt: new Date(),
        sentAt: null,
        deliveredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        appointmentId: null,
        invoiceId: null,
      })

      mockTwilioCreate.mockRejectedValue(new Error('Still failing'))

      await smsService.retryNotification('log-123')

      // Should set nextRetryAt to null since max attempts reached
      expect(prisma.notificationLog.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            nextRetryAt: null,
          }),
        })
      )
    })
  })
})
