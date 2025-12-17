"use client"

import { useState, useEffect } from "react"
import { PendingClientCard } from "./PendingClientCard"
import { ApproveClientModal } from "./ApproveClientModal"

type PendingClientProfile = {
  id: string
  extractedName: string
  extractedEmail: string | null
  extractedPhone: string | null
  extractionConfidence: string
  extractionReason: string
  firstSeenDate: string
  occurrenceCount: number
  defaultBillingFrequency: string
  defaultSessionRate: number
  reviewedName: string | null
  reviewedEmail: string | null
  reviewedPhone: string | null
  reviewedNotes: string | null
}

type TrainerDefaults = {
  defaultIndividualSessionRate: number | null
  defaultGroupSessionRate: number | null
}

type Props = {
  onCountChange?: (count: number) => void
}

export function PendingClientsTab({ onCountChange }: Props) {
  const [pendingProfiles, setPendingProfiles] = useState<PendingClientProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<PendingClientProfile | null>(null)
  const [trainerDefaults, setTrainerDefaults] = useState<TrainerDefaults | null>(null)

  useEffect(() => {
    fetchPendingProfiles()
    fetchTrainerSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchPendingProfiles = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/pending-client-profiles?status=pending")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch pending client profiles")
      }

      setPendingProfiles(data.pendingProfiles)
      onCountChange?.(data.pendingProfiles.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTrainerSettings = async () => {
    try {
      const response = await fetch("/api/trainer-settings")
      const data = await response.json()

      if (response.ok && data.settings) {
        setTrainerDefaults({
          defaultIndividualSessionRate: data.settings.defaultIndividualSessionRate,
          defaultGroupSessionRate: data.settings.defaultGroupSessionRate,
        })
      }
    } catch (err) {
      // Silently fail - defaults will just be empty
      console.error("Failed to fetch trainer settings:", err)
    }
  }

  const handleApprove = async (id: string) => {
    const profile = pendingProfiles.find((p) => p.id === id)
    if (!profile) return

    setSelectedProfile(profile)
  }

  const handleApproveSubmit = async (data: {
    fullName: string
    email: string | null
    phone: string | null
    billingFrequency: "PER_SESSION" | "MONTHLY"
    sessionRate: number
    groupSessionRate: number | null
    notes: string | null
    autoInvoiceEnabled: boolean
  }) => {
    if (!selectedProfile) return

    setProcessingId(selectedProfile.id)
    try {
      const response = await fetch(
        `/api/pending-client-profiles/${selectedProfile.id}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to approve profile")
      }

      // Refresh list
      await fetchPendingProfiles()
      setSelectedProfile(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      throw err // Re-throw so modal can handle it
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (id: string) => {
    setProcessingId(id)
    try {
      const response = await fetch(`/api/pending-client-profiles/${id}/reject`, {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to reject profile")
      }

      // Refresh list
      await fetchPendingProfiles()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <>
      <div className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-4 border border-red-200 dark:border-red-800">
            <div className="text-sm text-red-800 dark:text-red-300">{error}</div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Loading pending client profiles...</p>
          </div>
        ) : pendingProfiles.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
            <div className="text-gray-400 dark:text-gray-500 mb-4">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No pending client profiles</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Sync your calendar to automatically detect potential clients.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {pendingProfiles.map((profile) => (
                <PendingClientCard
                  key={profile.id}
                  profile={profile}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isProcessing={processingId === profile.id}
                  trainerDefaults={trainerDefaults}
                />
              ))}
            </div>

            <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-purple-900 dark:text-purple-300 mb-2">
                Important Notes:
              </h3>
              <ul className="text-sm text-purple-800 dark:text-purple-300 space-y-1 list-disc list-inside">
                <li>High confidence detections are very likely real clients</li>
                <li>Multiple occurrences indicate recurring appointments</li>
                <li>Review and edit details before approving</li>
                <li>Rejected profiles won&apos;t be suggested again</li>
              </ul>
            </div>
          </>
        )}
      </div>

      {selectedProfile && (
        <ApproveClientModal
          profile={selectedProfile}
          isOpen={!!selectedProfile}
          onClose={() => setSelectedProfile(null)}
          onSubmit={handleApproveSubmit}
          trainerDefaults={trainerDefaults}
        />
      )}
    </>
  )
}
