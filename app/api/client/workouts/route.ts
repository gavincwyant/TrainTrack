import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireWorkspace, requireUserId, isClient } from "@/lib/middleware/tenant"

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await requireWorkspace()
    const userId = await requireUserId()

    // Verify user is a client
    if (!(await isClient())) {
      return NextResponse.json(
        { error: "Unauthorized - client access only" },
        { status: 403 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = parseInt(searchParams.get("offset") || "0")

    // Get workout sessions for this client
    const [workouts, total] = await Promise.all([
      prisma.workoutSession.findMany({
        where: {
          clientId: userId,
          workspaceId,
        },
        include: {
          trainer: {
            select: {
              id: true,
              fullName: true,
            },
          },
          appointment: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              status: true,
            },
          },
        },
        orderBy: { date: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.workoutSession.count({
        where: {
          clientId: userId,
          workspaceId,
        },
      }),
    ])

    // Calculate summary stats
    const stats = await prisma.workoutSession.aggregate({
      where: {
        clientId: userId,
        workspaceId,
      },
      _count: true,
      _max: {
        date: true,
      },
      _min: {
        date: true,
      },
    })

    return NextResponse.json({
      workouts: workouts.map((workout) => ({
        id: workout.id,
        date: workout.date,
        notes: workout.notes,
        exercises: workout.exercises as Array<{
          name: string
          sets?: number
          reps?: number
          weight?: number
          notes?: string
        }> | null,
        customMetrics: workout.customMetrics,
        trainer: workout.trainer,
        appointment: workout.appointment,
        createdAt: workout.createdAt,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + workouts.length < total,
      },
      summary: {
        totalWorkouts: stats._count,
        firstWorkout: stats._min.date,
        lastWorkout: stats._max.date,
      },
    })
  } catch (error) {
    console.error("Get client workouts error:", error)

    if ((error as Error).message?.includes("No workspace")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: "Failed to fetch workouts" },
      { status: 500 }
    )
  }
}
