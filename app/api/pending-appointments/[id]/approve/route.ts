import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireWorkspace, requireUserId } from "@/lib/middleware/tenant"
import { z } from "zod"

const approveSchema = z.object({
  clientId: z.string().uuid().optional(), // Allow changing the suggested client
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const workspaceId = await requireWorkspace()
    const userId = await requireUserId()

    const body = await request.json()
    const { clientId: overrideClientId } = approveSchema.parse(body)

    // Find the pending appointment
    const pending = await prisma.pendingAppointment.findUnique({
      where: { id },
      include: {
        suggestedClient: true,
      },
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

    // Use override client or suggested client
    const finalClientId = overrideClientId || pending.suggestedClientId

    if (!finalClientId) {
      return NextResponse.json(
        { error: "No client specified" },
        { status: 400 }
      )
    }

    // Create the actual appointment
    const appointment = await prisma.appointment.create({
      data: {
        workspaceId,
        trainerId: userId,
        clientId: finalClientId,
        startTime: pending.startTime,
        endTime: pending.endTime,
        status: "SCHEDULED",
      },
      include: {
        client: true,
      },
    })

    console.log(`✅ Created appointment from pending: ${appointment.id}`)

    // Update pending appointment status
    await prisma.pendingAppointment.update({
      where: { id },
      data: {
        status: "converted",
        createdAppointmentId: appointment.id,
      },
    })

    console.log(`✅ Marked pending appointment as converted`)

    // Create calendar mapping for the new appointment
    await prisma.calendarEventMapping.create({
      data: {
        workspaceId,
        appointmentId: appointment.id,
        provider: "google",
        externalEventId: pending.externalEventId,
        externalCalendarId: "primary",
        syncDirection: "inbound",
      },
    })

    console.log(`✅ Created calendar event mapping`)

    return NextResponse.json({ appointment }, { status: 201 })
  } catch (error) {
    console.error("Approve pending appointment error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to approve appointment" },
      { status: 500 }
    )
  }
}
