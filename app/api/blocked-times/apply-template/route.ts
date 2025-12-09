import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireWorkspace, requireUserId } from "@/lib/middleware/tenant"

const applyTemplateSchema = z.object({
  templateId: z.string().uuid(),
  startDate: z.string().datetime(),
  weeks: z.number().min(1).max(52),
})

export async function POST(request: Request) {
  try {
    const workspaceId = await requireWorkspace()
    const userId = await requireUserId()

    const body = await request.json()
    const data = applyTemplateSchema.parse(body)

    // Fetch the template
    const template = await prisma.blockTimeTemplate.findFirst({
      where: {
        id: data.templateId,
        workspaceId,
        trainerId: userId,
      },
    })

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      )
    }

    // Parse start date
    const startDate = new Date(data.startDate)
    startDate.setHours(0, 0, 0, 0)

    // Generate blocked time entries for each day in the template
    const blockedTimes: Array<{
      workspaceId: string
      trainerId: string
      startTime: Date
      endTime: Date
      reason: string | null
      isRecurring: boolean
    }> = []

    // Parse template times
    const [startHour, startMin] = template.startTime.split(":").map(Number)
    const [endHour, endMin] = template.endTime.split(":").map(Number)

    for (let week = 0; week < data.weeks; week++) {
      for (const dayOfWeek of template.days) {
        // Calculate the date for this occurrence
        const date = new Date(startDate)

        // Get the day of week for start date
        const startDayOfWeek = startDate.getDay()

        // Calculate days to add
        let daysToAdd = (dayOfWeek - startDayOfWeek + 7) % 7
        daysToAdd += week * 7

        date.setDate(startDate.getDate() + daysToAdd)

        // Skip if date is in the past
        const now = new Date()
        now.setHours(0, 0, 0, 0)
        if (date < now) {
          continue
        }

        // Create start and end times
        const blockStart = new Date(date)
        blockStart.setHours(startHour, startMin, 0, 0)

        const blockEnd = new Date(date)
        blockEnd.setHours(endHour, endMin, 0, 0)

        // Check if there's already a blocked time at this exact time
        const existing = await prisma.blockedTime.findFirst({
          where: {
            workspaceId,
            trainerId: userId,
            startTime: blockStart,
            endTime: blockEnd,
          },
        })

        // Skip if already exists
        if (existing) {
          continue
        }

        blockedTimes.push({
          workspaceId,
          trainerId: userId,
          startTime: blockStart,
          endTime: blockEnd,
          reason: template.reason || template.name,
          isRecurring: false, // Individual instances, not recurring
        })
      }
    }

    // Create all blocked times in a transaction
    if (blockedTimes.length > 0) {
      await prisma.blockedTime.createMany({
        data: blockedTimes,
        skipDuplicates: true,
      })
    }

    return NextResponse.json({
      success: true,
      created: blockedTimes.length,
      message: `Created ${blockedTimes.length} blocked time entries`,
    })
  } catch (error) {
    console.error("Apply template error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to apply template" },
      { status: 500 }
    )
  }
}
