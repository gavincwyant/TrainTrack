import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireWorkspace, requireUserId } from "@/lib/middleware/tenant"

const exerciseSchema = z.object({
  name: z.string().min(1),
  sets: z.number().int().min(1),
  reps: z.number().int().min(1),
  weight: z.number().min(0).optional(),
  notes: z.string().optional(),
})

const workoutSessionSchema = z.object({
  appointmentId: z.string().uuid(),
  date: z.string(),
  notes: z.string().optional(),
  exercises: z.array(exerciseSchema).optional(),
  customMetrics: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
})

export async function GET(request: Request) {
  try {
    const workspaceId = await requireWorkspace()
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")

    const where: Record<string, unknown> = {
      workspaceId,
    }

    if (clientId) {
      where.clientId = clientId
    }

    const sessions = await prisma.workoutSession.findMany({
      where,
      include: {
        appointment: {
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
              },
            },
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    })

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error("Get workout sessions error:", error)

    return NextResponse.json(
      { error: "Failed to fetch workout sessions" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const workspaceId = await requireWorkspace()
    await requireUserId()

    const body = await request.json()
    const data = workoutSessionSchema.parse(body)

    // Get the appointment to verify it exists and get client/trainer IDs
    const appointment = await prisma.appointment.findUnique({
      where: { id: data.appointmentId },
      include: {
        workoutSession: true,
      },
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

    if (appointment.workoutSession) {
      return NextResponse.json(
        { error: "Workout session already exists for this appointment" },
        { status: 400 }
      )
    }

    // Create workout session
    const session = await prisma.workoutSession.create({
      data: {
        workspaceId,
        appointmentId: data.appointmentId,
        trainerId: appointment.trainerId,
        clientId: appointment.clientId,
        date: new Date(data.date),
        notes: data.notes,
        exercises: data.exercises || [],
        customMetrics: data.customMetrics || {},
      },
      include: {
        appointment: {
          include: {
            client: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({ session }, { status: 201 })
  } catch (error) {
    console.error("Create workout session error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create workout session" },
      { status: 500 }
    )
  }
}
