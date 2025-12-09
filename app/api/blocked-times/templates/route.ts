import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireWorkspace, requireUserId } from "@/lib/middleware/tenant"

const templateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  icon: z.string().default("💼"),
  days: z.array(z.number().min(0).max(6)).min(1, "At least one day is required"),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  reason: z.string().optional(),
  recurrence: z.enum(["one-time", "weekly", "custom"]).default("weekly"),
})

const updateTemplateSchema = templateSchema.partial().extend({
  id: z.string().uuid(),
})

const deleteTemplateSchema = z.object({
  id: z.string().uuid(),
})

// GET - Fetch all templates for the trainer
export async function GET() {
  try {
    const workspaceId = await requireWorkspace()
    const userId = await requireUserId()

    const templates = await prisma.blockTimeTemplate.findMany({
      where: {
        workspaceId,
        trainerId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({ templates })
  } catch (error) {
    console.error("Get templates error:", error)

    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    )
  }
}

// POST - Create new template
export async function POST(request: Request) {
  try {
    const workspaceId = await requireWorkspace()
    const userId = await requireUserId()

    const body = await request.json()
    const data = templateSchema.parse(body)

    // Validate time range
    const [startHour, startMin] = data.startTime.split(":").map(Number)
    const [endHour, endMin] = data.endTime.split(":").map(Number)
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin

    if (endMinutes <= startMinutes) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      )
    }

    const template = await prisma.blockTimeTemplate.create({
      data: {
        workspaceId,
        trainerId: userId,
        name: data.name,
        icon: data.icon,
        days: data.days,
        startTime: data.startTime,
        endTime: data.endTime,
        reason: data.reason,
        recurrence: data.recurrence,
      },
    })

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error("Create template error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    )
  }
}

// PATCH - Update template
export async function PATCH(request: Request) {
  try {
    const workspaceId = await requireWorkspace()
    const userId = await requireUserId()

    const body = await request.json()
    const data = updateTemplateSchema.parse(body)

    // Verify template exists and belongs to user
    const existingTemplate = await prisma.blockTimeTemplate.findFirst({
      where: {
        id: data.id,
        workspaceId,
        trainerId: userId,
      },
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      )
    }

    // Validate time range if both times are provided
    if (data.startTime && data.endTime) {
      const [startHour, startMin] = data.startTime.split(":").map(Number)
      const [endHour, endMin] = data.endTime.split(":").map(Number)
      const startMinutes = startHour * 60 + startMin
      const endMinutes = endHour * 60 + endMin

      if (endMinutes <= startMinutes) {
        return NextResponse.json(
          { error: "End time must be after start time" },
          { status: 400 }
        )
      }
    }

    const { id, ...updateData } = data

    const template = await prisma.blockTimeTemplate.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ template })
  } catch (error) {
    console.error("Update template error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    )
  }
}

// DELETE - Delete template
export async function DELETE(request: Request) {
  try {
    const workspaceId = await requireWorkspace()
    const userId = await requireUserId()

    const body = await request.json()
    const data = deleteTemplateSchema.parse(body)

    // Verify template exists and belongs to user
    const existingTemplate = await prisma.blockTimeTemplate.findFirst({
      where: {
        id: data.id,
        workspaceId,
        trainerId: userId,
      },
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      )
    }

    await prisma.blockTimeTemplate.delete({
      where: { id: data.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete template error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    )
  }
}
