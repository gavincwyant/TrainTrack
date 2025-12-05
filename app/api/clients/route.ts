import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireWorkspace, requireUserId } from "@/lib/middleware/tenant"

const createClientSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  billingFrequency: z.enum(["PER_SESSION", "MONTHLY"]),
  sessionRate: z.string(),
  notes: z.string().optional(),
  createAccount: z.enum(["invite", "direct"]),
  password: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Verify authentication and get workspace
    const workspaceId = await requireWorkspace()
    const trainerId = await requireUserId()

    const body = await request.json()
    const data = createClientSchema.parse(body)

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      )
    }

    // Convert session rate to decimal
    const sessionRate = parseFloat(data.sessionRate)

    if (isNaN(sessionRate) || sessionRate <= 0) {
      return NextResponse.json(
        { error: "Invalid session rate" },
        { status: 400 }
      )
    }

    // Create client based on account type
    if (data.createAccount === "direct") {
      // Direct account creation - trainer sets password
      if (!data.password || data.password.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters" },
          { status: 400 }
        )
      }

      const passwordHash = await hash(data.password, 10)

      const result = await prisma.$transaction(async (tx) => {
        // Create client user
        const client = await tx.user.create({
          data: {
            email: data.email,
            passwordHash,
            fullName: data.fullName,
            phone: data.phone,
            role: "CLIENT",
            workspaceId,
          },
        })

        // Create client profile
        const profile = await tx.clientProfile.create({
          data: {
            userId: client.id,
            workspaceId,
            billingFrequency: data.billingFrequency,
            sessionRate,
            notes: data.notes,
          },
        })

        return { client, profile }
      })

      return NextResponse.json({
        message: "Client account created successfully",
        clientId: result.client.id,
      })
    } else {
      // Email invitation - client creates their own password
      // For now, we'll create a temporary password that must be changed on first login
      const tempPassword = Math.random().toString(36).slice(-12)
      const passwordHash = await hash(tempPassword, 10)

      const result = await prisma.$transaction(async (tx) => {
        // Create client user with temporary password
        const client = await tx.user.create({
          data: {
            email: data.email,
            passwordHash, // temporary password
            fullName: data.fullName,
            phone: data.phone,
            role: "CLIENT",
            workspaceId,
          },
        })

        // Create client profile
        const profile = await tx.clientProfile.create({
          data: {
            userId: client.id,
            workspaceId,
            billingFrequency: data.billingFrequency,
            sessionRate,
            notes: data.notes,
          },
        })

        // TODO: Send invitation email with setup link
        // This would typically use SendGrid or similar service
        // For now, we'll just return success

        return { client, profile, tempPassword }
      })

      return NextResponse.json({
        message: "Invitation sent successfully",
        clientId: result.client.id,
        // In production, don't return temp password - send via email instead
        tempPassword: result.tempPassword,
      })
    }
  } catch (error) {
    console.error("Create client error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 }
      )
    }

    if ((error as Error).message?.includes("No workspace context")) {
      return NextResponse.json(
        { error: "Unauthorized - No workspace context" },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await requireWorkspace()

    const clients = await prisma.user.findMany({
      where: {
        workspaceId,
        role: "CLIENT",
      },
      include: {
        clientProfile: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({ clients })
  } catch (error) {
    console.error("Get clients error:", error)

    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    )
  }
}
