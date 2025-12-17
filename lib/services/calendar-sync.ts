import { GoogleCalendarService } from "../google-calendar"
import { prisma } from "../db"
import { ClientSyncService } from "./client-sync"

interface ClientMatch {
  clientId: string
  clientName: string
  confidence: "high" | "medium" | "low"
  reason: string
}

export class CalendarSyncService {
  private googleService: GoogleCalendarService

  constructor() {
    this.googleService = new GoogleCalendarService()
  }

  /**
   * Strip status prefixes (✓, ✗, ↻) from event titles
   * These are added when appointments are marked complete/cancelled/rescheduled
   */
  private stripStatusPrefix(title: string): string {
    // Common status prefixes used by our system
    const prefixes = ["✓ ", "✗ ", "↻ ", "✓", "✗", "↻"]
    let cleaned = title.trim()
    for (const prefix of prefixes) {
      if (cleaned.startsWith(prefix)) {
        cleaned = cleaned.slice(prefix.length).trim()
        break
      }
    }
    return cleaned
  }

  /**
   * Smart client detection: Match Google Calendar event title to client names
   */
  private async findMatchingClient(
    trainerId: string,
    eventTitle: string
  ): Promise<ClientMatch | null> {
    // Get all clients for this trainer
    const clients = await prisma.user.findMany({
      where: {
        role: "CLIENT",
        workspace: {
          trainerId,
        },
      },
      select: {
        id: true,
        fullName: true,
      },
    })

    if (clients.length === 0) return null

    // Strip status prefixes before matching (handles "✓ John Smith" → "John Smith")
    const cleanedTitle = this.stripStatusPrefix(eventTitle)
    const titleLower = cleanedTitle.toLowerCase().trim()

    // High confidence: ONLY exact full name match (no substring matching)
    // This prevents "Lisa B" from matching "Lisa Berzansky"
    for (const client of clients) {
      const clientNameLower = client.fullName.toLowerCase().trim()
      if (titleLower === clientNameLower) {
        return {
          clientId: client.id,
          clientName: client.fullName,
          confidence: "high",
          reason: `Exact match: event title "${eventTitle}" exactly matches client name "${client.fullName}"`,
        }
      }
    }

    // For all other cases, do NOT auto-create appointments
    // Instead, create pending appointments for manual approval
    // This ensures trainers review any uncertain matches

    return null
  }

  /**
   * Format event title based on appointment status
   */
  private formatEventTitle(clientName: string, status: string): string {
    switch (status) {
      case "COMPLETED":
        return `✓ ${clientName}`
      case "CANCELLED":
        return `✗ ${clientName}`
      case "RESCHEDULED":
        return `↻ ${clientName}`
      default: // SCHEDULED
        return clientName
    }
  }

  /**
   * Get Google Calendar color ID based on appointment status
   * Google Calendar color IDs:
   * 1: Lavender, 2: Sage, 3: Grape, 4: Flamingo, 5: Banana
   * 6: Tangerine, 7: Peacock, 8: Graphite, 9: Blueberry, 10: Basil, 11: Tomato
   */
  private getEventColor(status: string): string {
    switch (status) {
      case "COMPLETED":
        return "10" // Basil (green) - completed/success
      case "CANCELLED":
        return "11" // Tomato (red) - cancelled/error
      case "RESCHEDULED":
        return "6" // Tangerine (orange) - rescheduled/warning
      default: // SCHEDULED
        return "9" // Blueberry (blue) - scheduled/default
    }
  }

  /**
   * Sync appointment to Google Calendar (create or update)
   */
  async syncAppointmentToGoogle(appointmentId: string) {
    console.log("🔄 Syncing appointment to Google Calendar:", appointmentId)

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { client: true, trainer: true },
    })

    if (!appointment) {
      console.log("❌ Appointment not found:", appointmentId)
      return
    }

    const settings = await prisma.trainerSettings.findUnique({
      where: { trainerId: appointment.trainerId },
    })

    console.log("⚙️ Trainer settings:", {
      trainerId: appointment.trainerId,
      autoSyncEnabled: settings?.autoSyncEnabled,
      googleCalendarConnected: settings?.googleCalendarConnected,
    })

    // Check if auto-sync is enabled
    if (!settings?.autoSyncEnabled || !settings.googleCalendarConnected) {
      console.log("⏭️ Skipping sync - auto-sync disabled or calendar not connected")
      return
    }

    // Check if mapping exists (update) or create new
    const mapping = await prisma.calendarEventMapping.findFirst({
      where: {
        appointmentId,
        provider: "google",
      },
    })

    const eventData = {
      summary: this.formatEventTitle(appointment.client.fullName, appointment.status),
      description: `Appointment with ${appointment.client.fullName}\nStatus: ${appointment.status}`,
      start: {
        dateTime: appointment.startTime.toISOString(),
        timeZone: settings.timezone,
      },
      end: {
        dateTime: appointment.endTime.toISOString(),
        timeZone: settings.timezone,
      },
      colorId: this.getEventColor(appointment.status),
    }

    try {
      if (mapping?.externalEventId) {
        console.log("📝 Updating existing Google Calendar event:", mapping.externalEventId)
        // Update existing event
        await this.googleService.updateEvent(
          appointment.trainerId,
          mapping.externalEventId,
          eventData
        )

        // Update mapping timestamp
        await prisma.calendarEventMapping.update({
          where: { id: mapping.id },
          data: { lastSyncedAt: new Date() },
        })
        console.log("✅ Updated Google Calendar event successfully")
      } else {
        console.log("➕ Creating new Google Calendar event")
        // Create new event
        const googleEvent = await this.googleService.createEvent(
          appointment.trainerId,
          eventData
        )

        console.log("✅ Created Google Calendar event:", googleEvent.id)

        // Create mapping
        await prisma.calendarEventMapping.create({
          data: {
            workspaceId: appointment.workspaceId,
            appointmentId: appointment.id,
            provider: "google",
            externalEventId: googleEvent.id!,
            externalCalendarId: "primary",
            syncDirection: "outbound",
          },
        })
        console.log("✅ Created calendar event mapping")
      }
    } catch (error) {
      console.error("❌ Failed to sync appointment to Google:", error)
      throw error
    }
  }

  /**
   * Delete appointment from Google Calendar
   */
  async deleteAppointmentFromGoogle(appointmentId: string, trainerId: string) {
    const mapping = await prisma.calendarEventMapping.findFirst({
      where: {
        appointmentId,
        provider: "google",
      },
    })

    if (!mapping) return

    const settings = await prisma.trainerSettings.findUnique({
      where: { trainerId },
    })

    if (!settings?.googleCalendarConnected) return

    try {
      await this.googleService.deleteEvent(trainerId, mapping.externalEventId)
      await prisma.calendarEventMapping.delete({
        where: { id: mapping.id },
      })
    } catch (error) {
      console.error("Failed to delete Google Calendar event:", error)
    }
  }

  /**
   * Pull events from Google Calendar and create blocked times
   */
  async pullGoogleCalendarEvents(trainerId: string) {
    console.log("🔽 Pulling Google Calendar events for trainer:", trainerId)

    const settings = await prisma.trainerSettings.findUnique({
      where: { trainerId },
    })

    console.log("⚙️ Trainer settings for pull:", {
      trainerId,
      autoSyncEnabled: settings?.autoSyncEnabled,
      googleCalendarConnected: settings?.googleCalendarConnected,
    })

    if (!settings?.autoSyncEnabled || !settings.googleCalendarConnected) {
      console.log("⏭️ Skipping pull - auto-sync disabled or calendar not connected")
      return
    }

    // Pull events for next 3 months
    const now = new Date()
    const threeMonthsLater = new Date()
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3)

    console.log("📅 Fetching events from", now.toISOString(), "to", threeMonthsLater.toISOString())

    try {
      const googleEvents = await this.googleService.listEvents(
        trainerId,
        now.toISOString(),
        threeMonthsLater.toISOString()
      )

      console.log(`📋 Found ${googleEvents.length} Google Calendar events`)

      for (const event of googleEvents) {
        console.log(`📌 Processing event: "${event.summary}" (${event.id})`)

        // Skip all-day events and events without time
        if (!event.start?.dateTime || !event.end?.dateTime) {
          console.log(`  ⏭️ Skipping all-day or no-time event`)
          continue
        }

        // Check if we already have a mapping for this event
        const existingMapping = await prisma.calendarEventMapping.findUnique({
          where: {
            provider_externalEventId: {
              provider: "google",
              externalEventId: event.id!,
            },
          },
        })

        console.log(`  🔍 Existing mapping:`, existingMapping ? {
          id: existingMapping.id,
          syncDirection: existingMapping.syncDirection,
          blockedTimeId: existingMapping.blockedTimeId,
        } : "none")

        // Check if this is an outbound event (we created it)
        if (existingMapping?.syncDirection === "outbound") {
          console.log(`  ⏭️ Skipping outbound event (Train-originated, updates happen in Train)`)
          continue // Don't update Train-originated appointments from Google
        }

        // Check if appointment already exists (inbound only gets here)
        if (existingMapping?.appointmentId) {
          console.log(`  📝 Updating existing inbound appointment times`)
          // Update times for Google-originated appointments
          await prisma.appointment.update({
            where: { id: existingMapping.appointmentId },
            data: {
              startTime: new Date(event.start.dateTime),
              endTime: new Date(event.end.dateTime),
            },
          })

          // Update mapping timestamp
          await prisma.calendarEventMapping.update({
            where: { id: existingMapping.id },
            data: { lastSyncedAt: new Date() },
          })
          console.log(`  ✅ Updated inbound appointment times`)
          continue // Move to next event
        }

        // Check if blocked time already exists
        if (existingMapping?.blockedTimeId) {
          console.log(`  📝 Updating existing blocked time: ${existingMapping.blockedTimeId}`)
          // Update existing blocked time
          await prisma.blockedTime.update({
            where: { id: existingMapping.blockedTimeId },
            data: {
              startTime: new Date(event.start.dateTime),
              endTime: new Date(event.end.dateTime),
              reason: `${event.summary || 'Busy'} (via Google)`,
            },
          })

          // Update mapping timestamp
          await prisma.calendarEventMapping.update({
            where: { id: existingMapping.id },
            data: { lastSyncedAt: new Date() },
          })
          console.log(`  ✅ Updated blocked time successfully`)
        } else {
          // Smart client detection
          console.log(`  🔍 Checking for client match in event title: "${event.summary}"`)
          const clientMatch = await this.findMatchingClient(trainerId, event.summary || "")

          if (clientMatch && clientMatch.confidence === "high") {
            console.log(`  🎯 Found HIGH confidence client match! Client: ${clientMatch.clientName}`)

            // Check if mapping already exists (might be appointment or blocked time)
            const existingEventMapping = await prisma.calendarEventMapping.findUnique({
              where: {
                provider_externalEventId: {
                  provider: "google",
                  externalEventId: event.id!,
                },
              },
            })

            if (existingEventMapping?.appointmentId) {
              console.log(`  ⏭️ Appointment already exists, updating times`)
              // Appointment already exists - just update the times if changed
              await prisma.appointment.update({
                where: { id: existingEventMapping.appointmentId },
                data: {
                  startTime: new Date(event.start.dateTime),
                  endTime: new Date(event.end.dateTime),
                },
              })

              // Update mapping timestamp
              await prisma.calendarEventMapping.update({
                where: { id: existingEventMapping.id },
                data: { lastSyncedAt: new Date() },
              })
              console.log(`  ✅ Updated existing appointment`)
            } else {
              // Safeguard: Check if appointment already exists for this client at this time
              // This prevents duplicates if mappings are somehow lost
              const existingAppointment = await prisma.appointment.findFirst({
                where: {
                  trainerId,
                  clientId: clientMatch.clientId,
                  startTime: new Date(event.start.dateTime),
                  endTime: new Date(event.end.dateTime),
                },
              })

              if (existingAppointment) {
                console.log(`  ⏭️ Appointment already exists for this client/time (${existingAppointment.id}), skipping creation`)
                // Create/update mapping to link this event to existing appointment
                if (existingEventMapping) {
                  await prisma.calendarEventMapping.update({
                    where: { id: existingEventMapping.id },
                    data: {
                      appointmentId: existingAppointment.id,
                      blockedTimeId: null,
                      lastSyncedAt: new Date(),
                    },
                  })
                } else {
                  await prisma.calendarEventMapping.upsert({
                    where: {
                      provider_externalEventId: {
                        provider: "google",
                        externalEventId: event.id!,
                      },
                    },
                    update: {
                      appointmentId: existingAppointment.id,
                      lastSyncedAt: new Date(),
                    },
                    create: {
                      workspaceId: settings.workspaceId,
                      appointmentId: existingAppointment.id,
                      provider: "google",
                      externalEventId: event.id!,
                      externalCalendarId: "primary",
                      syncDirection: "inbound",
                    },
                  })
                }
                continue
              }

              console.log(`  ✅ Auto-creating appointment (no approval needed)`)

              // High confidence match - auto-create appointment
              const appointment = await prisma.appointment.create({
                data: {
                  workspaceId: settings.workspaceId,
                  trainerId,
                  clientId: clientMatch.clientId,
                  startTime: new Date(event.start.dateTime),
                  endTime: new Date(event.end.dateTime),
                  status: "SCHEDULED",
                },
              })

              console.log(`  ✅ Created appointment: ${appointment.id}`)

              if (existingEventMapping) {
                console.log(`  🔄 Converting blocked time to appointment`)
                // If there was a blocked time, delete it since we're converting to appointment
                if (existingEventMapping.blockedTimeId) {
                  await prisma.blockedTime.delete({
                    where: { id: existingEventMapping.blockedTimeId },
                  }).catch(() => {
                    console.log(`  ⚠️ Blocked time already deleted`)
                  })
                }

                // Update mapping to point to appointment instead
                await prisma.calendarEventMapping.update({
                  where: { id: existingEventMapping.id },
                  data: {
                    appointmentId: appointment.id,
                    blockedTimeId: null,
                    lastSyncedAt: new Date(),
                  },
                })
              } else {
                // Create new mapping
                await prisma.calendarEventMapping.create({
                  data: {
                    workspaceId: settings.workspaceId,
                    appointmentId: appointment.id,
                    provider: "google",
                    externalEventId: event.id!,
                    externalCalendarId: "primary",
                    syncDirection: "inbound",
                  },
                })
              }
              console.log(`  ✅ Calendar event mapping created/updated`)
            }
          } else if (clientMatch) {
            console.log(`  🎯 Found ${clientMatch.confidence} confidence client match: ${clientMatch.clientName}`)
            console.log(`  📋 Creating pending appointment for approval`)

            // Medium/low confidence - create pending appointment for approval
            const existingPending = await prisma.pendingAppointment.findFirst({
              where: {
                trainerId,
                externalEventId: event.id!,
              },
            })

            if (!existingPending) {
              await prisma.pendingAppointment.create({
                data: {
                  workspaceId: settings.workspaceId,
                  trainerId,
                  externalEventId: event.id!,
                  externalEventTitle: event.summary || "Untitled Event",
                  startTime: new Date(event.start.dateTime),
                  endTime: new Date(event.end.dateTime),
                  suggestedClientId: clientMatch.clientId,
                  matchConfidence: clientMatch.confidence,
                  matchReason: clientMatch.reason,
                  status: "pending",
                },
              })
              console.log(`  ✅ Created pending appointment`)
            } else {
              console.log(`  ⏭️ Pending appointment already exists`)
            }
          } else {
            console.log(`  ❌ No client match found - creating as blocked time`)

            // Check if mapping exists without blockedTimeId
            // (This can happen if event was previously processed but blocked time was deleted)
            if (existingMapping && !existingMapping.blockedTimeId) {
              console.log(`  📝 Mapping exists without blocked time, creating blocked time`)
              // Create blocked time
              const blockedTime = await prisma.blockedTime.create({
                data: {
                  workspaceId: settings.workspaceId,
                  trainerId,
                  startTime: new Date(event.start.dateTime),
                  endTime: new Date(event.end.dateTime),
                  reason: `${event.summary || 'Busy'} (via Google)`,
                  isRecurring: false,
                },
              })

              console.log(`  ✅ Created blocked time: ${blockedTime.id}`)

              // Update existing mapping to point to new blocked time
              await prisma.calendarEventMapping.update({
                where: { id: existingMapping.id },
                data: {
                  blockedTimeId: blockedTime.id,
                  lastSyncedAt: new Date(),
                },
              })
              console.log(`  ✅ Updated calendar event mapping`)
            } else if (!existingMapping) {
              console.log(`  ➕ No existing mapping, creating blocked time and mapping`)
              // No match found - create as regular blocked time
              const blockedTime = await prisma.blockedTime.create({
                data: {
                  workspaceId: settings.workspaceId,
                  trainerId,
                  startTime: new Date(event.start.dateTime),
                  endTime: new Date(event.end.dateTime),
                  reason: `${event.summary || 'Busy'} (via Google)`,
                  isRecurring: false,
                },
              })

              console.log(`  ✅ Created blocked time: ${blockedTime.id}`)

              // Create mapping
              await prisma.calendarEventMapping.create({
                data: {
                  workspaceId: settings.workspaceId,
                  blockedTimeId: blockedTime.id,
                  provider: "google",
                  externalEventId: event.id!,
                  externalCalendarId: "primary",
                  syncDirection: "inbound",
                },
              })
              console.log(`  ✅ Created calendar event mapping`)
            } else {
              console.log(`  ⚠️ Unexpected state - mapping exists with blocked time already`)
            }
          }
        }
      }

      // Update last synced timestamp
      await prisma.trainerSettings.update({
        where: { trainerId },
        data: { lastSyncedAt: new Date() },
      })

      // Extract client profiles from events if auto-sync is enabled
      if (settings.autoClientSyncEnabled) {
        console.log("🔍 Auto client sync enabled - extracting clients from events")
        try {
          const clientSyncService = new ClientSyncService()
          await clientSyncService.extractClientsFromNewEvents(trainerId, googleEvents)
          console.log("✅ Client extraction complete")
        } catch (error) {
          console.error("⚠️ Failed to extract clients from events (non-critical):", error)
          // Don't throw - client extraction is non-critical, sync should continue
        }
      }

      console.log("✅ Google Calendar sync completed successfully")
    } catch (error) {
      console.error("❌ Failed to pull Google Calendar events:", error)
      throw error
    }
  }
}
