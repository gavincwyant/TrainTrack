import { NextResponse } from "next/server"
import { requireUserId, isTrainer } from "@/lib/middleware/tenant"
import { CalendarSyncService } from "@/lib/services/calendar-sync"

export async function POST() {
  try {
    const userId = await requireUserId()
    const userIsTrainer = await isTrainer()

    if (!userIsTrainer) {
      return NextResponse.json(
        { error: "Only trainers can sync calendar" },
        { status: 403 }
      )
    }

    const syncService = new CalendarSyncService()
    await syncService.pullGoogleCalendarEvents(userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Manual sync error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync calendar" },
      { status: 500 }
    )
  }
}
