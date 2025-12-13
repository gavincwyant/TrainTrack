import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireWorkspace, requireUserId } from "@/lib/middleware/tenant"
import { Prisma } from "@prisma/client"

type GroupSessionMatchingLogic = "EXACT_MATCH" | "START_MATCH" | "END_MATCH" | "ANY_OVERLAP"

/**
 * Check if an appointment is part of a group session
 */
async function getGroupSessionInfo(
  appointment: {
    id: string
    trainerId: string
    workspaceId: string
    startTime: Date
    endTime: Date
  },
  matchingLogic: GroupSessionMatchingLogic
): Promise<{ isGroupSession: boolean; participantCount: number }> {
  let overlapCondition: Prisma.AppointmentWhereInput

  switch (matchingLogic) {
    case "START_MATCH":
      overlapCondition = { startTime: appointment.startTime }
      break
    case "END_MATCH":
      overlapCondition = { endTime: appointment.endTime }
      break
    case "ANY_OVERLAP":
      overlapCondition = {
        AND: [
          { startTime: { lt: appointment.endTime } },
          { endTime: { gt: appointment.startTime } },
        ],
      }
      break
    case "EXACT_MATCH":
    default:
      overlapCondition = {
        startTime: appointment.startTime,
        endTime: appointment.endTime,
      }
  }

  const overlappingAppointments = await prisma.appointment.findMany({
    where: {
      trainerId: appointment.trainerId,
      workspaceId: appointment.workspaceId,
      status: { in: ["SCHEDULED", "COMPLETED"] },
      id: { not: appointment.id },
      ...overlapCondition,
    },
  })

  const participantCount = overlappingAppointments.length + 1
  return {
    isGroupSession: participantCount > 1,
    participantCount,
  }
}

export async function GET() {
  try {
    const workspaceId = await requireWorkspace()
    const trainerId = await requireUserId()

    // Get trainer settings
    const trainerSettings = await prisma.trainerSettings.findUnique({
      where: { trainerId },
    })

    const matchingLogic = (trainerSettings?.groupSessionMatchingLogic || "EXACT_MATCH") as GroupSessionMatchingLogic

    // Get all clients with monthly billing
    const monthlyClients = await prisma.user.findMany({
      where: {
        workspaceId,
        role: "CLIENT",
        clientProfile: {
          billingFrequency: "MONTHLY",
        },
      },
      include: {
        clientProfile: true,
      },
      orderBy: {
        fullName: "asc",
      },
    })

    // Calculate current month range
    const now = new Date()
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDayThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    // Build the preview data for each client
    const clientPreviews = await Promise.all(
      monthlyClients.map(async (client) => {
        if (!client.clientProfile) return null

        // Get completed appointments this month (that haven't been invoiced yet)
        const appointments = await prisma.appointment.findMany({
          where: {
            clientId: client.id,
            trainerId,
            status: "COMPLETED",
            startTime: {
              gte: firstDayThisMonth,
              lte: lastDayThisMonth,
            },
            // Exclude appointments that already have line items (already invoiced)
            invoiceLineItems: {
              none: {},
            },
          },
          orderBy: {
            startTime: "asc",
          },
        })

        // Get scheduled appointments for the rest of this month
        const scheduledAppointments = await prisma.appointment.findMany({
          where: {
            clientId: client.id,
            trainerId,
            status: "SCHEDULED",
            startTime: {
              gte: now,
              lte: lastDayThisMonth,
            },
          },
          orderBy: {
            startTime: "asc",
          },
        })

        // Calculate totals for completed sessions
        let completedTotal = new Prisma.Decimal(0)
        let completedGroupCount = 0
        let completedIndividualCount = 0

        const sessionDetails = await Promise.all(
          appointments.map(async (apt) => {
            const { isGroupSession } = await getGroupSessionInfo(apt, matchingLogic)

            // Determine rate
            let rate: Prisma.Decimal
            if (isGroupSession) {
              rate = client.clientProfile!.groupSessionRate
                ? new Prisma.Decimal(client.clientProfile!.groupSessionRate)
                : trainerSettings?.defaultGroupSessionRate
                  ? new Prisma.Decimal(trainerSettings.defaultGroupSessionRate)
                  : new Prisma.Decimal(client.clientProfile!.sessionRate)
            } else {
              rate = new Prisma.Decimal(client.clientProfile!.sessionRate)
            }

            completedTotal = completedTotal.add(rate)
            if (isGroupSession) {
              completedGroupCount++
            } else {
              completedIndividualCount++
            }

            return {
              id: apt.id,
              date: apt.startTime,
              isGroupSession,
              rate: Number(rate),
            }
          })
        )

        // Calculate projected total (completed + scheduled)
        let projectedTotal = new Prisma.Decimal(completedTotal)
        let scheduledGroupCount = 0
        let scheduledIndividualCount = 0

        for (const apt of scheduledAppointments) {
          const { isGroupSession } = await getGroupSessionInfo(apt, matchingLogic)

          let rate: Prisma.Decimal
          if (isGroupSession) {
            rate = client.clientProfile!.groupSessionRate
              ? new Prisma.Decimal(client.clientProfile!.groupSessionRate)
              : trainerSettings?.defaultGroupSessionRate
                ? new Prisma.Decimal(trainerSettings.defaultGroupSessionRate)
                : new Prisma.Decimal(client.clientProfile!.sessionRate)
          } else {
            rate = new Prisma.Decimal(client.clientProfile!.sessionRate)
          }

          projectedTotal = projectedTotal.add(rate)
          if (isGroupSession) {
            scheduledGroupCount++
          } else {
            scheduledIndividualCount++
          }
        }

        return {
          client: {
            id: client.id,
            fullName: client.fullName,
            email: client.email,
          },
          individualRate: Number(client.clientProfile.sessionRate),
          groupRate: client.clientProfile.groupSessionRate
            ? Number(client.clientProfile.groupSessionRate)
            : trainerSettings?.defaultGroupSessionRate
              ? Number(trainerSettings.defaultGroupSessionRate)
              : null,
          autoInvoiceEnabled: client.clientProfile.autoInvoiceEnabled,
          completed: {
            sessions: sessionDetails,
            groupCount: completedGroupCount,
            individualCount: completedIndividualCount,
            total: Number(completedTotal),
          },
          scheduled: {
            count: scheduledAppointments.length,
            groupCount: scheduledGroupCount,
            individualCount: scheduledIndividualCount,
          },
          projectedTotal: Number(projectedTotal),
        }
      })
    )

    // Filter out null entries and sort by projected total descending
    const validPreviews = clientPreviews
      .filter((preview): preview is NonNullable<typeof preview> => preview !== null)
      .sort((a, b) => b.projectedTotal - a.projectedTotal)

    // Calculate grand totals
    const grandTotal = validPreviews.reduce((sum, p) => sum + p.completed.total, 0)
    const grandProjectedTotal = validPreviews.reduce((sum, p) => sum + p.projectedTotal, 0)

    return NextResponse.json({
      billingPeriod: {
        start: firstDayThisMonth.toISOString(),
        end: lastDayThisMonth.toISOString(),
        month: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      },
      monthlyInvoiceDay: trainerSettings?.monthlyInvoiceDay || 1,
      clients: validPreviews,
      totals: {
        completedTotal: grandTotal,
        projectedTotal: grandProjectedTotal,
        clientCount: validPreviews.length,
      },
    })
  } catch (error) {
    console.error("Error fetching monthly billing preview:", error)
    return NextResponse.json(
      { error: "Failed to fetch monthly billing preview" },
      { status: 500 }
    )
  }
}
