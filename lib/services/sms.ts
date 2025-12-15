import { prisma } from "@/lib/db"
import { Appointment, Invoice, NotificationStatus } from "@prisma/client"
import { isValidPhoneNumber, formatPhoneToE164 } from "@/lib/utils/phone"
import Twilio from "twilio"

type AppointmentWithRelations = Appointment & {
  client: {
    id: string
    fullName: string
    email: string
    phone: string | null
  }
  trainer: {
    id: string
    fullName: string
    email: string
  }
}

type InvoiceWithRelations = Invoice & {
  client: {
    id: string
    fullName: string
    email: string
    phone: string | null
  }
  trainer: {
    id: string
    fullName: string
    email: string
  }
}

type SendSMSOptions = {
  to: string
  body: string
  workspaceId: string
  recipientId: string
  type: string
  appointmentId?: string
  invoiceId?: string
}

type SendSMSResult = {
  success: boolean
  messageId?: string
  error?: string
  logId?: string
}

export class SMSService {
  private twilioClient: Twilio.Twilio | null = null
  private fromNumber: string

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || ""

    if (accountSid && authToken) {
      this.twilioClient = Twilio(accountSid, authToken)
    }
  }

  /**
   * Check if Twilio is configured
   */
  isConfigured(): boolean {
    return this.twilioClient !== null && this.fromNumber !== ""
  }

  /**
   * Send SMS with logging and retry support
   */
  async sendSMS(options: SendSMSOptions): Promise<SendSMSResult> {
    if (!this.twilioClient) {
      console.warn("Twilio not configured - SMS will not be sent")
      return { success: false, error: "Twilio not configured" }
    }

    if (!this.fromNumber) {
      console.warn("Twilio phone number not configured")
      return { success: false, error: "Twilio phone number not configured" }
    }

    if (!isValidPhoneNumber(options.to)) {
      console.warn(`Invalid phone number: ${options.to}`)
      return { success: false, error: "Invalid phone number" }
    }

    const formattedPhone = formatPhoneToE164(options.to)

    // Create notification log
    const log = await prisma.notificationLog.create({
      data: {
        workspaceId: options.workspaceId,
        recipientId: options.recipientId,
        recipientType: "CLIENT",
        channel: "SMS",
        type: options.type,
        phoneNumber: formattedPhone,
        messageContent: options.body,
        status: "PENDING",
        appointmentId: options.appointmentId,
        invoiceId: options.invoiceId,
        attemptCount: 1,
        lastAttemptAt: new Date(),
      },
    })

    try {
      const message = await this.twilioClient.messages.create({
        body: options.body,
        from: this.fromNumber,
        to: formattedPhone,
        statusCallback: `${process.env.NEXTAUTH_URL}/api/webhooks/twilio/status`,
      })

      await prisma.notificationLog.update({
        where: { id: log.id },
        data: {
          status: "SENT",
          externalId: message.sid,
          sentAt: new Date(),
        },
      })

      console.log(`✅ SMS sent to ${formattedPhone} (SID: ${message.sid})`)
      return { success: true, messageId: message.sid, logId: log.id }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"

      await prisma.notificationLog.update({
        where: { id: log.id },
        data: {
          status: "FAILED",
          errorMessage,
          nextRetryAt: new Date(Date.now() + 15 * 60 * 1000), // Retry in 15 min
        },
      })

      console.error(`❌ Failed to send SMS to ${formattedPhone}:`, errorMessage)
      return { success: false, error: errorMessage, logId: log.id }
    }
  }

  /**
   * Send appointment reminder SMS
   */
  async sendAppointmentReminder(
    appointment: AppointmentWithRelations,
    hoursUntil: number
  ): Promise<SendSMSResult> {
    if (!isValidPhoneNumber(appointment.client.phone)) {
      console.log(`Invalid phone for client ${appointment.client.id}`)
      return { success: false, error: "Invalid or missing phone number" }
    }

    const timeLabel = hoursUntil === 1 ? "1 hour" : `${hoursUntil} hours`
    const appointmentTime = new Date(appointment.startTime).toLocaleTimeString(
      "en-US",
      {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }
    )
    const appointmentDate = new Date(appointment.startTime).toLocaleDateString(
      "en-US",
      {
        weekday: "short",
        month: "short",
        day: "numeric",
      }
    )

    const body = `Reminder: You have a training session with ${appointment.trainer.fullName} in ${timeLabel} on ${appointmentDate} at ${appointmentTime}. Reply STOP to unsubscribe.`

    return this.sendSMS({
      to: appointment.client.phone!,
      body,
      workspaceId: appointment.workspaceId,
      recipientId: appointment.clientId,
      type: "APPOINTMENT_REMINDER",
      appointmentId: appointment.id,
    })
  }

  /**
   * Send invoice notification SMS
   */
  async sendInvoiceNotification(
    invoice: InvoiceWithRelations,
    type: "SENT" | "DUE_SOON" | "OVERDUE"
  ): Promise<SendSMSResult> {
    if (!isValidPhoneNumber(invoice.client.phone)) {
      console.log(`Invalid phone for client ${invoice.client.id}`)
      return { success: false, error: "Invalid or missing phone number" }
    }

    const amount = `$${Number(invoice.amount).toFixed(2)}`
    const dueDate = new Date(invoice.dueDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })

    let body: string
    switch (type) {
      case "SENT":
        body = `New invoice from ${invoice.trainer.fullName}: ${amount} due ${dueDate}. Contact your trainer with questions. Reply STOP to unsubscribe.`
        break
      case "DUE_SOON":
        body = `Reminder: Invoice of ${amount} from ${invoice.trainer.fullName} is due ${dueDate}. Reply STOP to unsubscribe.`
        break
      case "OVERDUE":
        body = `Your invoice of ${amount} from ${invoice.trainer.fullName} was due ${dueDate}. Please contact your trainer. Reply STOP to unsubscribe.`
        break
    }

    return this.sendSMS({
      to: invoice.client.phone!,
      body,
      workspaceId: invoice.workspaceId,
      recipientId: invoice.clientId,
      type: `INVOICE_${type}`,
      invoiceId: invoice.id,
    })
  }

  /**
   * Retry a failed notification
   */
  async retryNotification(
    notificationId: string
  ): Promise<SendSMSResult> {
    const notification = await prisma.notificationLog.findUnique({
      where: { id: notificationId },
    })

    if (!notification) {
      return { success: false, error: "Notification not found" }
    }

    if (notification.channel !== "SMS") {
      return { success: false, error: "Not an SMS notification" }
    }

    if (!notification.phoneNumber) {
      return { success: false, error: "No phone number" }
    }

    // Update attempt count
    await prisma.notificationLog.update({
      where: { id: notificationId },
      data: {
        attemptCount: notification.attemptCount + 1,
        lastAttemptAt: new Date(),
        status: "PENDING",
      },
    })

    try {
      const message = await this.twilioClient!.messages.create({
        body: notification.messageContent,
        from: this.fromNumber,
        to: notification.phoneNumber,
        statusCallback: `${process.env.NEXTAUTH_URL}/api/webhooks/twilio/status`,
      })

      await prisma.notificationLog.update({
        where: { id: notificationId },
        data: {
          status: "SENT",
          externalId: message.sid,
          sentAt: new Date(),
          nextRetryAt: null,
        },
      })

      console.log(`✅ SMS retry successful (SID: ${message.sid})`)
      return { success: true, messageId: message.sid, logId: notificationId }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"

      const MAX_RETRY_ATTEMPTS = 3
      const shouldRetry = notification.attemptCount + 1 < MAX_RETRY_ATTEMPTS

      await prisma.notificationLog.update({
        where: { id: notificationId },
        data: {
          status: "FAILED",
          errorMessage,
          nextRetryAt: shouldRetry
            ? new Date(Date.now() + 15 * 60 * 1000)
            : null,
        },
      })

      console.error(`❌ SMS retry failed:`, errorMessage)
      return { success: false, error: errorMessage, logId: notificationId }
    }
  }
}
