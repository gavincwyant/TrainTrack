import { NextResponse } from "next/server"
import { google } from "googleapis"
import { prisma } from "@/lib/db"
import { encrypt } from "@/lib/encryption"
import { auth } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const session = await auth()
    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`

    if (!session?.user?.id) {
      return NextResponse.redirect(`${baseUrl}/login?error=NotAuthenticated`)
    }

    const { searchParams } = url
    const code = searchParams.get("code")
    const error = searchParams.get("error")

    if (error) {
      return NextResponse.redirect(`${baseUrl}/trainer/dashboard?calendarError=${error}`)
    }

    if (!code) {
      return NextResponse.redirect(`${baseUrl}/trainer/dashboard?calendarError=NoCode`)
    }

    // Exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(`${baseUrl}/trainer/dashboard?calendarError=NoTokens`)
    }

    // Get user's email from Google (if available in tokens, otherwise use session email)
    let googleEmail = session.user.email || null

    // Try to get email from Google if we have the right scope
    try {
      oauth2Client.setCredentials(tokens)
      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client })
      const userInfo = await oauth2.userinfo.get()
      googleEmail = userInfo.data.email || googleEmail
    } catch (err) {
      // If we can't get userinfo, just use the session email
      console.log("Could not fetch Google user info, using session email:", err)
    }

    const workspaceId = session.user.workspaceId

    if (!workspaceId) {
      return NextResponse.redirect(`${baseUrl}/trainer/dashboard?calendarError=NoWorkspace`)
    }

    await prisma.trainerSettings.upsert({
      where: { trainerId: session.user.id },
      update: {
        googleCalendarConnected: true,
        googleCalendarEmail: googleEmail,
        googleAccessToken: await encrypt(tokens.access_token),
        googleRefreshToken: await encrypt(tokens.refresh_token!),
        googleCalendarId: "primary",
      },
      create: {
        workspaceId,
        trainerId: session.user.id,
        googleCalendarConnected: true,
        googleCalendarEmail: googleEmail,
        googleAccessToken: await encrypt(tokens.access_token),
        googleRefreshToken: await encrypt(tokens.refresh_token!),
        googleCalendarId: "primary",
      },
    })

    return NextResponse.redirect(`${baseUrl}/trainer/dashboard?calendarSuccess=connected`)
  } catch (error) {
    console.error("Google OAuth callback error:", error)
    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`
    return NextResponse.redirect(`${baseUrl}/trainer/dashboard?calendarError=CallbackFailed`)
  }
}
