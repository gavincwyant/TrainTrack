import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireWorkspace, requireUserId, isTrainer } from "@/lib/middleware/tenant"
import { CalendarSyncService } from "@/lib/services/calendar-sync"
import { InvoiceService } from "@/lib/services/invoice"

const appointmentSchema = z.object({
  clientId: z.string().uuid().optional(), // Optional for client self-booking
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  groupSessionOverride: z.enum(["ALLOW_ALL", "ALLOW_SPECIFIC", "NO_GROUP"]).nullable().optional(),
})

// Helper to check if a client can book at a time with an existing appointment
async function canClientBookWithAppointment(
  clientProfileId: string,
  existingAppointment: { clientId: string; groupSessionOverride: string | null }
): Promise<boolean> {
  // Get the existing appointment's client profile
  const existingClientProfile = await prisma.clientProfile.findUnique({
    where: { userId: existingAppointment.clientId },
    include: {
      allowedGroupClients: {
        select: { allowedProfileId: true },
      },
    },
  })

  if (!existingClientProfile) {
    return false // No profile = no group sessions allowed
  }

  // Determine effective permission (override takes precedence)
  const effectivePermission = existingAppointment.groupSessionOverride || existingClientProfile.groupSessionPermission

  if (effectivePermission === "ALLOW_ALL_GROUP" || effectivePermission === "ALLOW_ALL") {
    return true
  }

  if (effectivePermission === "ALLOW_SPECIFIC_CLIENTS" || effectivePermission === "ALLOW_SPECIFIC") {
    // Check if the booking client is in the allowed list
    return existingClientProfile.allowedGroupClients.some(
      (agc) => agc.allowedProfileId === clientProfileId
    )
  }

  // NO_GROUP_SESSIONS or NO_GROUP
  return false
}

export async function GET(request: Request) {
  try {
    const workspaceId = await requireWorkspace()
    const userId = await requireUserId()
    const userIsTrainer = await isTrainer()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const checkAvailability = searchParams.get("checkAvailability") === "true"
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // If checkAvailability is true, get all trainer appointments for the client to check group session availability
    if (checkAvailability && !userIsTrainer) {
      // Get the client's profile
      const clientProfile = await prisma.clientProfile.findUnique({
        where: { userId },
      })

      if (!clientProfile) {
        return NextResponse.json(
          { error: "Client profile not found" },
          { status: 404 }
        )
      }

      // Get the trainer for this workspace
      const trainer = await prisma.user.findFirst({
        where: { workspaceId, role: "TRAINER" },
      })

      if (!trainer) {
        return NextResponse.json(
          { error: "Trainer not found" },
          { status: 404 }
        )
      }

      // Build date filter - default to current week if no dates provided
      const now = new Date()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay()) // Sunday
      startOfWeek.setHours(0, 0, 0, 0)

      const dateFilter: Record<string, unknown> = {}
      if (startDate) {
        dateFilter.gte = new Date(startDate)
      } else {
        // Default: start from beginning of current week to show past appointments
        dateFilter.gte = startOfWeek
      }
      if (endDate) {
        dateFilter.lte = new Date(endDate)
      }

      // Get all trainer appointments including completed ones for the current week
      // This shows both available slots and past sessions
      const allTrainerAppointments = await prisma.appointment.findMany({
        where: {
          workspaceId,
          trainerId: trainer.id,
          status: { in: ["SCHEDULED", "RESCHEDULED", "COMPLETED"] },
          startTime: dateFilter,
        },
        include: {
          client: {
            select: {
              id: true,
              fullName: true,
              clientProfile: {
                select: {
                  id: true,
                  groupSessionPermission: true,
                },
              },
            },
          },
        },
        orderBy: { startTime: "asc" },
      })

      // Calculate availability for each appointment
      const appointmentsWithAvailability = await Promise.all(
        allTrainerAppointments.map(async (apt) => {
          const isOwnAppointment = apt.clientId === userId
          let isAvailableForGroupBooking = false
          let displayType: "OWN" | "GROUP_AVAILABLE" | "UNAVAILABLE" = "UNAVAILABLE"

          if (isOwnAppointment) {
            displayType = "OWN"
          } else if (apt.status === "COMPLETED") {
            // Past appointments from other clients are always unavailable (can't book in the past)
            displayType = "UNAVAILABLE"
          } else {
            // Check if current client can book at this time (only for active appointments)
            isAvailableForGroupBooking = await canClientBookWithAppointment(
              clientProfile.id,
              { clientId: apt.clientId, groupSessionOverride: apt.groupSessionOverride }
            )
            displayType = isAvailableForGroupBooking ? "GROUP_AVAILABLE" : "UNAVAILABLE"
          }

          return {
            id: apt.id,
            startTime: apt.startTime,
            endTime: apt.endTime,
            status: apt.status,
            isOwnAppointment,
            isAvailableForGroupBooking,
            displayType,
            // Include client info for own appointments and group available slots
            client: isOwnAppointment ? { id: apt.client.id, fullName: apt.client.fullName } : null,
            // Include the name of the client whose slot is available for group booking
            groupSessionWith: isAvailableForGroupBooking ? apt.client.fullName : null,
          }
        })
      )

      return NextResponse.json({ appointments: appointmentsWithAvailability })
    }

    const where: Record<string, unknown> = {
      workspaceId,
      ...(userIsTrainer ? { trainerId: userId } : { clientId: userId }),
    }

    if (status) {
      where.status = status
    }

    // Auto-complete past scheduled appointments before fetching
    const now = new Date()
    const pastAppointments = await prisma.appointment.findMany({
      where: {
        workspaceId,
        ...(userIsTrainer ? { trainerId: userId } : { clientId: userId }),
        status: {
          in: ["SCHEDULED", "RESCHEDULED"],
        },
        endTime: {
          lt: now,
        },
      },
    })

    // Update past appointments to COMPLETED
    if (pastAppointments.length > 0) {
      await prisma.appointment.updateMany({
        where: {
          id: {
            in: pastAppointments.map((apt) => apt.id),
          },
        },
        data: {
          status: "COMPLETED",
        },
      })

      // Sync to Google Calendar and generate invoices in background
      const syncService = new CalendarSyncService()
      const invoiceService = new InvoiceService()
      for (const appointment of pastAppointments) {
        syncService.syncAppointmentToGoogle(appointment.id).catch((error) => {
          console.error("Background sync failed:", error)
        })
        invoiceService.generatePerSessionInvoice(appointment.id).catch((error) => {
          console.error("Background invoice generation failed:", error)
        })
      }
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
        workoutSession: true,
      },
      orderBy: {
        startTime: "asc",
      },
    })

    // Filter out appointments that already have workout sessions if status=COMPLETED
    const filteredAppointments = status === "COMPLETED"
      ? appointments.filter(apt => !apt.workoutSession)
      : appointments

    // Get trainer settings to determine group session matching logic
    const trainerId = userIsTrainer ? userId : filteredAppointments[0]?.trainer?.id
    let matchingLogic = "EXACT_MATCH"

    if (trainerId) {
      const trainerSettings = await prisma.trainerSettings.findUnique({
        where: { trainerId },
        select: { groupSessionMatchingLogic: true },
      })
      matchingLogic = trainerSettings?.groupSessionMatchingLogic || "EXACT_MATCH"
    }

    // Calculate isGroupSession for each appointment
    const appointmentsWithGroupInfo = await Promise.all(
      filteredAppointments.map(async (apt) => {
        // Build overlap condition based on matching logic
        let overlapCondition: Record<string, unknown>

        switch (matchingLogic) {
          case "START_MATCH":
            overlapCondition = { startTime: apt.startTime }
            break
          case "END_MATCH":
            overlapCondition = { endTime: apt.endTime }
            break
          case "ANY_OVERLAP":
            overlapCondition = {
              AND: [
                { startTime: { lt: apt.endTime } },
                { endTime: { gt: apt.startTime } },
              ],
            }
            break
          case "EXACT_MATCH":
          default:
            overlapCondition = {
              startTime: apt.startTime,
              endTime: apt.endTime,
            }
        }

        const overlappingCount = await prisma.appointment.count({
          where: {
            trainerId: apt.trainerId,
            workspaceId: apt.workspaceId,
            status: { in: ["SCHEDULED", "COMPLETED"] },
            id: { not: apt.id },
            ...overlapCondition,
          },
        })

        return {
          ...apt,
          isGroupSession: overlappingCount > 0,
        }
      })
    )

    return NextResponse.json({ appointments: appointmentsWithGroupInfo })
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
    // Note: Trainers can book overlapping appointments (they bypass group session restrictions)
    if (!userIsTrainer) {
      // Get the client's profile for permission checking
      const clientProfile = await prisma.clientProfile.findUnique({
        where: { userId },
      })

      if (!clientProfile) {
        return NextResponse.json(
          { error: "Client profile not found" },
          { status: 404 }
        )
      }

      // Get the trainer ID for this workspace
      const trainer = await prisma.user.findFirst({
        where: { workspaceId, role: "TRAINER" },
      })

      if (!trainer) {
        return NextResponse.json(
          { error: "Trainer not found" },
          { status: 404 }
        )
      }

      // Find all overlapping appointments for this trainer
      const overlappingAppointments = await prisma.appointment.findMany({
        where: {
          workspaceId,
          trainerId: trainer.id,
          status: { in: ["SCHEDULED", "RESCHEDULED"] },
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

      // Check each overlapping appointment for group session permission
      for (const apt of overlappingAppointments) {
        const canBook = await canClientBookWithAppointment(
          clientProfile.id,
          { clientId: apt.clientId, groupSessionOverride: apt.groupSessionOverride }
        )

        if (!canBook) {
          return NextResponse.json(
            { error: "This time slot is not available for booking" },
            { status: 400 }
          )
        }
      }
    }

    // Determine clientId and trainerId based on who's booking
    let finalClientId: string
    let finalTrainerId: string

    if (userIsTrainer) {
      // Trainer is booking for a client
      if (!data.clientId) {
        return NextResponse.json(
          { error: "Client ID is required when trainer is booking" },
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

      finalClientId = data.clientId
      finalTrainerId = userId
    } else {
      // Client is booking for themselves
      finalClientId = userId

      // Get the client's profile to find their trainer
      const clientProfile = await prisma.clientProfile.findFirst({
        where: {
          userId: userId,
          workspaceId,
        },
      })

      if (!clientProfile) {
        return NextResponse.json(
          { error: "Client profile not found" },
          { status: 404 }
        )
      }

      // Get the trainer for this workspace
      const trainer = await prisma.user.findFirst({
        where: {
          workspaceId,
          role: "TRAINER",
        },
      })

      if (!trainer) {
        return NextResponse.json(
          { error: "Trainer not found for this workspace" },
          { status: 404 }
        )
      }

      finalTrainerId = trainer.id
    }

    const appointment = await prisma.appointment.create({
      data: {
        workspaceId,
        trainerId: finalTrainerId,
        clientId: finalClientId,
        startTime,
        endTime,
        status: "SCHEDULED",
        groupSessionOverride: data.groupSessionOverride ?? null,
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
    syncService.syncAppointmentToGoogle(appointment.id).catch((error) => {
      console.error("Background sync failed:", error)
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
