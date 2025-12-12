import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireWorkspace, requireUserId, isClient } from "@/lib/middleware/tenant"

const addAllowedClientSchema = z.object({
  allowedClientProfileId: z.string().uuid(),
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

    // Get the current user's client profile
    const clientProfile = await prisma.clientProfile.findUnique({
      where: { userId },
      include: {
        allowedGroupClients: {
          include: {
            allowedProfile: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!clientProfile) {
      return NextResponse.json(
        { error: "Client profile not found" },
        { status: 404 }
      )
    }

    // Get discoverable clients in the same workspace (excluding self)
    const discoverableClients = await prisma.clientProfile.findMany({
      where: {
        workspaceId,
        groupSessionDiscoverable: true,
        userId: { not: userId },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    })

    return NextResponse.json({
      allowedClients: clientProfile.allowedGroupClients.map((agc) => ({
        id: agc.id,
        profileId: agc.allowedProfileId,
        userId: agc.allowedProfile.user.id,
        fullName: agc.allowedProfile.user.fullName,
      })),
      discoverableClients: discoverableClients.map((cp) => ({
        profileId: cp.id,
        userId: cp.user.id,
        fullName: cp.user.fullName,
      })),
    })
  } catch (error) {
    console.error("Get allowed clients error:", error)

    if ((error as Error).message?.includes("No workspace")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: "Failed to fetch allowed clients" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
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

    const body = await request.json()
    const data = addAllowedClientSchema.parse(body)

    // Get the current user's client profile
    const clientProfile = await prisma.clientProfile.findUnique({
      where: { userId },
    })

    if (!clientProfile) {
      return NextResponse.json(
        { error: "Client profile not found" },
        { status: 404 }
      )
    }

    // Verify the target client profile exists, is discoverable, and is in the same workspace
    const allowedProfile = await prisma.clientProfile.findFirst({
      where: {
        id: data.allowedClientProfileId,
        workspaceId,
        groupSessionDiscoverable: true,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    })

    if (!allowedProfile) {
      return NextResponse.json(
        { error: "Client not found or not discoverable" },
        { status: 404 }
      )
    }

    // Prevent self-allow
    if (allowedProfile.userId === userId) {
      return NextResponse.json(
        { error: "Cannot add yourself to allowed list" },
        { status: 400 }
      )
    }

    // Check if already allowed
    const existing = await prisma.groupSessionAllowedClient.findUnique({
      where: {
        allowerProfileId_allowedProfileId: {
          allowerProfileId: clientProfile.id,
          allowedProfileId: data.allowedClientProfileId,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Client already in allowed list" },
        { status: 400 }
      )
    }

    // Create the allowed client relationship
    const allowedClient = await prisma.groupSessionAllowedClient.create({
      data: {
        allowerProfileId: clientProfile.id,
        allowedProfileId: data.allowedClientProfileId,
      },
    })

    return NextResponse.json({
      allowedClient: {
        id: allowedClient.id,
        profileId: allowedProfile.id,
        userId: allowedProfile.user.id,
        fullName: allowedProfile.user.fullName,
      },
    }, { status: 201 })
  } catch (error) {
    console.error("Add allowed client error:", error)

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
      { error: "Failed to add allowed client" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    await requireWorkspace()
    const userId = await requireUserId()

    // Verify user is a client
    if (!(await isClient())) {
      return NextResponse.json(
        { error: "Unauthorized - client access only" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const allowedClientProfileId = searchParams.get("allowedClientProfileId")

    if (!allowedClientProfileId) {
      return NextResponse.json(
        { error: "allowedClientProfileId is required" },
        { status: 400 }
      )
    }

    // Get the current user's client profile
    const clientProfile = await prisma.clientProfile.findUnique({
      where: { userId },
    })

    if (!clientProfile) {
      return NextResponse.json(
        { error: "Client profile not found" },
        { status: 404 }
      )
    }

    // Delete the allowed client relationship
    await prisma.groupSessionAllowedClient.deleteMany({
      where: {
        allowerProfileId: clientProfile.id,
        allowedProfileId: allowedClientProfileId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Remove allowed client error:", error)

    if ((error as Error).message?.includes("No workspace")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: "Failed to remove allowed client" },
      { status: 500 }
    )
  }
}
