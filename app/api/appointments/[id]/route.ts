import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireWorkspace, requireUserId } from "@/lib/middleware/tenant"
import { CalendarSyncService } from "@/lib/services/calendar-sync"
import { InvoiceService } from "@/lib/services/invoice"

const updateAppointmentSchema = z.object({
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "RESCHEDULED"]).optional(),
  cancellationReason: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await requireWorkspace()
    const userId = await requireUserId()
    const { id } = await params

    const body = await request.json()
    const data = updateAppointmentSchema.parse(body)

    // Verify appointment exists and user has access
    const appointment = await prisma.appointment.findUnique({
      where: { id },
    })

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      )
    }

    if (appointment.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    // Check if user is trainer or client for this appointment
    if (appointment.trainerId !== userId && appointment.clientId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    // If rescheduling, validate new times
    if (data.startTime && data.endTime) {
      const startTime = new Date(data.startTime)
      const endTime = new Date(data.endTime)

      if (endTime <= startTime) {
        return NextResponse.json(
          { error: "End time must be after start time" },
          { status: 400 }
        )
      }

      // Check for conflicts (excluding this appointment)
      const conflicting = await prisma.appointment.findFirst({
        where: {
          id: { not: id },
          workspaceId,
          trainerId: appointment.trainerId,
          status: {
            in: ["SCHEDULED", "RESCHEDULED"],
          },
          OR: [
            {
              AND: [
                { startTime: { lte: startTime } },
                { endTime: { gt: startTime } },
              ],
            },
            {
              AND: [
                { startTime: { lt: endTime } },
                { endTime: { gte: endTime } },
              ],
            },
            {
              AND: [
                { startTime: { gte: startTime } },
                { endTime: { lte: endTime } },
              ],
            },
          ],
        },
      })

      if (conflicting) {
        return NextResponse.json(
          { error: "This time slot conflicts with an existing appointment" },
          { status: 400 }
        )
      }
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.cancellationReason && { cancellationReason: data.cancellationReason }),
        ...(data.startTime && { startTime: new Date(data.startTime) }),
        ...(data.endTime && { endTime: new Date(data.endTime) }),
      },
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        trainer: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    })

    // Sync to Google Calendar (async, don't wait)
    const syncService = new CalendarSyncService()
    syncService.syncAppointmentToGoogle(id).catch((error) => {
      console.error("Background sync failed:", error)
    })

    // Generate per-session invoice if status changed to COMPLETED
    if (data.status === "COMPLETED") {
      console.log(`🔔 Appointment marked COMPLETED, generating invoice for: ${id}`)
      const invoiceService = new InvoiceService()
      try {
        await invoiceService.generatePerSessionInvoice(id)
        console.log(`✅ Invoice generation completed for appointment: ${id}`)
      } catch (error) {
        console.error("Failed to generate per-session invoice:", error)
      }
    }

    return NextResponse.json({ appointment: updated })
  } catch (error) {
    console.error("Update appointment error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to update appointment" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await requireWorkspace()
    const userId = await requireUserId()
    const { id } = await params

    // Verify appointment exists and user has access
    const appointment = await prisma.appointment.findUnique({
      where: { id },
    })

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      )
    }

    if (appointment.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    // Only trainer can delete appointments
    if (appointment.trainerId !== userId) {
      return NextResponse.json(
        { error: "Only trainers can delete appointments" },
        { status: 403 }
      )
    }

    // Delete from Google Calendar first (async, don't wait)
    const syncService = new CalendarSyncService()
    syncService.deleteAppointmentFromGoogle(id, appointment.trainerId).catch((error) => {
      console.error("Background sync deletion failed:", error)
    })

    await prisma.appointment.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete appointment error:", error)

    return NextResponse.json(
      { error: "Failed to delete appointment" },
      { status: 500 }
    )
  }
}
