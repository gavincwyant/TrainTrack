import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/db"

const signupSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  workspaceName: z.string().min(2),
  phone: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = signupSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hash(data.password, 10)

    // Create user and workspace in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the trainer user
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          fullName: data.fullName,
          phone: data.phone,
          role: "TRAINER",
          // workspaceId will be set after creating workspace
        },
      })

      // Create workspace for the trainer
      const workspace = await tx.workspace.create({
        data: {
          name: data.workspaceName,
          trainerId: user.id,
        },
      })

      // Update user with workspaceId
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { workspaceId: workspace.id },
      })

      return { user: updatedUser, workspace }
    })

    return NextResponse.json({
      message: "Account created successfully",
      userId: result.user.id,
      workspaceId: result.workspace.id,
    })
  } catch (error) {
    console.error("Signup error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    )
  }
}
