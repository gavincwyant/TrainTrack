"use client"

import { useState } from "react"
import Link from "next/link"

type Props = {
  onSync?: () => void
}

export function ClientSyncBanner({ onSync }: Props) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{
    extractedCount: number
    createdCount: number
    duplicateCount: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDismissing, setIsDismissing] = useState(false)

  const handleDismiss = async () => {
    setIsDismissing(true)
    try {
      const response = await fetch("/api/trainer-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hasCompletedInitialClientSync: true }),
      })

      if (!response.ok) {
        throw new Error("Failed to dismiss banner")
      }

      onSync?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to dismiss banner")
    } finally {
      setIsDismissing(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    setError(null)
    setSyncResult(null)

    try {
      // First, enable auto-sync
      const settingsResponse = await fetch("/api/trainer-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoClientSyncEnabled: true }),
      })

      if (!settingsResponse.ok) {
        throw new Error("Failed to enable auto-sync")
      }

      // Then sync clients
      const response = await fetch("/api/clients/sync-from-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lookbackDays: 30 }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync clients")
      }

      setSyncResult({
        extractedCount: data.extractedCount,
        createdCount: data.createdCount,
        duplicateCount: data.duplicateCount,
      })

      onSync?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync clients")
    } finally {
      setIsSyncing(false)
    }
  }

  if (syncResult) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-green-900 dark:text-green-200">Sync Complete!</h3>
            <div className="mt-2 text-sm text-green-800 dark:text-green-300">
              <p>
                Found <strong>{syncResult.extractedCount}</strong> potential clients from your calendar.
              </p>
              <p>
                Created <strong>{syncResult.createdCount}</strong> pending profiles for review.
                {syncResult.duplicateCount > 0 && (
                  <span> ({syncResult.duplicateCount} were duplicates)</span>
                )}
              </p>
            </div>
            {syncResult.createdCount > 0 && (
              <div className="mt-3">
                <Link
                  href="/trainer/pending?tab=clients"
                  className="text-sm font-medium text-green-700 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                >
                  Review pending client profiles →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-900 dark:text-red-200">Sync Failed</h3>
            <div className="mt-1 text-sm text-red-800 dark:text-red-300">{error}</div>
          </div>
          <button
            onClick={() => setError(null)}
            className="flex-shrink-0 text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-blue-600 dark:text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200">
            Sync Clients from Google Calendar
          </h3>
          <div className="mt-1 text-sm text-blue-800 dark:text-blue-300">
            <p>
              We can automatically detect potential clients from your past calendar appointments.
              This will scan the last 30 days of your Google Calendar for client names.
            </p>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={handleSync}
              disabled={isSyncing || isDismissing}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSyncing ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Syncing...
                </>
              ) : (
                "Sync Clients from Calendar"
              )}
            </button>
            <button
              onClick={handleDismiss}
              disabled={isSyncing || isDismissing}
              className="text-sm text-blue-700 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDismissing ? "Dismissing..." : "Don't show again"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
