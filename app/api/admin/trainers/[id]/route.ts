import { NextResponse } from "next/server"
import { requireSystemAdmin } from "@/lib/middleware/tenant"
import { prisma } from "@/lib/db"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSystemAdmin()

    const { id } = await params

    const trainer = await prisma.user.findUnique({
      where: {
        id,
        role: "TRAINER"
      },
      include: {
        workspace: true,
        trainerSettings: {
          select: {
            googleCalendarConnected: true,
            lastSyncedAt: true
          }
        }
      }
    })

    if (!trainer || !trainer.workspace) {
      return NextResponse.json(
        { error: "Trainer not found" },
        { status: 404 }
      )
    }

    // Get workspace stats
    const [clients, pendingProfiles, appointments, invoices] = await Promise.all([
      // Approved clients
      prisma.user.findMany({
        where: {
          workspaceId: trainer.workspace.id,
          role: "CLIENT"
        },
        include: {
          clientProfile: {
            select: {
              sessionRate: true,
              billingFrequency: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      }),

      // Pending client profiles
      prisma.pendingClientProfile.findMany({
        where: {
          workspaceId: trainer.workspace.id
        },
        orderBy: { createdAt: "desc" }
      }),

      // Appointment stats
      prisma.appointment.groupBy({
        by: ["status"],
        where: { workspaceId: trainer.workspace.id },
        _count: true
      }),

      // Revenue stats
      prisma.invoice.aggregate({
        where: {
          workspaceId: trainer.workspace.id,
          status: "PAID"
        },
        _sum: { amount: true }
      })
    ])

    const stats = {
      totalClients: clients.length,
      pendingClients: pendingProfiles.length,
      totalAppointments: appointments.reduce((sum, g) => sum + g._count, 0),
      completedAppointments: appointments.find(g => g.status === "COMPLETED")?._count || 0,
      totalRevenue: invoices._sum.amount || 0
    }

    return NextResponse.json({
      trainer,
      stats,
      clients,
      pendingProfiles
    })
  } catch (error) {
    console.error("Admin trainer detail error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch trainer details" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    )
  }
}
