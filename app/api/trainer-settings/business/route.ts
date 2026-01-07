import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

const updateBusinessSchema = z.object({
  businessName: z.string().min(2),
})

const updateProfileSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().optional(),
})

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        ownedWorkspaces: {
          select: { id: true, name: true }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const workspace = user.ownedWorkspaces[0]

    return NextResponse.json({
      businessName: workspace?.name || null,
      trainerName: user.fullName,
      trainerEmail: user.email,
      trainerPhone: user.phone,
    })
  } catch (error) {
    console.error("Error fetching business settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch business settings" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    // Check if this is a business name update or profile update
    if (body.businessName !== undefined) {
      const data = updateBusinessSchema.parse(body)

      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { ownedWorkspaces: true }
      })

      if (!user || !user.ownedWorkspaces[0]) {
        return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
      }

      await prisma.workspace.update({
        where: { id: user.ownedWorkspaces[0].id },
        data: { name: data.businessName }
      })

      return NextResponse.json({ success: true, businessName: data.businessName })
    }

    if (body.fullName !== undefined) {
      const data = updateProfileSchema.parse(body)

      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          fullName: data.fullName,
          phone: data.phone || null,
        }
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  } catch (error) {
    console.error("Error updating business settings:", error)

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
