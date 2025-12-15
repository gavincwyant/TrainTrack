import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireWorkspace, requireUserId, isClient } from "@/lib/middleware/tenant"

const updateSettingsSchema = z.object({
  phone: z.string().optional().nullable(),
  // Group session settings
  groupSessionPermission: z.enum(["NO_GROUP_SESSIONS", "ALLOW_ALL_GROUP", "ALLOW_SPECIFIC_CLIENTS"]).optional(),
  groupSessionDiscoverable: z.boolean().optional(),
  // Notification settings
  smsNotificationsEnabled: z.boolean().optional(),
  emailNotificationsEnabled: z.boolean().optional(),
  appointmentRemindersEnabled: z.boolean().optional(),
  invoiceAlertsEnabled: z.boolean().optional(),
})

export async function GET() {
  try {
    const workspaceId = await requireWorkspace()
    const userId = await requireUserId()

    // Verify user is a client
    if (!(await isClient())) {
      return NextResponse.json(
        { error: "Unauthorized - client access only" },
        { status: 403 }
      )
    }

    // Get client user with profile and trainer info
    const client = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        clientProfile: true,
        clientTrainers: {
          where: { isActive: true },
          include: {
            trainer: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      )
    }

    // Get the primary trainer (first active trainer)
    const primaryTrainer = client.clientTrainers[0]?.trainer

    return NextResponse.json({
      settings: {
        fullName: client.fullName,
        email: client.email,
        phone: client.phone,
        trainerName: primaryTrainer?.fullName || null,
        trainerEmail: primaryTrainer?.email || null,
        billingFrequency: client.clientProfile?.billingFrequency || "PER_SESSION",
        sessionRate: client.clientProfile?.sessionRate
          ? Number(client.clientProfile.sessionRate)
          : null,
        trainers: client.clientTrainers.map((ct) => ({
          id: ct.trainer.id,
          fullName: ct.trainer.fullName,
          email: ct.trainer.email,
        })),
        // Group session settings
        groupSessionPermission: client.clientProfile?.groupSessionPermission || "NO_GROUP_SESSIONS",
        groupSessionDiscoverable: client.clientProfile?.groupSessionDiscoverable || false,
        // Notification settings
        smsNotificationsEnabled: client.clientProfile?.smsNotificationsEnabled ?? false,
        emailNotificationsEnabled: client.clientProfile?.emailNotificationsEnabled ?? true,
        appointmentRemindersEnabled: client.clientProfile?.appointmentRemindersEnabled ?? true,
        invoiceAlertsEnabled: client.clientProfile?.invoiceAlertsEnabled ?? true,
      },
    })
  } catch (error) {
    console.error("Get client settings error:", error)

    if ((error as Error).message?.includes("No workspace")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await requireUserId()

    // Verify user is a client
    if (!(await isClient())) {
      return NextResponse.json(
        { error: "Unauthorized - client access only" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = updateSettingsSchema.parse(body)

    // Update user phone if provided
    if (data.phone !== undefined) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          phone: data.phone,
        },
      })
    }

    // Update client profile settings
    const profileUpdateData: Record<string, unknown> = {}

    // Group session settings
    if (data.groupSessionPermission !== undefined) {
      profileUpdateData.groupSessionPermission = data.groupSessionPermission
    }
    if (data.groupSessionDiscoverable !== undefined) {
      profileUpdateData.groupSessionDiscoverable = data.groupSessionDiscoverable
    }

    // Notification settings
    if (data.smsNotificationsEnabled !== undefined) {
      profileUpdateData.smsNotificationsEnabled = data.smsNotificationsEnabled
    }
    if (data.emailNotificationsEnabled !== undefined) {
      profileUpdateData.emailNotificationsEnabled = data.emailNotificationsEnabled
    }
    if (data.appointmentRemindersEnabled !== undefined) {
      profileUpdateData.appointmentRemindersEnabled = data.appointmentRemindersEnabled
    }
    if (data.invoiceAlertsEnabled !== undefined) {
      profileUpdateData.invoiceAlertsEnabled = data.invoiceAlertsEnabled
    }

    // Only update if there are profile changes
    if (Object.keys(profileUpdateData).length > 0) {
      await prisma.clientProfile.update({
        where: { userId },
        data: profileUpdateData,
      })
    }

    // Fetch updated data
    const updatedClient = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        clientProfile: true,
      },
    })

    return NextResponse.json({
      settings: {
        fullName: updatedClient?.fullName,
        email: updatedClient?.email,
        phone: updatedClient?.phone,
        groupSessionPermission: updatedClient?.clientProfile?.groupSessionPermission || "NO_GROUP_SESSIONS",
        groupSessionDiscoverable: updatedClient?.clientProfile?.groupSessionDiscoverable || false,
        // Notification settings
        smsNotificationsEnabled: updatedClient?.clientProfile?.smsNotificationsEnabled ?? false,
        emailNotificationsEnabled: updatedClient?.clientProfile?.emailNotificationsEnabled ?? true,
        appointmentRemindersEnabled: updatedClient?.clientProfile?.appointmentRemindersEnabled ?? true,
        invoiceAlertsEnabled: updatedClient?.clientProfile?.invoiceAlertsEnabled ?? true,
      },
    })
  } catch (error) {
    console.error("Update client settings error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.issues },
        { status: 400 }
      )
    }

    if ((error as Error).message?.includes("No workspace")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    )
  }
}
