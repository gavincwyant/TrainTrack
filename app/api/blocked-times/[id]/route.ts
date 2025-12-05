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
    const blockedTime = await prisma.blockedTime.findUnique({
      where: { id },
    })

    if (!blockedTime) {
      return NextResponse.json(
        { error: "Blocked time not found" },
        { status: 404 }
      )
    }

    if (blockedTime.trainerId !== userId || blockedTime.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    await prisma.blockedTime.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete blocked time error:", error)

    return NextResponse.json(
      { error: "Failed to delete blocked time" },
      { status: 500 }
    )
  }
}
