import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireWorkspace, requireUserId } from "@/lib/middleware/tenant"

// GET - Fetch all pending appointments for the trainer
export async function GET() {
  try {
    const workspaceId = await requireWorkspace()
    const userId = await requireUserId()

    const pendingAppointments = await prisma.pendingAppointment.findMany({
      where: {
        workspaceId,
        trainerId: userId,
        status: "pending",
      },
      include: {
        suggestedClient: {
          select: {
            id: true,
            fullName: true,
            email: true,
            clientProfile: {
              select: {
                sessionRate: true,
              },
            },
          },
        },
      },
      orderBy: {
        startTime: "asc",
      },
    })

    return NextResponse.json({ pendingAppointments })
  } catch (error) {
    console.error("Get pending appointments error:", error)
    return NextResponse.json(
      { error: "Failed to fetch pending appointments" },
      { status: 500 }
    )
  }
}
