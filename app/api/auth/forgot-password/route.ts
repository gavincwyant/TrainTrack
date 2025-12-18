import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { EmailService } from "@/lib/services/email"

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = forgotPasswordSchema.parse(body)

    // Always return success to prevent email enumeration
    const successResponse = NextResponse.json({
      message: "If an account exists with this email, you will receive a password reset link.",
    })

    // Look up user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      // Return success even if user doesn't exist (security best practice)
      return successResponse
    }

    // Delete any existing tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    })

    // Generate secure random token
    const token = crypto.randomUUID()

    // Create token with 1-hour expiry
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    })

    // Build reset URL
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const resetUrl = `${baseUrl}/reset-password?token=${token}`

    // Send email (don't block on failure to prevent email enumeration)
    try {
      const emailService = new EmailService()
      await emailService.sendPasswordResetEmail(email, resetUrl)
    } catch (emailError) {
      // Log but don't fail - user shouldn't know if email failed
      console.error("Failed to send password reset email:", emailError)
    }

    return successResponse
  } catch (error) {
    console.error("Forgot password error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
}
