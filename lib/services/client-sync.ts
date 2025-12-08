/**
 * Client Sync Service
 *
 * Orchestrates the entire client sync process:
 * 1. Fetch calendar events
 * 2. Extract client names
 * 3. Aggregate duplicates
 * 4. Deduplicate against existing clients
 * 5. Create pending client profiles
 */

import { prisma } from "@/lib/db"
import { GoogleCalendarService } from "@/lib/google-calendar"
import { ClientExtractionService, ExtractedClient } from "./client-extraction"
import { ClientDeduplicationService } from "./client-deduplication"
import { calendar_v3 } from "googleapis"

type GoogleCalendarEvent = calendar_v3.Schema$Event

interface SyncOptions {
  lookbackDays?: number
  source?: "google" | "microsoft" | "apple"
}

interface SyncResult {
  extractedCount: number
  createdCount: number
  duplicateCount: number
  pendingProfiles: Array<{
    id: string
    extractedName: string
    extractedEmail: string | null
    confidence: string
    occurrenceCount: number
  }>
}

export class ClientSyncService {
  private googleService: GoogleCalendarService
  private extractionService: ClientExtractionService
  private deduplicationService: ClientDeduplicationService

  constructor() {
    this.googleService = new GoogleCalendarService()
    this.extractionService = new ClientExtractionService()
    this.deduplicationService = new ClientDeduplicationService()
  }

  /**
   * Main sync orchestration - initial sync from calendar
   * Used when trainer clicks "Sync Clients from Calendar" button
   */
  async syncClientsFromCalendar(
    trainerId: string,
    options: SyncOptions = {}
  ): Promise<SyncResult> {
    console.log("🔄 Starting client sync from calendar for trainer:", trainerId)

    const { lookbackDays = 30, source = "google" } = options

    // Get trainer settings
    const settings = await prisma.trainerSettings.findUnique({
      where: { trainerId },
    })

    if (!settings) {
      throw new Error("Trainer settings not found")
    }

    // Only support Google for now
    if (source !== "google") {
      throw new Error(`Calendar source "${source}" not yet supported`)
    }

    if (!settings.googleCalendarConnected) {
      throw new Error("Google Calendar not connected")
    }

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - lookbackDays)

    console.log(`📅 Fetching events from ${startDate.toISOString()} to ${endDate.toISOString()}`)

    // Fetch calendar events
    const googleEvents = await this.googleService.listEvents(
      trainerId,
      startDate.toISOString(),
      endDate.toISOString()
    )

    console.log(`📋 Found ${googleEvents.length} calendar events`)

    // Extract clients from events
    const extractedClients = this.extractionService.extractClientsFromEvents(
      googleEvents
    )

    console.log(`👤 Extracted ${extractedClients.length} potential clients`)

    // Aggregate duplicates (same name/email → single profile with multiple event IDs)
    const aggregatedClients = this.aggregateExtractedClients(extractedClients)

    console.log(`📊 Aggregated to ${aggregatedClients.length} unique clients`)

    // Create pending profiles (with deduplication)
    const result = await this.createPendingProfiles(
      settings.workspaceId,
      trainerId,
      aggregatedClients,
      source
    )

    // Update sync timestamp
    await prisma.trainerSettings.update({
      where: { trainerId },
      data: {
        lastClientSyncAt: new Date(),
        hasCompletedInitialClientSync: true,
      },
    })

    console.log(`✅ Client sync complete:`, {
      extracted: extractedClients.length,
      created: result.createdCount,
      duplicates: result.duplicateCount,
    })

    return {
      extractedCount: extractedClients.length,
      ...result,
    }
  }

  /**
   * Ongoing sync hook - called by calendar sync service
   * Extracts clients from newly synced events
   */
  async extractClientsFromNewEvents(
    trainerId: string,
    events: GoogleCalendarEvent[]
  ): Promise<void> {
    console.log(`🔍 Checking ${events.length} new events for client extraction`)

    const settings = await prisma.trainerSettings.findUnique({
      where: { trainerId },
    })

    if (!settings?.autoClientSyncEnabled) {
      console.log("⏭️ Auto client sync disabled, skipping extraction")
      return
    }

    // Extract clients from events
    const extractedClients = this.extractionService.extractClientsFromEvents(events)

    if (extractedClients.length === 0) {
      console.log("👤 No potential clients found in new events")
      return
    }

    console.log(`👤 Extracted ${extractedClients.length} potential clients from new events`)

    // Aggregate duplicates
    const aggregatedClients = this.aggregateExtractedClients(extractedClients)

    // Create pending profiles
    await this.createPendingProfiles(
      settings.workspaceId,
      trainerId,
      aggregatedClients,
      "google"
    )

    console.log(`✅ Created pending profiles from new events`)
  }

  /**
   * Aggregate extracted clients by name/email
   * Combines multiple event occurrences into a single profile with higher confidence
   */
  private aggregateExtractedClients(
    extractedClients: ExtractedClient[]
  ): Array<ExtractedClient & { occurrenceCount: number; sourceEventIds: string[] }> {
    const aggregationMap = new Map<
      string,
      ExtractedClient & { occurrenceCount: number; sourceEventIds: string[] }
    >()

    for (const client of extractedClients) {
      // Use email as key if available, otherwise use normalized name
      const key = client.email
        ? client.email.toLowerCase()
        : client.name.toLowerCase().trim()

      const existing = aggregationMap.get(key)

      if (existing) {
        // Update existing entry
        existing.occurrenceCount++
        existing.sourceEventIds.push(client.sourceEventId)

        // Boost confidence if seen multiple times
        if (existing.occurrenceCount >= 3) {
          existing.confidence = "high"
          existing.confidenceScore = Math.max(existing.confidenceScore, 60)
          existing.reason = `seen ${existing.occurrenceCount} times, ${existing.reason}`
        } else if (existing.occurrenceCount >= 2) {
          if (existing.confidence === "low") {
            existing.confidence = "medium"
            existing.confidenceScore = Math.max(existing.confidenceScore, 30)
          }
          existing.reason = `seen ${existing.occurrenceCount} times, ${existing.reason}`
        }

        // Use email from any occurrence
        if (client.email && !existing.email) {
          existing.email = client.email
          existing.confidenceScore += 30
          if (existing.confidenceScore >= 60) {
            existing.confidence = "high"
          } else if (existing.confidenceScore >= 30) {
            existing.confidence = "medium"
          }
        }
      } else {
        // Add new entry
        aggregationMap.set(key, {
          ...client,
          occurrenceCount: 1,
          sourceEventIds: [client.sourceEventId],
        })
      }
    }

    return Array.from(aggregationMap.values())
  }

  /**
   * Create pending client profiles with deduplication
   */
  private async createPendingProfiles(
    workspaceId: string,
    trainerId: string,
    clients: Array<ExtractedClient & { occurrenceCount: number; sourceEventIds: string[] }>,
    source: "google" | "microsoft" | "apple"
  ): Promise<{
    createdCount: number
    duplicateCount: number
    pendingProfiles: Array<{
      id: string
      extractedName: string
      extractedEmail: string | null
      confidence: string
      occurrenceCount: number
    }>
  }> {
    let createdCount = 0
    let duplicateCount = 0
    const pendingProfiles: Array<{
      id: string
      extractedName: string
      extractedEmail: string | null
      confidence: string
      occurrenceCount: number
    }> = []

    // Get trainer's default session rate from settings
    const trainerSettings = await prisma.trainerSettings.findUnique({
      where: { trainerId },
    })
    const defaultSessionRate = trainerSettings?.defaultIndividualSessionRate || 0

    for (const client of clients) {
      // Check for duplicates
      const duplicate = await this.deduplicationService.findAnyDuplicate(
        workspaceId,
        trainerId,
        client.name,
        client.email
      )

      if (duplicate) {
        console.log(
          `⏭️ Skipping duplicate: "${client.name}" (${duplicate.matchReason})`
        )
        duplicateCount++

        // If duplicate is a pending profile, update occurrence count and event IDs
        if (duplicate.type === "pending_profile") {
          await prisma.pendingClientProfile.update({
            where: { id: duplicate.profile.id },
            data: {
              occurrenceCount: duplicate.profile.occurrenceCount + client.occurrenceCount,
              sourceEventIds: [
                ...duplicate.profile.sourceEventIds,
                ...client.sourceEventIds,
              ],
            },
          })
          console.log(`  📊 Updated occurrence count for existing pending profile`)
        }

        continue
      }

      // Create pending profile
      const profile = await prisma.pendingClientProfile.create({
        data: {
          workspaceId,
          trainerId,
          source,
          sourceEventIds: client.sourceEventIds,
          extractedName: client.name,
          extractedEmail: client.email || null,
          extractionConfidence: client.confidence,
          extractionReason: client.reason,
          firstSeenDate: new Date(),
          occurrenceCount: client.occurrenceCount,
          status: "pending",
          defaultSessionRate: defaultSessionRate,
          defaultBillingFrequency: "PER_SESSION",
        },
      })

      createdCount++
      pendingProfiles.push({
        id: profile.id,
        extractedName: profile.extractedName,
        extractedEmail: profile.extractedEmail,
        confidence: profile.extractionConfidence,
        occurrenceCount: profile.occurrenceCount,
      })

      console.log(
        `✅ Created pending profile: "${client.name}" (${client.confidence} confidence, ${client.occurrenceCount} occurrences)`
      )
    }

    return { createdCount, duplicateCount, pendingProfiles }
  }
}
