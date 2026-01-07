import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

const onboardingSchema = z.object({
  businessName: z.string().min(2),
  phone: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const data = onboardingSchema.parse(body)

    // Get user's workspace
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { ownedWorkspaces: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Update workspace name and user phone
    const workspace = user.ownedWorkspaces[0]
    if (workspace) {
      await prisma.workspace.update({
        where: { id: workspace.id },
        data: { name: data.businessName },
      })
    }

    // Update user with phone and mark onboarding complete
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        phone: data.phone || null,
        onboardingComplete: true,
      },
    })

    return NextResponse.json({
      message: "Onboarding completed successfully",
    })
  } catch (error) {
    console.error("Onboarding error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    )
  }
}
