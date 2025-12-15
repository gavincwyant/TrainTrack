import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { SMSService } from "@/lib/services/sms"
import { EmailService } from "@/lib/services/email"

/**
 * Cron job to send appointment reminders
 * Should run every 10 minutes to catch appointments within reminder windows
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🔔 Starting appointment reminder cron job")

    const smsService = new SMSService()
    const emailService = new EmailService()
    const now = new Date()
    const results = { sent: 0, skipped: 0, failed: 0 }

    // Get all trainer settings with reminders enabled
    const trainerSettings = await prisma.trainerSettings.findMany({
      where: { appointmentReminderEnabled: true },
      include: { trainer: true },
    })

    console.log(`📋 Processing ${trainerSettings.length} trainers with reminders enabled`)

    for (const settings of trainerSettings) {
      // Get reminder hours from JSON field (default to [24])
      const reminderHours = (settings.appointmentReminderHours as number[]) || [24]

      for (const hours of reminderHours) {
        // Calculate the window for this reminder (±5 minutes)
        const targetTime = new Date(now.getTime() + hours * 60 * 60 * 1000)
        const windowStart = new Date(targetTime.getTime() - 5 * 60 * 1000)
        const windowEnd = new Date(targetTime.getTime() + 5 * 60 * 1000)

        // Find appointments in this window
        const appointments = await prisma.appointment.findMany({
          where: {
            trainerId: settings.trainerId,
            status: { in: ["SCHEDULED", "RESCHEDULED"] },
            startTime: { gte: windowStart, lte: windowEnd },
          },
          include: {
            client: {
              include: { clientProfile: true },
            },
            trainer: true,
          },
        })

        for (const appointment of appointments) {
          const clientProfile = appointment.client.clientProfile

          // Skip if client has appointment reminders disabled
          if (!clientProfile?.appointmentRemindersEnabled) {
            console.log(`⏭️ Skipping reminder for ${appointment.client.fullName} - reminders disabled`)
            results.skipped++
            continue
          }

          // Check if reminder was already sent (within the last hour for this reminder window)
          const cutoffTime = new Date(now.getTime() - 60 * 60 * 1000)
          const existingReminder = await prisma.notificationLog.findFirst({
            where: {
              appointmentId: appointment.id,
              type: "APPOINTMENT_REMINDER",
              status: { in: ["SENT", "DELIVERED"] },
              createdAt: { gte: cutoffTime },
            },
          })

          if (existingReminder) {
            console.log(`⏭️ Skipping duplicate reminder for appointment ${appointment.id}`)
            results.skipped++
            continue
          }

          try {
            let sent = false

            // Send SMS if enabled and client has valid phone
            if (clientProfile.smsNotificationsEnabled && appointment.client.phone) {
              const smsResult = await smsService.sendAppointmentReminder(
                {
                  ...appointment,
                  client: {
                    id: appointment.client.id,
                    fullName: appointment.client.fullName,
                    email: appointment.client.email,
                    phone: appointment.client.phone,
                  },
                  trainer: {
                    id: appointment.trainer.id,
                    fullName: appointment.trainer.fullName,
                    email: appointment.trainer.email,
                  },
                },
                hours
              )
              if (smsResult.success) sent = true
            }

            // Send email if enabled
            if (clientProfile.emailNotificationsEnabled) {
              try {
                await emailService.sendAppointmentReminderEmail(
                  {
                    ...appointment,
                    client: {
                      id: appointment.client.id,
                      fullName: appointment.client.fullName,
                      email: appointment.client.email,
                      phone: appointment.client.phone,
                    },
                    trainer: {
                      id: appointment.trainer.id,
                      fullName: appointment.trainer.fullName,
                      email: appointment.trainer.email,
                    },
                  },
                  hours
                )
                sent = true
              } catch (emailError) {
                console.error(`❌ Failed to send email reminder:`, emailError)
              }
            }

            if (sent) {
              console.log(`✅ Reminder sent for ${appointment.client.fullName} (${hours}h before)`)
              results.sent++
            } else {
              results.skipped++
            }
          } catch (error) {
            console.error(`❌ Failed to send reminder for appointment ${appointment.id}:`, error)
            results.failed++
          }
        }
      }
    }

    console.log(`✅ Appointment reminders complete: ${results.sent} sent, ${results.skipped} skipped, ${results.failed} failed`)

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error("❌ Cron appointment reminders error:", error)
    return NextResponse.json(
      { error: "Failed to process appointment reminders" },
      { status: 500 }
    )
  }
}
