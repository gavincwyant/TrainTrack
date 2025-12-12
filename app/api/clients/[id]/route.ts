import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { requireWorkspace, requireUserId } from "@/lib/middleware/tenant"

const updateClientSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  billingFrequency: z.enum(["PER_SESSION", "MONTHLY"]).optional(),
  sessionRate: z.string().optional(),
  groupSessionRate: z.string().optional().nullable(),
  notes: z.string().optional(),
  autoInvoiceEnabled: z.boolean().optional(),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Find the client
    const client = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        workspaceId: true,
        clientProfile: true,
      },
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // Verify the client belongs to the trainer's workspace
    if (session.user.role === "TRAINER") {
      if (!client.workspaceId) {
        return NextResponse.json({ error: "Client has no workspace" }, { status: 400 })
      }

      const workspace = await prisma.workspace.findUnique({
        where: {
          id: client.workspaceId,
          trainerId: session.user.id,
        },
      })

      if (!workspace) {
        return NextResponse.json(
          { error: "Client not found in your workspace" },
          { status: 403 }
        )
      }
    } else if (session.user.role === "CLIENT" && client.id !== session.user.id) {
      // Clients can only view their own data
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({ client })
  } catch (error) {
    console.error("Error fetching client:", error)
    return NextResponse.json(
      { error: "Failed to fetch client" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await requireWorkspace()
    await requireUserId()
    const { id } = await params

    const body = await request.json()
    const data = updateClientSchema.parse(body)

    // Verify client exists and belongs to workspace
    const existingClient = await prisma.user.findUnique({
      where: { id },
      include: {
        clientProfile: true,
      },
    })

    if (!existingClient) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      )
    }

    if (existingClient.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    // Check if email is being changed and if it's already taken
    if (data.email && data.email !== existingClient.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: data.email },
      })

      if (emailExists) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const userUpdateData: Record<string, unknown> = {}
    if (data.fullName !== undefined) userUpdateData.fullName = data.fullName
    if (data.email !== undefined) userUpdateData.email = data.email
    if (data.phone !== undefined) userUpdateData.phone = data.phone

    const profileUpdateData: Record<string, unknown> = {}
    if (data.billingFrequency !== undefined) {
      profileUpdateData.billingFrequency = data.billingFrequency
    }
    if (data.sessionRate !== undefined) {
      const sessionRate = parseFloat(data.sessionRate)
      if (isNaN(sessionRate) || sessionRate <= 0) {
        return NextResponse.json(
          { error: "Invalid session rate" },
          { status: 400 }
        )
      }
      profileUpdateData.sessionRate = sessionRate
    }
    if (data.notes !== undefined) profileUpdateData.notes = data.notes
    if (data.autoInvoiceEnabled !== undefined) {
      profileUpdateData.autoInvoiceEnabled = data.autoInvoiceEnabled
    }
    if (data.groupSessionRate !== undefined) {
      if (data.groupSessionRate === null || data.groupSessionRate === "") {
        profileUpdateData.groupSessionRate = null
      } else {
        const groupRate = parseFloat(data.groupSessionRate)
        if (isNaN(groupRate) || groupRate < 0) {
          return NextResponse.json(
            { error: "Invalid group session rate" },
            { status: 400 }
          )
        }
        profileUpdateData.groupSessionRate = groupRate
      }
    }

    // Update client and profile in transaction
    const updated = await prisma.$transaction(async (tx) => {
      // Update user record if there are changes
      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id },
          data: userUpdateData,
        })
      }

      // Update client profile if there are changes
      if (Object.keys(profileUpdateData).length > 0 && existingClient.clientProfile) {
        await tx.clientProfile.update({
          where: { userId: id },
          data: profileUpdateData,
        })
      }

      // Return updated client with profile
      return await tx.user.findUnique({
        where: { id },
        include: {
          clientProfile: true,
        },
      })
    })

    return NextResponse.json({
      message: "Client updated successfully",
      client: updated,
    })
  } catch (error) {
    console.error("Update client error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 }
    )
  }
}
