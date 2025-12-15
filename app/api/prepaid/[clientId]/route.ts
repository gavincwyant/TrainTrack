import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireWorkspace, requireUserId } from "@/lib/middleware/tenant"
import { PrepaidService } from "@/lib/services/prepaid"
import { z } from "zod"

const addCreditSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  notes: z.string().optional(),
})

/**
 * GET /api/prepaid/[clientId]
 * Get prepaid details for a specific client
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const workspaceId = await requireWorkspace()
    const { clientId } = await params

    // Get client with profile
    const client = await prisma.user.findUnique({
      where: { id: clientId, workspaceId },
      include: {
        clientProfile: true,
      },
    })

    if (!client || !client.clientProfile) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    const profile = client.clientProfile

    // Get recent transactions
    const prepaidService = new PrepaidService()
    const { transactions } = await prepaidService.getTransactions(profile.id, {
      limit: 10,
    })

    // Get next scheduled session cost
    const trainerId = await requireUserId()
    const trainerSettings = await prisma.trainerSettings.findUnique({
      where: { trainerId },
    })

    // Find next scheduled appointment
    const nextAppointment = await prisma.appointment.findFirst({
      where: {
        clientId,
        trainerId,
        status: "SCHEDULED",
        startTime: { gt: new Date() },
      },
      orderBy: { startTime: "asc" },
    })

    return NextResponse.json({
      client: {
        id: client.id,
        fullName: client.fullName,
        email: client.email,
      },
      prepaid: {
        currentBalance: profile.prepaidBalance?.toString() || "0",
        targetBalance: profile.prepaidTargetBalance?.toString() || "0",
        billingFrequency: profile.billingFrequency,
      },
      nextSession: nextAppointment
        ? {
            id: nextAppointment.id,
            startTime: nextAppointment.startTime,
            estimatedCost: profile.sessionRate.toString(), // Simplified - could calculate group rate
          }
        : null,
      recentTransactions: transactions,
    })
  } catch (error) {
    console.error("Error fetching client prepaid details:", error)
    return NextResponse.json(
      { error: "Failed to fetch client prepaid details" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/prepaid/[clientId]
 * Add credit to a client's prepaid balance
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const workspaceId = await requireWorkspace()
    const { clientId } = await params

    // Verify client belongs to workspace
    const client = await prisma.user.findUnique({
      where: { id: clientId, workspaceId },
      include: { clientProfile: true },
    })

    if (!client || !client.clientProfile) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = addCreditSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      )
    }

    const { amount, notes } = validation.data

    // Add credit
    const prepaidService = new PrepaidService()
    const result = await prepaidService.addCredit(clientId, amount, notes)

    return NextResponse.json({
      success: true,
      newBalance: result.newBalance.toString(),
      transactionId: result.transaction.id,
    })
  } catch (error) {
    console.error("Error adding prepaid credit:", error)
    return NextResponse.json(
      { error: "Failed to add prepaid credit" },
      { status: 500 }
    )
  }
}
