import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireWorkspace, requireUserId, isTrainer } from "@/lib/middleware/tenant"

const settingsSchema = z.object({
  dayStartTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  dayEndTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  timezone: z.string().optional(),
  autoSyncEnabled: z.boolean().optional(),
  autoInvoicingEnabled: z.boolean().optional(),
  monthlyInvoiceDay: z.number().int().min(1).max(31).optional(),
  defaultInvoiceDueDays: z.number().int().min(0).optional(),
  // Pricing settings
  defaultIndividualSessionRate: z.number().min(0).optional(),
  defaultGroupSessionRate: z.number().min(0).optional(),
  // Group session settings
  groupSessionMatchingLogic: z.enum(["EXACT_MATCH", "START_MATCH", "END_MATCH", "ANY_OVERLAP"]).optional(),
  // Client sync settings
  autoClientSyncEnabled: z.boolean().optional(),
  clientSyncLookbackDays: z.number().int().min(1).max(365).optional(),
  hasCompletedInitialClientSync: z.boolean().optional(),
  // UI preferences
  darkModeEnabled: z.boolean().optional(),
  // Notification settings - Appointment Reminders
  appointmentReminderEnabled: z.boolean().optional(),
  appointmentReminderHours: z.array(z.number().int().positive()).optional(),
  // Notification settings - Invoice Reminders
  invoiceReminderBeforeDue: z.boolean().optional(),
  invoiceReminderBeforeDueDays: z.number().int().min(1).max(14).optional(),
  invoiceReminderOnDue: z.boolean().optional(),
  invoiceReminderOverdue: z.boolean().optional(),
  invoiceReminderOverdueDays: z.array(z.number().int().positive()).optional(),
})

export async function GET() {
  try {
    const workspaceId = await requireWorkspace()
    const userId = await requireUserId()
    const userIsTrainer = await isTrainer()

    let trainerId = userId

    // If user is a client, find their trainer's settings
    if (!userIsTrainer) {
      // First try to get trainer from ClientTrainer relationship
      const clientTrainer = await prisma.clientTrainer.findFirst({
        where: {
          clientId: userId,
          workspaceId,
          isActive: true,
        },
        select: { trainerId: true },
      })

      if (clientTrainer) {
        trainerId = clientTrainer.trainerId
      } else {
        // Fallback: get any trainer in the workspace
        const trainer = await prisma.user.findFirst({
          where: {
            workspaceId,
            role: "TRAINER",
          },
          select: { id: true },
        })

        if (trainer) {
          trainerId = trainer.id
        }
      }
    }

    let settings = await prisma.trainerSettings.findUnique({
      where: {
        trainerId,
      },
    })

    // Create default settings if they don't exist (only for trainers)
    if (!settings && userIsTrainer) {
      settings = await prisma.trainerSettings.create({
        data: {
          workspaceId,
          trainerId,
          dayStartTime: "06:00",
          dayEndTime: "22:00",
          timezone: "America/New_York",
        },
      })
    }

    // Return default values if no settings found (for clients whose trainer has no settings)
    if (!settings) {
      return NextResponse.json({
        settings: {
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
    if (data.defaultIndividualSessionRate !== undefined) updateData.defaultIndividualSessionRate = data.defaultIndividualSessionRate
    if (data.defaultGroupSessionRate !== undefined) updateData.defaultGroupSessionRate = data.defaultGroupSessionRate
    if (data.groupSessionMatchingLogic !== undefined) updateData.groupSessionMatchingLogic = data.groupSessionMatchingLogic
    if (data.autoClientSyncEnabled !== undefined) updateData.autoClientSyncEnabled = data.autoClientSyncEnabled
    if (data.clientSyncLookbackDays !== undefined) updateData.clientSyncLookbackDays = data.clientSyncLookbackDays
    if (data.hasCompletedInitialClientSync !== undefined) updateData.hasCompletedInitialClientSync = data.hasCompletedInitialClientSync
    if (data.darkModeEnabled !== undefined) updateData.darkModeEnabled = data.darkModeEnabled
    // Notification settings
    if (data.appointmentReminderEnabled !== undefined) updateData.appointmentReminderEnabled = data.appointmentReminderEnabled
    if (data.appointmentReminderHours !== undefined) updateData.appointmentReminderHours = data.appointmentReminderHours
    if (data.invoiceReminderBeforeDue !== undefined) updateData.invoiceReminderBeforeDue = data.invoiceReminderBeforeDue
    if (data.invoiceReminderBeforeDueDays !== undefined) updateData.invoiceReminderBeforeDueDays = data.invoiceReminderBeforeDueDays
    if (data.invoiceReminderOnDue !== undefined) updateData.invoiceReminderOnDue = data.invoiceReminderOnDue
    if (data.invoiceReminderOverdue !== undefined) updateData.invoiceReminderOverdue = data.invoiceReminderOverdue
    if (data.invoiceReminderOverdueDays !== undefined) updateData.invoiceReminderOverdueDays = data.invoiceReminderOverdueDays

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
