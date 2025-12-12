import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireWorkspace, requireUserId, isTrainer } from "@/lib/middleware/tenant"

const blockedTimeSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  reason: z.string().optional(),
  isRecurring: z.boolean().default(false),
  dayOfWeek: z.number().min(0).max(6).optional(), // For recurring blocks
})

export async function GET() {
  try {
    const workspaceId = await requireWorkspace()
    const userId = await requireUserId()
    const userIsTrainer = await isTrainer()

    let trainerId = userId

    // If user is a client, find their trainer's blocked times
    if (!userIsTrainer) {
      // First try to get trainer from ClientTrainer relationship
      const clientTrainer = await prisma.clientTrainer.findFirst({
        where: {
          clientId: userId,
          workspaceId,
          isActive: true,
        },
        select: { trainerId: true },
      })

      if (clientTrainer) {
        trainerId = clientTrainer.trainerId
      } else {
        // Fallback: get any trainer in the workspace
        const trainer = await prisma.user.findFirst({
          where: {
            workspaceId,
            role: "TRAINER",
          },
          select: { id: true },
        })

        if (trainer) {
          trainerId = trainer.id
        }
      }
    }

    const blockedTimes = await prisma.blockedTime.findMany({
      where: {
        workspaceId,
        trainerId,
      },
      orderBy: {
        startTime: "asc",
      },
    })

    return NextResponse.json({ blockedTimes })
  } catch (error) {
    console.error("Get blocked times error:", error)

    return NextResponse.json(
      { error: "Failed to fetch blocked times" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const workspaceId = await requireWorkspace()
    const userId = await requireUserId()

    const body = await request.json()
    const data = blockedTimeSchema.parse(body)

    const startTime = new Date(data.startTime)
    const endTime = new Date(data.endTime)

    // Validate times
    if (endTime <= startTime) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      )
    }

    const blockedTime = await prisma.blockedTime.create({
      data: {
        workspaceId,
        trainerId: userId,
        startTime,
        endTime,
        reason: data.reason,
        isRecurring: data.isRecurring,
        dayOfWeek: data.dayOfWeek,
      },
    })

    return NextResponse.json({ blockedTime }, { status: 201 })
  } catch (error) {
    console.error("Create blocked time error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create blocked time" },
      { status: 500 }
    )
  }
}
