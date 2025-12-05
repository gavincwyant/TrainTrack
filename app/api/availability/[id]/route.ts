import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireWorkspace, requireUserId } from "@/lib/middleware/tenant"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await requireWorkspace()
    const userId = await requireUserId()
    const { id } = await params

    // Verify ownership before deleting
    const availability = await prisma.availabilityBlock.findUnique({
      where: { id },
    })

    if (!availability) {
      return NextResponse.json(
        { error: "Availability block not found" },
        { status: 404 }
      )
    }

    if (availability.trainerId !== userId || availability.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    await prisma.availabilityBlock.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete availability error:", error)

    return NextResponse.json(
      { error: "Failed to delete availability" },
      { status: 500 }
    )
  }
}
