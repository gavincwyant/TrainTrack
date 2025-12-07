import { google } from "googleapis"
import { decrypt } from "./encryption"
import { prisma } from "./db"

export class GoogleCalendarService {
  private oauth2Client

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )
  }

  async getCalendarClient(trainerId: string) {
    const settings = await prisma.trainerSettings.findUnique({
      where: { trainerId },
    })

    if (!settings?.googleAccessToken || !settings?.googleRefreshToken) {
      throw new Error("Google Calendar not connected")
    }

    const accessToken = await decrypt(settings.googleAccessToken)
    const refreshToken = await decrypt(settings.googleRefreshToken)

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    // Set up token refresh handler
    this.oauth2Client.on("tokens", async (tokens) => {
      if (tokens.access_token) {
        // Update the access token in the database
        const { encrypt } = await import("./encryption")
        await prisma.trainerSettings.update({
          where: { trainerId },
          data: {
            googleAccessToken: await encrypt(tokens.access_token),
          },
        })
      }
    })

    return google.calendar({ version: "v3", auth: this.oauth2Client })
  }

  async createEvent(
    trainerId: string,
    event: {
      summary: string
      description?: string
      start: { dateTime: string; timeZone: string }
      end: { dateTime: string; timeZone: string }
    }
  ) {
    const calendar = await this.getCalendarClient(trainerId)
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    })
    return response.data
  }

  async updateEvent(
    trainerId: string,
    eventId: string,
    event: {
      summary: string
      description?: string
      start: { dateTime: string; timeZone: string }
      end: { dateTime: string; timeZone: string }
    }
  ) {
    const calendar = await this.getCalendarClient(trainerId)
    const response = await calendar.events.update({
      calendarId: "primary",
      eventId,
      requestBody: event,
    })
    return response.data
  }

  async deleteEvent(trainerId: string, eventId: string) {
    const calendar = await this.getCalendarClient(trainerId)
    await calendar.events.delete({
      calendarId: "primary",
      eventId,
    })
  }

  async listEvents(trainerId: string, timeMin: string, timeMax: string) {
    const calendar = await this.getCalendarClient(trainerId)
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
    })
    return response.data.items || []
  }
}
