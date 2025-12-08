/**
 * Client Deduplication Service
 *
 * Handles detecting duplicate clients across:
 * 1. Existing User records with role CLIENT
 * 2. Existing PendingClientProfile records
 *
 * Prevents creating duplicate pending profiles or approving duplicates.
 */

import { prisma } from "@/lib/db"
import { User, PendingClientProfile } from "@prisma/client"

export interface ExistingClientMatch {
  type: "existing_client"
  client: User
  matchReason: string
}

export interface PendingProfileMatch {
  type: "pending_profile"
  profile: PendingClientProfile
  matchReason: string
}

export type DuplicateMatch = ExistingClientMatch | PendingProfileMatch

export class ClientDeduplicationService {
  /**
   * Check if a client already exists (by name or email)
   */
  async findMatchingClient(
    workspaceId: string,
    trainerId: string,
    name: string,
    email?: string
  ): Promise<ExistingClientMatch | null> {
    // First try exact email match if email provided
    if (email) {
      const client = await prisma.user.findFirst({
        where: {
          workspaceId,
          email: email.toLowerCase(),
          role: "CLIENT",
        },
      })

      if (client) {
        return {
          type: "existing_client",
          client,
          matchReason: "email exact match",
        }
      }
    }

    // Try exact name match (case-insensitive)
    const normalizedName = this.normalizeName(name)
    const clients = await prisma.user.findMany({
      where: {
        workspaceId,
        role: "CLIENT",
        clientProfile: {
          isNot: null, // Must have a client profile
        },
      },
      include: {
        clientProfile: true,
      },
    })

    for (const client of clients) {
      const clientNormalizedName = this.normalizeName(client.fullName)

      // Exact normalized name match
      if (clientNormalizedName === normalizedName) {
        return {
          type: "existing_client",
          client,
          matchReason: "name exact match",
        }
      }

      // First + last name fuzzy match
      if (this.isFuzzyNameMatch(normalizedName, clientNormalizedName)) {
        return {
          type: "existing_client",
          client,
          matchReason: "name fuzzy match",
        }
      }
    }

    return null
  }

  /**
   * Check if a pending profile already exists
   * Checks both pending AND rejected profiles to prevent re-showing rejected clients
   */
  async findMatchingPendingProfile(
    workspaceId: string,
    trainerId: string,
    name: string,
    email?: string
  ): Promise<PendingProfileMatch | null> {
    // First try exact email match if email provided
    if (email) {
      const profile = await prisma.pendingClientProfile.findFirst({
        where: {
          workspaceId,
          trainerId,
          status: { in: ["pending", "rejected"] }, // Include rejected profiles
          extractedEmail: email.toLowerCase(),
        },
      })

      if (profile) {
        return {
          type: "pending_profile",
          profile,
          matchReason: "email exact match",
        }
      }
    }

    // Try name match
    const normalizedName = this.normalizeName(name)
    const profiles = await prisma.pendingClientProfile.findMany({
      where: {
        workspaceId,
        trainerId,
        status: { in: ["pending", "rejected"] }, // Include rejected profiles
      },
    })

    for (const profile of profiles) {
      const profileNormalizedName = this.normalizeName(profile.extractedName)

      // Exact normalized name match
      if (profileNormalizedName === normalizedName) {
        return {
          type: "pending_profile",
          profile,
          matchReason: "name exact match",
        }
      }

      // Fuzzy name match
      if (this.isFuzzyNameMatch(normalizedName, profileNormalizedName)) {
        return {
          type: "pending_profile",
          profile,
          matchReason: "name fuzzy match",
        }
      }
    }

    return null
  }

  /**
   * Check for any duplicate (existing client OR pending profile)
   */
  async findAnyDuplicate(
    workspaceId: string,
    trainerId: string,
    name: string,
    email?: string
  ): Promise<DuplicateMatch | null> {
    // Check existing clients first
    const existingClient = await this.findMatchingClient(
      workspaceId,
      trainerId,
      name,
      email
    )
    if (existingClient) {
      return existingClient
    }

    // Check pending profiles
    const pendingProfile = await this.findMatchingPendingProfile(
      workspaceId,
      trainerId,
      name,
      email
    )
    if (pendingProfile) {
      return pendingProfile
    }

    return null
  }

  /**
   * Normalize name for comparison
   * - Lowercase
   * - Trim whitespace
   * - Remove extra spaces
   * - Remove common punctuation
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ") // Collapse multiple spaces
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") // Remove punctuation
      .trim()
  }

  /**
   * Fuzzy name matching
   * Returns true if names are similar enough to be considered duplicates
   *
   * Handles cases like:
   * - "John Smith" vs "Smith John" (reversed)
   * - "John Smith" vs "John" (partial)
   * - "John Smith" vs "J. Smith" (abbreviated first name)
   */
  private isFuzzyNameMatch(name1: string, name2: string): boolean {
    const words1 = name1.split(/\s+/).filter((w) => w.length > 0)
    const words2 = name2.split(/\s+/).filter((w) => w.length > 0)

    // If either is a single word, check if it matches any word in the other
    if (words1.length === 1 || words2.length === 1) {
      return words1.some((w1) => words2.some((w2) => w1 === w2))
    }

    // Check if all words from shorter name appear in longer name
    const shorter = words1.length <= words2.length ? words1 : words2
    const longer = words1.length > words2.length ? words1 : words2

    const matchCount = shorter.filter((word) => {
      // Exact match
      if (longer.includes(word)) {
        return true
      }

      // Check for abbreviated match (e.g., "j" matches "john")
      if (word.length === 1) {
        return longer.some((w) => w.startsWith(word))
      }

      return false
    }).length

    // Consider it a match if 75% of words match
    return matchCount / shorter.length >= 0.75
  }

  /**
   * Validate email format
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Check if email is already in use by ANY user (not just clients)
   * Used during approval to prevent email conflicts
   */
  async isEmailInUse(workspaceId: string, email: string): Promise<boolean> {
    const user = await prisma.user.findFirst({
      where: {
        workspaceId,
        email: email.toLowerCase(),
      },
    })

    return !!user
  }
}
