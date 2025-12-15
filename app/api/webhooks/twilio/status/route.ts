import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import crypto from "crypto"

/**
 * Twilio Status Callback Webhook
 * Receives delivery status updates for SMS messages
 *
 * Twilio Status Values:
 * - queued: Message is queued to be sent
 * - sent: Message was sent to the carrier
 * - delivered: Carrier confirmed delivery
 * - failed: Message failed to send
 * - undelivered: Carrier rejected the message
 */
export async function POST(request: Request) {
  try {
    // Get the Twilio signature from headers
    const twilioSignature = request.headers.get("x-twilio-signature")

    // Parse the form data from Twilio
    const formData = await request.formData()
    const params: Record<string, string> = {}
    formData.forEach((value, key) => {
      params[key] = value.toString()
    })

    // Verify Twilio signature in production
    if (process.env.NODE_ENV === "production") {
      const isValid = verifyTwilioSignature(
        request.url,
        params,
        twilioSignature
      )
      if (!isValid) {
        console.error("Invalid Twilio signature")
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    const messageSid = params.MessageSid
    const messageStatus = params.MessageStatus
    const errorCode = params.ErrorCode
    const errorMessage = params.ErrorMessage

    if (!messageSid || !messageStatus) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    console.log(`Twilio status update: ${messageSid} -> ${messageStatus}`)

    // Map Twilio status to our status enum
    let notificationStatus: "PENDING" | "SENT" | "DELIVERED" | "FAILED"
    switch (messageStatus.toLowerCase()) {
      case "delivered":
        notificationStatus = "DELIVERED"
        break
      case "failed":
      case "undelivered":
        notificationStatus = "FAILED"
        break
      case "queued":
      case "sent":
        notificationStatus = "SENT"
        break
      default:
        // For other statuses (sending, accepted), keep as SENT
        notificationStatus = "SENT"
    }

    // Find and update the notification log
    const updateData: {
      status: "PENDING" | "SENT" | "DELIVERED" | "FAILED"
      deliveredAt?: Date
      errorMessage?: string
    } = {
      status: notificationStatus,
    }

    if (notificationStatus === "DELIVERED") {
      updateData.deliveredAt = new Date()
    }

    if (errorMessage || errorCode) {
      updateData.errorMessage = errorMessage || `Error code: ${errorCode}`
    }

    const updated = await prisma.notificationLog.updateMany({
      where: { externalId: messageSid },
      data: updateData,
    })

    if (updated.count === 0) {
      console.warn(`No notification log found for SID: ${messageSid}`)
    } else {
      console.log(
        `Updated notification log for SID: ${messageSid} to status: ${notificationStatus}`
      )
    }

    // Twilio expects a 200 OK response
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Twilio webhook error:", error)
    // Still return 200 to prevent Twilio from retrying
    return NextResponse.json({ success: false, error: "Internal error" })
  }
}

/**
 * Verify Twilio signature to ensure request authenticity
 * https://www.twilio.com/docs/usage/security#validating-requests
 */
function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string | null
): boolean {
  if (!signature) {
    return false
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) {
    console.error("TWILIO_AUTH_TOKEN not configured for signature verification")
    return false
  }

  // Sort params alphabetically and concatenate
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], "")

  // Concatenate URL and params
  const data = url + sortedParams

  // Create HMAC-SHA1 signature
  const expectedSignature = crypto
    .createHmac("sha1", authToken)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64")

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch {
    return false
  }
}

// Handle GET requests (Twilio may send these for testing)
export async function GET() {
  return NextResponse.json({ status: "Twilio webhook endpoint active" })
}
