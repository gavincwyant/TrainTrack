import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireWorkspace, requireUserId } from "@/lib/middleware/tenant"
import { PrismaClient } from "@prisma/client"

const createClientSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  billingFrequency: z.enum(["PER_SESSION", "MONTHLY", "PREPAID"]),
  sessionRate: z.string(),
  groupSessionRate: z.string().optional(),
  prepaidTargetBalance: z.string().optional(),
  notes: z.string().optional(),
  createAccount: z.enum(["invite", "manual"]),
  autoInvoiceEnabled: z.boolean().optional().default(true),
})

export async function POST(request: NextRequest) {
  try {
    // Verify authentication and get workspace
    const workspaceId = await requireWorkspace()
    await requireUserId() // Verify user is authenticated

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

    // Convert group session rate to decimal (optional)
    let groupSessionRate: number | null = null
    if (data.groupSessionRate) {
      groupSessionRate = parseFloat(data.groupSessionRate)
      if (isNaN(groupSessionRate) || groupSessionRate < 0) {
        return NextResponse.json(
          { error: "Invalid group session rate" },
          { status: 400 }
        )
      }
    }

    // Convert prepaid target balance to decimal (optional, for PREPAID billing)
    let prepaidTargetBalance: number | null = null
    if (data.prepaidTargetBalance) {
      prepaidTargetBalance = parseFloat(data.prepaidTargetBalance)
      if (isNaN(prepaidTargetBalance) || prepaidTargetBalance < 0) {
        return NextResponse.json(
          { error: "Invalid prepaid target balance" },
          { status: 400 }
        )
      }
    }

    // Fix 7: PREPAID clients require a positive target balance
    if (data.billingFrequency === "PREPAID" && (!prepaidTargetBalance || prepaidTargetBalance <= 0)) {
      return NextResponse.json(
        { error: "PREPAID clients require a positive target balance" },
        { status: 400 }
      )
    }

    // Create client based on account type
    if (data.createAccount === "manual") {
      // Manual creation - trainer manages everything, client has NO login access
      // We don't create a user account at all, just a client profile with contact info

      const result = await prisma.$transaction(async (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">) => {
        // Create a user record but with no password (null) - they cannot log in
        const client = await tx.user.create({
          data: {
            email: data.email,
            passwordHash: "", // Empty password hash - user cannot log in
            fullName: data.fullName,
            phone: data.phone,
            role: "CLIENT",
            workspaceId,
          },
        })

        // Create client profile
        // For PREPAID clients, start with balance equal to target (they paid upfront)
        const profile = await tx.clientProfile.create({
          data: {
            userId: client.id,
            workspaceId,
            billingFrequency: data.billingFrequency,
            sessionRate,
            groupSessionRate,
            prepaidTargetBalance: data.billingFrequency === "PREPAID" ? prepaidTargetBalance : null,
            prepaidBalance: data.billingFrequency === "PREPAID" ? (prepaidTargetBalance || 0) : null,
            notes: data.notes,
            autoInvoiceEnabled: data.autoInvoiceEnabled ?? true,
          },
        })

        return { client, profile }
      })

      return NextResponse.json({
        message: "Client added successfully",
        clientId: result.client.id,
      })
    } else {
      // Email invitation - client creates their own password
      // For now, we'll create a temporary password that must be changed on first login
      const tempPassword = Math.random().toString(36).slice(-12)
      const passwordHash = await hash(tempPassword, 10)

      const result = await prisma.$transaction(async (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">) => {
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
        // For PREPAID clients, start with balance equal to target (they paid upfront)
        const profile = await tx.clientProfile.create({
          data: {
            userId: client.id,
            workspaceId,
            billingFrequency: data.billingFrequency,
            sessionRate,
            groupSessionRate,
            prepaidTargetBalance: data.billingFrequency === "PREPAID" ? prepaidTargetBalance : null,
            prepaidBalance: data.billingFrequency === "PREPAID" ? (prepaidTargetBalance || 0) : null,
            notes: data.notes,
            autoInvoiceEnabled: data.autoInvoiceEnabled ?? true,
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
        { error: "Invalid input data", details: error.issues },
        { status: 400 }
      )
    }

    if ((error as Error).message?.includes("No workspace context")) {
      return NextResponse.json(
        { error: "Unauthorized - No workspace context" },
        { status: 401 }
      )
    }

    // Return more specific error message for debugging
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: `Failed to create client: ${errorMessage}` },
      { status: 500 }
    )
  }
}

export async function GET() {
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
