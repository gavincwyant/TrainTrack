import { NextResponse } from "next/server"
import { requireSystemAdmin } from "@/lib/middleware/tenant"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSystemAdmin()
    const { id } = await params

    const body = await request.json()
    const { email, fullName, phone, role, workspaceId, isSystemAdmin, profileImage, password } = body

    // Validate required fields
    if (!email || !fullName || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // If email is being changed, check if new email is already taken
    if (email !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email }
      })

      if (emailTaken) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      email,
      fullName,
      phone: phone || null,
      role,
      workspaceId: workspaceId || null,
      isSystemAdmin: isSystemAdmin || false,
      profileImage: profileImage || null,
    }

    // Only update password if provided
    if (password && password.trim() !== "") {
      updateData.passwordHash = await bcrypt.hash(password, 10)
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        workspace: true
      }
    })

    // Remove passwordHash from response
    const { passwordHash: updatedPasswordHash, ...userWithoutPassword } = user
    // Suppress unused variable warning
    void updatedPasswordHash

    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error("Update user error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update user" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSystemAdmin()
    const { id } = await params

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Delete user (cascade deletes will handle related records)
    await prisma.user.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete user error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete user" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    )
  }
}
