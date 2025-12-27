import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { EmailService } from "@/lib/services/email"

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  message: z.string().min(1, "Message is required"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, message } = contactSchema.parse(body)

    const emailService = new EmailService()
    await emailService.sendContactFormEmail(name, email, message)

    return NextResponse.json({
      message: "Your message has been sent. We'll be in touch soon!",
    })
  } catch (error) {
    console.error("Contact form error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 500 }
    )
  }
}
