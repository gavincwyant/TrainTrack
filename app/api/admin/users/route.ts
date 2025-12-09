import { NextResponse } from "next/server"
import { requireSystemAdmin } from "@/lib/middleware/tenant"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  try {
    await requireSystemAdmin()

    const body = await request.json()
    const { email, fullName, phone, role, workspaceId, isSystemAdmin, profileImage, password } = body

    // Validate required fields
    if (!email || !fullName || !password || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        fullName,
        phone: phone || null,
        role,
        workspaceId: workspaceId || null,
        isSystemAdmin: isSystemAdmin || false,
        profileImage: profileImage || null,
        passwordHash,
      },
      include: {
        workspace: true
      }
    })

    // Remove passwordHash from response
    const { passwordHash: userPasswordHash, ...userWithoutPassword } = user
    // Suppress unused variable warning
    void userPasswordHash

    return NextResponse.json(userWithoutPassword, { status: 201 })
  } catch (error) {
    console.error("Create user error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create user" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    )
  }
}
