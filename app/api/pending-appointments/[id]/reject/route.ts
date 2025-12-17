import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireWorkspace, requireUserId } from "@/lib/middleware/tenant"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const workspaceId = await requireWorkspace()
    const userId = await requireUserId()

    // Find the pending appointment
    const pending = await prisma.pendingAppointment.findUnique({
      where: { id },
    })

    if (!pending) {
      return NextResponse.json(
        { error: "Pending appointment not found" },
        { status: 404 }
      )
    }

    // Verify ownership
    if (pending.trainerId !== userId || pending.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (pending.status !== "pending") {
      return NextResponse.json(
        { error: "Appointment already processed" },
        { status: 400 }
      )
    }

    // Update status to rejected and create blocked time instead
    await prisma.pendingAppointment.update({
      where: { id },
      data: {
        status: "rejected",
      },
    })

    // Create blocked time for this event
    const blockedTime = await prisma.blockedTime.create({
      data: {
        workspaceId,
        trainerId: userId,
        startTime: pending.startTime,
        endTime: pending.endTime,
        reason: `${pending.externalEventTitle || 'Busy'} (via Google)`,
        isRecurring: false,
      },
    })

    // Create calendar mapping
    await prisma.calendarEventMapping.create({
      data: {
        workspaceId,
        blockedTimeId: blockedTime.id,
        provider: "google",
        externalEventId: pending.externalEventId,
        externalCalendarId: "primary",
        syncDirection: "inbound",
      },
    })

    console.log(`✅ Rejected pending appointment and created blocked time`)

    return NextResponse.json({ success: true, blockedTime })
  } catch (error) {
    console.error("Reject pending appointment error:", error)
    return NextResponse.json(
      { error: "Failed to reject appointment" },
      { status: 500 }
    )
  }
}
