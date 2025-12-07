import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireWorkspace, requireUserId } from "@/lib/middleware/tenant"

const settingsSchema = z.object({
  dayStartTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  dayEndTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  timezone: z.string().optional(),
  autoSyncEnabled: z.boolean().optional(),
  autoInvoicingEnabled: z.boolean().optional(),
  monthlyInvoiceDay: z.number().int().min(1).max(31).optional(),
  defaultInvoiceDueDays: z.number().int().min(0).optional(),
})

export async function GET() {
  try {
    const workspaceId = await requireWorkspace()
    const userId = await requireUserId()

    let settings = await prisma.trainerSettings.findUnique({
      where: {
        trainerId: userId,
      },
    })

    // Create default settings if they don't exist
    if (!settings) {
      settings = await prisma.trainerSettings.create({
        data: {
          workspaceId,
          trainerId: userId,
          dayStartTime: "06:00",
          dayEndTime: "22:00",
          timezone: "America/New_York",
        },
      })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Get trainer settings error:", error)

    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const workspaceId = await requireWorkspace()
    const userId = await requireUserId()

    const body = await request.json()
    const data = settingsSchema.parse(body)

    // Validate that end time is after start time (if both are provided)
    if (data.dayStartTime && data.dayEndTime && data.dayEndTime <= data.dayStartTime) {
      return NextResponse.json(
        { error: "Day end time must be after start time" },
        { status: 400 }
      )
    }

    // Build update data object
    const updateData: Record<string, unknown> = {}
    if (data.dayStartTime !== undefined) updateData.dayStartTime = data.dayStartTime
    if (data.dayEndTime !== undefined) updateData.dayEndTime = data.dayEndTime
    if (data.timezone !== undefined) updateData.timezone = data.timezone
    if (data.autoSyncEnabled !== undefined) updateData.autoSyncEnabled = data.autoSyncEnabled
    if (data.autoInvoicingEnabled !== undefined) updateData.autoInvoicingEnabled = data.autoInvoicingEnabled
    if (data.monthlyInvoiceDay !== undefined) updateData.monthlyInvoiceDay = data.monthlyInvoiceDay
    if (data.defaultInvoiceDueDays !== undefined) updateData.defaultInvoiceDueDays = data.defaultInvoiceDueDays

    const settings = await prisma.trainerSettings.upsert({
      where: {
        trainerId: userId,
      },
      update: updateData,
      create: {
        workspaceId,
        trainerId: userId,
        dayStartTime: data.dayStartTime || "06:00",
        dayEndTime: data.dayEndTime || "22:00",
        timezone: data.timezone || "America/New_York",
        autoSyncEnabled: data.autoSyncEnabled || false,
      },
    })

    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Update trainer settings error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    )
  }
}
