import { NextResponse } from "next/server"
import { requireWorkspace, requireUserId } from "@/lib/middleware/tenant"
import { prisma } from "@/lib/db"

/**
 * GET /api/pending-client-profiles
 *
 * List pending client profiles for the trainer
 * Optional query params:
 * - status: filter by status (pending, approved, rejected, duplicate)
 */
export async function GET(request: Request) {
  try {
    const workspaceId = await requireWorkspace()
    const trainerId = await requireUserId()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "pending"

    const pendingProfiles = await prisma.pendingClientProfile.findMany({
      where: {
        workspaceId,
        trainerId,
        status,
      },
      orderBy: [
        { occurrenceCount: "desc" }, // Higher occurrence count first
        { firstSeenDate: "desc" }, // More recent first
      ],
    })

    return NextResponse.json({ pendingProfiles })
  } catch (error) {
    console.error("Get pending client profiles error:", error)

    return NextResponse.json(
      { error: "Failed to fetch pending client profiles" },
      { status: 500 }
    )
  }
}
