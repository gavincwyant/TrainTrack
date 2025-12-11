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

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") // DRAFT, SENT, PAID, OVERDUE, CANCELLED
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    // Build where clause
    const whereClause: Record<string, unknown> = {
      clientId: userId,
      workspaceId,
    }

    if (status) {
      whereClause.status = status
    }

    // Get invoices for this client
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where: whereClause,
        include: {
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
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.invoice.count({ where: whereClause }),
    ])

    // Calculate summary stats
    const stats = await prisma.invoice.groupBy({
      by: ["status"],
      where: {
        clientId: userId,
        workspaceId,
      },
      _sum: {
        amount: true,
      },
      _count: true,
    })

    const summary = {
      total: 0,
      outstanding: 0,
      paid: 0,
      overdue: 0,
    }

    stats.forEach((stat) => {
      const amount = Number(stat._sum.amount || 0)
      summary.total += amount

      if (stat.status === "PAID") {
        summary.paid += amount
      } else if (stat.status === "OVERDUE") {
        summary.overdue += amount
        summary.outstanding += amount
      } else if (stat.status === "SENT" || stat.status === "DRAFT") {
        summary.outstanding += amount
      }
    })

    return NextResponse.json({
      invoices: invoices.map((invoice) => ({
        id: invoice.id,
        amount: Number(invoice.amount),
        dueDate: invoice.dueDate,
        paidAt: invoice.paidAt,
        status: invoice.status,
        paymentMethod: invoice.paymentMethod,
        notes: invoice.notes,
        createdAt: invoice.createdAt,
        trainer: invoice.trainer,
        lineItems: invoice.lineItems.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          total: Number(item.total),
          appointment: item.appointment,
        })),
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + invoices.length < total,
      },
      summary,
    })
  } catch (error) {
    console.error("Get client invoices error:", error)

    if ((error as Error).message?.includes("No workspace")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    )
  }
}
