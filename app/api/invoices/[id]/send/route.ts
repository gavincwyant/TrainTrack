import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireWorkspace, requireUserId } from "@/lib/middleware/tenant"
import { EmailService } from "@/lib/services/email"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await requireWorkspace()
    const userId = await requireUserId()
    const { id } = await params

    // Fetch invoice with all necessary relations
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
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
    if (invoice.workspaceId !== workspaceId || invoice.trainerId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    // Send email
    const emailService = new EmailService()
    try {
      await emailService.sendInvoiceEmail(invoice)

      // Update invoice status to SENT if it was DRAFT
      if (invoice.status === "DRAFT") {
        await prisma.invoice.update({
          where: { id },
          data: { status: "SENT" },
        })
      }

      return NextResponse.json({
        success: true,
        message: "Invoice sent successfully",
      })
    } catch (error) {
      console.error("Failed to send invoice email:", error)
      return NextResponse.json(
        { error: "Failed to send invoice email" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Send invoice error:", error)
    return NextResponse.json(
      { error: "Failed to send invoice" },
      { status: 500 }
    )
  }
}
