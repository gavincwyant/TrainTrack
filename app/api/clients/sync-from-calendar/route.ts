import { NextResponse } from "next/server"
import { requireWorkspace, requireUserId } from "@/lib/middleware/tenant"
import { ClientSyncService } from "@/lib/services/client-sync"
import { prisma } from "@/lib/db"

/**
 * POST /api/clients/sync-from-calendar
 *
 * Trigger initial client sync from Google Calendar
 * Extracts potential client names from past calendar events
 */
export async function POST(request: Request) {
  try {
    const workspaceId = await requireWorkspace()
    const trainerId = await requireUserId()

    // Check if trainer has Google Calendar connected
    const settings = await prisma.trainerSettings.findUnique({
      where: { trainerId },
    })

    if (!settings?.googleCalendarConnected) {
      return NextResponse.json(
        { error: "Google Calendar not connected" },
        { status: 400 }
      )
    }

    // Parse optional request body
    const body = await request.json().catch(() => ({}))
    const lookbackDays = body.lookbackDays || 30

    console.log(`🔄 Starting client sync for trainer ${trainerId}`, {
      lookbackDays,
      hasCompletedInitialSync: settings.hasCompletedInitialClientSync,
    })

    // Perform sync
    const syncService = new ClientSyncService()
    const result = await syncService.syncClientsFromCalendar(trainerId, {
      lookbackDays,
      source: "google",
    })

    console.log(`✅ Client sync completed successfully`, result)

    return NextResponse.json({
      success: true,
      extractedCount: result.extractedCount,
      createdCount: result.createdCount,
      duplicateCount: result.duplicateCount,
      pendingProfiles: result.pendingProfiles,
    })
  } catch (error) {
    console.error("Client sync error:", error)

    return NextResponse.json(
      {
        error: "Failed to sync clients from calendar",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
