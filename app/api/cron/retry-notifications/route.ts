import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { SMSService } from "@/lib/services/sms"

const MAX_RETRY_ATTEMPTS = 3

/**
 * Cron job to retry failed notifications
 * Should run every 15-30 minutes
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🔄 Starting notification retry cron job")

    const smsService = new SMSService()
    const now = new Date()
    const results = { retried: 0, abandoned: 0, skipped: 0 }

    // Find failed SMS notifications ready for retry
    const failedNotifications = await prisma.notificationLog.findMany({
      where: {
        status: "FAILED",
        channel: "SMS",
        attemptCount: { lt: MAX_RETRY_ATTEMPTS },
        nextRetryAt: { lte: now },
      },
      take: 50, // Process in batches to avoid overwhelming the system
      orderBy: { nextRetryAt: "asc" },
    })

    console.log(`📋 Found ${failedNotifications.length} failed notifications to retry`)

    for (const notification of failedNotifications) {
      // Check if we've exceeded max retries
      if (notification.attemptCount >= MAX_RETRY_ATTEMPTS) {
        console.log(`⏭️ Max retries reached for notification ${notification.id}`)
        await prisma.notificationLog.update({
          where: { id: notification.id },
          data: {
            nextRetryAt: null, // Stop retrying
          },
        })
        results.abandoned++
        continue
      }

      // Skip if no phone number
      if (!notification.phoneNumber) {
        console.log(`⏭️ No phone number for notification ${notification.id}`)
        results.skipped++
        continue
      }

      try {
        const result = await smsService.retryNotification(notification.id)

        if (result.success) {
          console.log(`✅ Retry successful for notification ${notification.id}`)
          results.retried++
        } else {
          console.log(`❌ Retry failed for notification ${notification.id}: ${result.error}`)

          // Check if this was the last retry
          if (notification.attemptCount + 1 >= MAX_RETRY_ATTEMPTS) {
            results.abandoned++
          }
        }
      } catch (error) {
        console.error(`❌ Error retrying notification ${notification.id}:`, error)
      }
    }

    console.log(`✅ Notification retry complete: ${results.retried} retried, ${results.abandoned} abandoned, ${results.skipped} skipped`)

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error("❌ Cron retry notifications error:", error)
    return NextResponse.json(
      { error: "Failed to retry notifications" },
      { status: 500 }
    )
  }
}
