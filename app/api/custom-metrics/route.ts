import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireWorkspace } from "@/lib/middleware/tenant"

const metricSchema = z.object({
  name: z.string().min(1, "Name is required"),
  unit: z.string().optional(),
  dataType: z.enum(["NUMBER", "TEXT", "BOOLEAN"]),
})

export async function GET() {
  try {
    const workspaceId = await requireWorkspace()

    const metrics = await prisma.customMetricDefinition.findMany({
      where: {
        workspaceId,
      },
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json({ metrics })
  } catch (error) {
    console.error("Get custom metrics error:", error)

    return NextResponse.json(
      { error: "Failed to fetch custom metrics" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const workspaceId = await requireWorkspace()

    const body = await request.json()
    const data = metricSchema.parse(body)

    const metric = await prisma.customMetricDefinition.create({
      data: {
        workspaceId,
        name: data.name,
        unit: data.unit,
        dataType: data.dataType,
      },
    })

    return NextResponse.json({ metric }, { status: 201 })
  } catch (error) {
    console.error("Create custom metric error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create custom metric" },
      { status: 500 }
    )
  }
}
