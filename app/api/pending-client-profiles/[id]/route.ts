import { NextResponse } from "next/server"
import { z } from "zod"
import { requireWorkspace, requireUserId } from "@/lib/middleware/tenant"
import { prisma } from "@/lib/db"

const updatePendingProfileSchema = z.object({
  reviewedName: z.string().optional(),
  reviewedEmail: z.string().email().optional().nullable(),
  reviewedPhone: z.string().optional().nullable(),
  reviewedNotes: z.string().optional().nullable(),
  defaultBillingFrequency: z
    .enum(["PER_SESSION", "MONTHLY"])
    .optional(),
  defaultSessionRate: z.number().optional(),
})

/**
 * PATCH /api/pending-client-profiles/[id]
 *
 * Update pending profile before approval
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await requireWorkspace()
    const trainerId = await requireUserId()
    const { id } = await params

    const body = await request.json()
    const data = updatePendingProfileSchema.parse(body)

    // Verify profile exists and user has access
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
        { error: "Can only update pending profiles" },
        { status: 400 }
      )
    }

    const updated = await prisma.pendingClientProfile.update({
      where: { id },
      data,
    })

    return NextResponse.json({ profile: updated })
  } catch (error) {
    console.error("Update pending profile error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to update pending profile" },
      { status: 500 }
    )
  }
}
