import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireWorkspace, requireUserId } from "@/lib/middleware/tenant"

const updateInvoiceSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE"]).optional(),
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

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
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
