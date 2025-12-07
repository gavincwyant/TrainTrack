import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireUserId, isTrainer } from "@/lib/middleware/tenant"

export async function POST() {
  try {
    const userId = await requireUserId()
    const userIsTrainer = await isTrainer()

    if (!userIsTrainer) {
      return NextResponse.json(
        { error: "Only trainers can disconnect calendar" },
        { status: 403 }
      )
    }

    // Clear all calendar connection data
    await prisma.trainerSettings.update({
      where: { trainerId: userId },
      data: {
        googleCalendarConnected: false,
        googleAccessToken: null,
        googleRefreshToken: null,
        googleCalendarEmail: null,
        googleCalendarId: null,
        autoSyncEnabled: false,
        lastSyncedAt: null,
      },
    })

    // Delete all calendar event mappings for this trainer
    const settings = await prisma.trainerSettings.findUnique({
      where: { trainerId: userId },
    })

    if (settings) {
      await prisma.calendarEventMapping.deleteMany({
        where: { workspaceId: settings.workspaceId },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Disconnect calendar error:", error)
    return NextResponse.json(
      { error: "Failed to disconnect calendar" },
      { status: 500 }
    )
  }
}
