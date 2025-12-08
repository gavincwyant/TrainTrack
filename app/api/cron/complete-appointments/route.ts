import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { CalendarSyncService } from "@/lib/services/calendar-sync"
import { InvoiceService } from "@/lib/services/invoice"

/**
 * Cron job to automatically mark past appointments as COMPLETED
 * Runs every hour to check for appointments that have ended
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🚀 Starting auto-complete appointments cron job")

    const now = new Date()

    // Find all SCHEDULED or RESCHEDULED appointments that have ended
    const pastAppointments = await prisma.appointment.findMany({
      where: {
        status: {
          in: ["SCHEDULED", "RESCHEDULED"],
        },
        endTime: {
          lt: now, // Ended before now
        },
      },
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    })

    console.log(`📋 Found ${pastAppointments.length} past appointments to complete`)

    const syncService = new CalendarSyncService()
    const invoiceService = new InvoiceService()
    const results = []

    for (const appointment of pastAppointments) {
      try {
        // Update appointment status to COMPLETED
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { status: "COMPLETED" },
        })

        console.log(`✅ Completed appointment: ${appointment.client.fullName} (${appointment.id})`)

        // Sync status change to Google Calendar (async, don't wait)
        syncService.syncAppointmentToGoogle(appointment.id).catch((error) => {
          console.error(`⚠️ Failed to sync completed status to Google Calendar:`, error)
        })

        // Generate per-session invoice if auto-invoicing is enabled (async, don't wait)
        invoiceService.generatePerSessionInvoice(appointment.id).catch((error) => {
          console.error(`⚠️ Failed to generate per-session invoice:`, error)
        })

        results.push({
          appointmentId: appointment.id,
          clientName: appointment.client.fullName,
          status: "success",
        })
      } catch (error) {
        console.error(`❌ Failed to complete appointment ${appointment.id}:`, error)
        results.push({
          appointmentId: appointment.id,
          clientName: appointment.client.fullName,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    console.log(`✅ Auto-completed ${results.filter((r) => r.status === "success").length} appointments`)

    return NextResponse.json({
      success: true,
      completed: results.filter((r) => r.status === "success").length,
      failed: results.filter((r) => r.status === "error").length,
      results,
    })
  } catch (error) {
    console.error("❌ Cron complete appointments error:", error)
    return NextResponse.json(
      { error: "Failed to complete appointments" },
      { status: 500 }
    )
  }
}
