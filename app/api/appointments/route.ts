import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireWorkspace, requireUserId, isTrainer } from "@/lib/middleware/tenant"

const appointmentSchema = z.object({
  clientId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
})

export async function GET(request: Request) {
  try {
    const workspaceId = await requireWorkspace()
    const userId = await requireUserId()
    const userIsTrainer = await isTrainer()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const where: Record<string, unknown> = {
      workspaceId,
      ...(userIsTrainer ? { trainerId: userId } : { clientId: userId }),
    }

    if (status) {
      where.status = status
    }

    const appointments = await prisma.appointment.findMany({
      where,
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
      orderBy: {
        startTime: "asc",
      },
    })

    return NextResponse.json({ appointments })
  } catch (error) {
    console.error("Get appointments error:", error)

    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const workspaceId = await requireWorkspace()
    const userId = await requireUserId()
    const userIsTrainer = await isTrainer()

    const body = await request.json()
    const data = appointmentSchema.parse(body)

    const startTime = new Date(data.startTime)
    const endTime = new Date(data.endTime)

    // Validate times
    if (endTime <= startTime) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      )
    }

    // Check for conflicting appointments
    const conflicting = await prisma.appointment.findFirst({
      where: {
        workspaceId,
        trainerId: userIsTrainer ? userId : undefined,
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

    // Verify client belongs to workspace
    const client = await prisma.user.findFirst({
      where: {
        id: data.clientId,
        workspaceId,
        role: "CLIENT",
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      )
    }

    const appointment = await prisma.appointment.create({
      data: {
        workspaceId,
        trainerId: userIsTrainer ? userId : client.id, // If client booking, use their trainer
        clientId: data.clientId,
        startTime,
        endTime,
        status: "SCHEDULED",
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

    return NextResponse.json({ appointment }, { status: 201 })
  } catch (error) {
    console.error("Create appointment error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create appointment" },
      { status: 500 }
    )
  }
}
