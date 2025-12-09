import { NextResponse } from "next/server"
import { requireSystemAdmin } from "@/lib/middleware/tenant"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    await requireSystemAdmin()

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - 7)

    const [
      totalTrainers,
      newTrainersThisMonth,
      newTrainersThisWeek,
      totalClients,
      totalWorkspaces,
      totalRevenue
    ] = await Promise.all([
      // Total trainers
      prisma.user.count({
        where: { role: "TRAINER" }
      }),

      // New trainers this month
      prisma.user.count({
        where: {
          role: "TRAINER",
          createdAt: { gte: startOfMonth }
        }
      }),

      // New trainers this week
      prisma.user.count({
        where: {
          role: "TRAINER",
          createdAt: { gte: startOfWeek }
        }
      }),

      // Total clients across all workspaces
      prisma.user.count({
        where: { role: "CLIENT" }
      }),

      // Total workspaces
      prisma.workspace.count(),

      // Total revenue from paid invoices
      prisma.invoice.aggregate({
        where: { status: "PAID" },
        _sum: { amount: true }
      })
    ])

    return NextResponse.json({
      totalTrainers,
      newTrainersThisMonth,
      newTrainersThisWeek,
      totalClients,
      totalWorkspaces,
      totalRevenue: totalRevenue._sum.amount || 0
    })
  } catch (error) {
    console.error("Admin stats error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch stats" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    )
  }
}
