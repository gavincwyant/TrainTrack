import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireWorkspace, requireUserId } from "@/lib/middleware/tenant"

export async function GET() {
  try {
    const workspaceId = await requireWorkspace()
    const userId = await requireUserId()

    // Get the client profile with related user and trainer info
    const clientProfile = await prisma.clientProfile.findUnique({
      where: {
        userId,
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            phone: true,
          },
        },
        workspace: {
          select: {
            trainer: {
              select: {
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!clientProfile) {
      return NextResponse.json(
        { error: "Client profile not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      profile: {
        user: clientProfile.user,
        trainer: clientProfile.workspace.trainer,
        billingFrequency: clientProfile.billingFrequency,
        sessionRate: clientProfile.sessionRate,
        notes: clientProfile.notes,
      },
    })
  } catch (error) {
    console.error("Get profile error:", error)

    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    )
  }
}
