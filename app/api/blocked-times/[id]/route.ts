import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireWorkspace, requireUserId } from "@/lib/middleware/tenant"
import { GoogleCalendarService } from "@/lib/google-calendar"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await requireWorkspace()
    const userId = await requireUserId()
    const { id } = await params

    // Verify ownership before deleting
    const blockedTime = await prisma.blockedTime.findUnique({
      where: { id },
    })

    if (!blockedTime) {
      return NextResponse.json(
        { error: "Blocked time not found" },
        { status: 404 }
      )
    }

    if (blockedTime.trainerId !== userId || blockedTime.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    // Find calendar event mapping for this blocked time
    const mapping = await prisma.calendarEventMapping.findFirst({
      where: {
        blockedTimeId: id,
        provider: "google",
      },
    })

    // Delete from Google Calendar if mapping exists (async, don't wait)
    if (mapping) {
      const googleService = new GoogleCalendarService()
      googleService
        .deleteEvent(blockedTime.trainerId, mapping.externalEventId)
        .catch((error) => {
          console.error("Background sync deletion failed:", error)
        })

      // Delete the calendar event mapping
      await prisma.calendarEventMapping.delete({
        where: { id: mapping.id },
      }).catch((error) => {
        console.error("Failed to delete calendar event mapping:", error)
      })
    }

    await prisma.blockedTime.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete blocked time error:", error)

    return NextResponse.json(
      { error: "Failed to delete blocked time" },
      { status: 500 }
    )
  }
}
