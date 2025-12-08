import { NextResponse } from "next/server"
import { requireWorkspace, requireUserId } from "@/lib/middleware/tenant"
import { prisma } from "@/lib/db"

/**
 * POST /api/pending-client-profiles/[id]/reject
 *
 * Reject pending profile
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await requireWorkspace()
    const trainerId = await requireUserId()
    const { id } = await params

    // Get pending profile
    const profile = await prisma.pendingClientProfile.findUnique({
      where: { id },
    })

    if (!profile) {
      return NextResponse.json(
        { error: "Pending profile not found" },
        { status: 404 }
      )
    }

    if (profile.workspaceId !== workspaceId || profile.trainerId !== trainerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (profile.status !== "pending") {
      return NextResponse.json(
        { error: "Profile already processed" },
        { status: 400 }
      )
    }

    // Update status to rejected
    await prisma.pendingClientProfile.update({
      where: { id },
      data: { status: "rejected" },
    })

    console.log(`🚫 Rejected pending profile: "${profile.extractedName}"`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Reject pending profile error:", error)

    return NextResponse.json(
      { error: "Failed to reject pending profile" },
      { status: 500 }
    )
  }
}
