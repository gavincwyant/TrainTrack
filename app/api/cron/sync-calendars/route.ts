import { NextResponse } from "next/server"
import { CalendarSyncService } from "@/lib/services/calendar-sync"
import { prisma } from "@/lib/db"

export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const syncService = new CalendarSyncService()

    // Get all trainers with auto-sync enabled
    const trainersWithSync = await prisma.trainerSettings.findMany({
      where: {
        autoSyncEnabled: true,
        googleCalendarConnected: true,
      },
    })

    const results = []
    for (const settings of trainersWithSync) {
      try {
        await syncService.pullGoogleCalendarEvents(settings.trainerId)
        results.push({ trainerId: settings.trainerId, status: "success" })
      } catch (error) {
        results.push({
          trainerId: settings.trainerId,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return NextResponse.json({
      synced: results.length,
      results,
    })
  } catch (error) {
    console.error("Cron sync error:", error)
    return NextResponse.json(
      { error: "Failed to sync calendars" },
      { status: 500 }
    )
  }
}
