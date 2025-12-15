import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { SMSService } from "@/lib/services/sms"
import { EmailService } from "@/lib/services/email"
import { Invoice, User, ClientProfile, InvoiceLineItem } from "@prisma/client"

type InvoiceWithRelations = Invoice & {
  client: User & { clientProfile: ClientProfile | null }
  trainer: User
  lineItems: InvoiceLineItem[]
}

/**
 * Cron job to send invoice reminders
 * Should run once daily (e.g., 9am)
 * Handles: due soon, on due date, and overdue reminders
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("💰 Starting invoice reminder cron job")

    const smsService = new SMSService()
    const emailService = new EmailService()
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const results = { dueSoon: 0, onDue: 0, overdue: 0, skipped: 0, failed: 0 }

    // Get all trainer settings
    const trainerSettings = await prisma.trainerSettings.findMany({
      include: { trainer: true },
    })

    console.log(`📋 Processing ${trainerSettings.length} trainers`)

    for (const settings of trainerSettings) {
      // Process "due soon" reminders
      if (settings.invoiceReminderBeforeDue) {
        const daysBeforeDue = settings.invoiceReminderBeforeDueDays || 3
        const targetDate = new Date(today)
        targetDate.setDate(targetDate.getDate() + daysBeforeDue)

        const dueSoonInvoices = await prisma.invoice.findMany({
          where: {
            trainerId: settings.trainerId,
            status: "SENT",
            dueDate: {
              gte: new Date(targetDate.getTime() - 12 * 60 * 60 * 1000),
              lte: new Date(targetDate.getTime() + 12 * 60 * 60 * 1000),
            },
          },
          include: {
            client: { include: { clientProfile: true } },
            trainer: true,
            lineItems: true,
          },
        })

        for (const invoice of dueSoonInvoices) {
          const sent = await processInvoiceReminder(
            invoice as InvoiceWithRelations,
            "DUE_SOON",
            smsService,
            emailService
          )
          if (sent) results.dueSoon++
          else results.skipped++
        }
      }

      // Process "on due date" reminders
      if (settings.invoiceReminderOnDue) {
        const onDueInvoices = await prisma.invoice.findMany({
          where: {
            trainerId: settings.trainerId,
            status: "SENT",
            dueDate: {
              gte: new Date(today.getTime() - 12 * 60 * 60 * 1000),
              lte: new Date(today.getTime() + 12 * 60 * 60 * 1000),
            },
          },
          include: {
            client: { include: { clientProfile: true } },
            trainer: true,
            lineItems: true,
          },
        })

        for (const invoice of onDueInvoices) {
          const sent = await processInvoiceReminder(
            invoice as InvoiceWithRelations,
            "DUE_SOON", // On due date is still a "due soon" type reminder
            smsService,
            emailService
          )
          if (sent) results.onDue++
          else results.skipped++
        }
      }

      // Process overdue reminders
      if (settings.invoiceReminderOverdue) {
        const overdueDays = (settings.invoiceReminderOverdueDays as number[]) || [3, 7]

        for (const days of overdueDays) {
          const overdueDate = new Date(today)
          overdueDate.setDate(overdueDate.getDate() - days)

          // Find SENT invoices that are past due (should be marked OVERDUE)
          const overdueInvoices = await prisma.invoice.findMany({
            where: {
              trainerId: settings.trainerId,
              status: { in: ["SENT", "OVERDUE"] },
              dueDate: {
                gte: new Date(overdueDate.getTime() - 12 * 60 * 60 * 1000),
                lte: new Date(overdueDate.getTime() + 12 * 60 * 60 * 1000),
              },
            },
            include: {
              client: { include: { clientProfile: true } },
              trainer: true,
              lineItems: true,
            },
          })

          for (const invoice of overdueInvoices) {
            // Update status to OVERDUE if it's still SENT
            if (invoice.status === "SENT") {
              await prisma.invoice.update({
                where: { id: invoice.id },
                data: { status: "OVERDUE" },
              })
            }

            const sent = await processInvoiceReminder(
              invoice as InvoiceWithRelations,
              "OVERDUE",
              smsService,
              emailService
            )
            if (sent) results.overdue++
            else results.skipped++
          }
        }
      }
    }

    console.log(`✅ Invoice reminders complete: ${results.dueSoon} due soon, ${results.onDue} on due, ${results.overdue} overdue, ${results.skipped} skipped`)

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error("❌ Cron invoice reminders error:", error)
    return NextResponse.json(
      { error: "Failed to process invoice reminders" },
      { status: 500 }
    )
  }
}

async function processInvoiceReminder(
  invoice: InvoiceWithRelations,
  type: "DUE_SOON" | "OVERDUE",
  smsService: SMSService,
  emailService: EmailService
): Promise<boolean> {
  const clientProfile = invoice.client.clientProfile

  // Skip if client has invoice alerts disabled
  if (!clientProfile?.invoiceAlertsEnabled) {
    console.log(`⏭️ Skipping invoice reminder for ${invoice.client.fullName} - alerts disabled`)
    return false
  }

  // Check for existing reminder in the last 24 hours
  const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const existingReminder = await prisma.notificationLog.findFirst({
    where: {
      invoiceId: invoice.id,
      type: `INVOICE_${type}`,
      status: { in: ["SENT", "DELIVERED"] },
      createdAt: { gte: cutoffTime },
    },
  })

  if (existingReminder) {
    console.log(`⏭️ Skipping duplicate ${type} reminder for invoice ${invoice.id}`)
    return false
  }

  let sent = false

  try {
    // Send SMS if enabled and client has valid phone
    if (clientProfile.smsNotificationsEnabled && invoice.client.phone) {
      const smsResult = await smsService.sendInvoiceNotification(
        {
          ...invoice,
          client: {
            id: invoice.client.id,
            fullName: invoice.client.fullName,
            email: invoice.client.email,
            phone: invoice.client.phone,
          },
          trainer: {
            id: invoice.trainer.id,
            fullName: invoice.trainer.fullName,
            email: invoice.trainer.email,
          },
        },
        type
      )
      if (smsResult.success) sent = true
    }

    // Send email if enabled
    if (clientProfile.emailNotificationsEnabled) {
      try {
        await emailService.sendInvoiceReminderEmail(
          {
            ...invoice,
            client: {
              id: invoice.client.id,
              fullName: invoice.client.fullName,
              email: invoice.client.email,
              phone: invoice.client.phone,
            },
            trainer: {
              id: invoice.trainer.id,
              fullName: invoice.trainer.fullName,
              email: invoice.trainer.email,
            },
          },
          type
        )
        sent = true
      } catch (emailError) {
        console.error(`❌ Failed to send invoice email reminder:`, emailError)
      }
    }

    if (sent) {
      console.log(`✅ ${type} reminder sent for invoice ${invoice.id} to ${invoice.client.fullName}`)
    }
  } catch (error) {
    console.error(`❌ Failed to send invoice reminder:`, error)
  }

  return sent
}
