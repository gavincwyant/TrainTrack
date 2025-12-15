import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireWorkspace, requireUserId } from "@/lib/middleware/tenant"

const updateInvoiceSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  notes: z.string().optional(),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await requireWorkspace()
    const userId = await requireUserId()
    const { id } = await params

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            clientProfile: {
              select: {
                prepaidBalance: true,
              },
            },
          },
        },
        trainer: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        lineItems: {
          include: {
            appointment: {
              select: {
                id: true,
                startTime: true,
                endTime: true,
              },
            },
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      )
    }

    // Check access
    if (invoice.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    // Must be the trainer for this invoice
    if (invoice.trainerId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error("Get invoice error:", error)
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await requireWorkspace()
    const userId = await requireUserId()
    const { id } = await params

    const body = await request.json()
    const data = updateInvoiceSchema.parse(body)

    // Verify invoice exists and user has access
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            clientProfile: true,
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      )
    }

    if (invoice.workspaceId !== workspaceId || invoice.trainerId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    // Check if this is a prepaid top-up invoice being marked as PAID
    // Use flag instead of string matching; support legacy notes for backward compatibility
    const isPrepaidTopUp = invoice.isPrepaidTopUp || invoice.notes?.includes("Prepaid balance replenishment")
    const isBeingMarkedPaid = data.status === "PAID" && invoice.status !== "PAID"

    // If marking a prepaid top-up invoice as paid, update the client's balance
    if (isPrepaidTopUp && isBeingMarkedPaid && invoice.client.clientProfile) {
      const clientProfile = invoice.client.clientProfile
      const currentBalance = clientProfile.prepaidBalance?.toNumber() || 0
      const invoiceAmount = invoice.amount.toNumber()
      const newBalance = currentBalance + invoiceAmount

      // Update balance and create transaction in a single transaction
      await prisma.$transaction([
        prisma.clientProfile.update({
          where: { id: clientProfile.id },
          data: { prepaidBalance: newBalance },
        }),
        prisma.prepaidTransaction.create({
          data: {
            clientProfileId: clientProfile.id,
            type: "CREDIT",
            amount: invoiceAmount,
            balanceAfter: newBalance,
            description: "Prepaid balance replenishment - invoice paid",
          },
        }),
      ])

      console.log(`✅ Updated prepaid balance for client ${invoice.clientId}: $${currentBalance} → $${newBalance}`)
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
        // Set paidAt timestamp when marking as PAID
        ...(data.status === "PAID" && { paidAt: new Date() }),
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
        lineItems: {
          include: {
            appointment: {
              select: {
                id: true,
                startTime: true,
                endTime: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({ invoice: updated })
  } catch (error) {
    console.error("Update invoice error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    )
  }
}
