import { NextResponse } from "next/server"
import { CalendarSyncService } from "@/lib/services/calendar-sync"
import { InvoiceService } from "@/lib/services/invoice"
import { prisma } from "@/lib/db"

/**
 * Combined cron job that:
 * 1. Auto-completes past appointments
 * 2. Syncs Google Calendar events for trainers with auto-sync enabled
 * Runs every 15 minutes
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const syncService = new CalendarSyncService()
    const invoiceService = new InvoiceService()

    // === PART 1: Auto-complete past appointments ===
    const now = new Date()
    const pastAppointments = await prisma.appointment.findMany({
      where: {
        status: {
          in: ["SCHEDULED", "RESCHEDULED"],
        },
        endTime: {
          lt: now,
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

    const completedResults = []
    for (const appointment of pastAppointments) {
      try {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { status: "COMPLETED" },
        })

        // Sync status change to Google Calendar (async, don't wait)
        syncService.syncAppointmentToGoogle(appointment.id).catch((error) => {
          console.error(`Failed to sync completed status to Google Calendar:`, error)
        })

        // Generate per-session invoice if auto-invoicing is enabled (async, don't wait)
        invoiceService.generatePerSessionInvoice(appointment.id).catch((error) => {
          console.error(`Failed to generate per-session invoice:`, error)
        })

        completedResults.push({
          appointmentId: appointment.id,
          clientName: appointment.client.fullName,
          status: "success",
        })
      } catch (error) {
        completedResults.push({
          appointmentId: appointment.id,
          clientName: appointment.client.fullName,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    // === PART 2: Sync Google Calendar for trainers ===
    const trainersWithSync = await prisma.trainerSettings.findMany({
      where: {
        autoSyncEnabled: true,
        googleCalendarConnected: true,
      },
    })

    const syncResults = []
    for (const settings of trainersWithSync) {
      try {
        await syncService.pullGoogleCalendarEvents(settings.trainerId)
        syncResults.push({ trainerId: settings.trainerId, status: "success" })
      } catch (error) {
        syncResults.push({
          trainerId: settings.trainerId,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return NextResponse.json({
      appointmentsCompleted: completedResults.filter((r) => r.status === "success").length,
      appointmentsFailed: completedResults.filter((r) => r.status === "error").length,
      calendarsSynced: syncResults.filter((r) => r.status === "success").length,
      calendarSyncFailed: syncResults.filter((r) => r.status === "error").length,
      completedResults,
      syncResults,
    })
  } catch (error) {
    console.error("Cron sync error:", error)
    return NextResponse.json(
      { error: "Failed to run sync cron" },
      { status: 500 }
    )
  }
}
