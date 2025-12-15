import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireWorkspace, requireUserId } from "@/lib/middleware/tenant"
import { PrepaidService } from "@/lib/services/prepaid"

const voidAndSwitchSchema = z.object({
  newBillingFrequency: z.enum(["PER_SESSION", "MONTHLY"]),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await requireWorkspace()
    const userId = await requireUserId()
    const { id } = await params

    const body = await request.json()
    const data = voidAndSwitchSchema.parse(body)

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

    // Check workspace access
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

    // Call the prepaid service to void and switch
    const prepaidService = new PrepaidService()
    const result = await prepaidService.voidInvoiceAndSwitchBilling(
      id,
      data.newBillingFrequency
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      creditAmount: result.creditAmount,
      newBillingFrequency: result.newBillingFrequency,
      message: result.creditAmount > 0
        ? `Invoice voided. $${result.creditAmount} credit will be applied to future invoices.`
        : `Invoice voided. Billing switched to ${result.newBillingFrequency}.`,
    })
  } catch (error) {
    console.error("Void and switch error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to void invoice and switch billing" },
      { status: 500 }
    )
  }
}
