import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireWorkspace } from "@/lib/middleware/tenant"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await requireWorkspace()
    const { id } = await params

    // Verify ownership before deleting
    const metric = await prisma.customMetricDefinition.findUnique({
      where: { id },
    })

    if (!metric) {
      return NextResponse.json(
        { error: "Metric not found" },
        { status: 404 }
      )
    }

    if (metric.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    await prisma.customMetricDefinition.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete custom metric error:", error)

    return NextResponse.json(
      { error: "Failed to delete custom metric" },
      { status: 500 }
    )
  }
}
