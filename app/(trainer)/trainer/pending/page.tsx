"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { PendingClientsTab } from "./_components/PendingClientsTab"

type PendingAppointment = {
  id: string
  externalEventTitle: string
  startTime: string
  endTime: string
  matchConfidence: string
  matchReason: string | null
  suggestedClient: {
    id: string
    fullName: string
    email: string
    clientProfile: {
      sessionRate: number
    } | null
  } | null
}

type TabType = "appointments" | "clients"

export default function PendingAppointmentsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("appointments")
  const [pendingAppointments, setPendingAppointments] = useState<PendingAppointment[]>([])
  const [pendingProfilesCount, setPendingProfilesCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    if (activeTab === "appointments") {
      fetchPendingAppointments()
    }
    fetchPendingProfilesCount()
  }, [activeTab])

  const fetchPendingProfilesCount = async () => {
    try {
      const response = await fetch("/api/pending-client-profiles?status=pending")
      const data = await response.json()
      if (response.ok) {
        setPendingProfilesCount(data.pendingProfiles?.length || 0)
      }
    } catch (err) {
      // Silently fail - count is not critical
      console.error("Failed to fetch pending profiles count:", err)
    }
  }

  const fetchPendingAppointments = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/pending-appointments")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch pending appointments")
      }

      setPendingAppointments(data.pendingAppointments)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (id: string, clientId?: string) => {
    setProcessingId(id)
    try {
      const response = await fetch(`/api/pending-appointments/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to approve appointment")
      }

      // Refresh list
      await fetchPendingAppointments()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (id: string) => {
    setProcessingId(id)
    try {
      const response = await fetch(`/api/pending-appointments/${id}/reject`, {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to reject appointment")
      }

      // Refresh list
      await fetchPendingAppointments()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setProcessingId(null)
    }
  }

  const getConfidenceBadgeColor = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300"
      case "medium":
        return "bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-300"
      case "low":
        return "bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300"
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300"
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Pending Reviews</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Review calendar events and client profiles detected from your Google Calendar
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("appointments")}
            className={`${
              activeTab === "appointments"
                ? "border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm relative`}
          >
            Pending Appointments
            {pendingAppointments.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 dark:bg-red-500 rounded-full">
                {pendingAppointments.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("clients")}
            className={`${
              activeTab === "clients"
                ? "border-purple-500 dark:border-purple-400 text-purple-600 dark:text-purple-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm relative`}
          >
            Pending Client Profiles
            {pendingProfilesCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 dark:bg-red-500 rounded-full">
                {pendingProfilesCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "appointments" ? (
        <div className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-4 border border-red-200 dark:border-red-800">
              <div className="text-sm text-red-800 dark:text-red-300">{error}</div>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">Loading pending appointments...</p>
            </div>
          ) : pendingAppointments.length === 0 ? (
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">All caught up!</h3>
              <p className="text-gray-600 dark:text-gray-400">No pending appointments to review.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingAppointments.map((pending) => (
                <div
                  key={pending.id}
                  className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6 border-l-4 border-blue-500 dark:border-blue-400"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {pending.externalEventTitle}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getConfidenceBadgeColor(
                            pending.matchConfidence
                          )}`}
                        >
                          {pending.matchConfidence} confidence
                        </span>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <span>
                            {format(new Date(pending.startTime), "PPP 'at' p")} -{" "}
                            {format(new Date(pending.endTime), "p")}
                          </span>
                        </div>

                        {pending.suggestedClient && (
                          <div className="flex items-center gap-2">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                            <span>
                              <strong>Suggested Client:</strong> {pending.suggestedClient.fullName}
                              {pending.suggestedClient.clientProfile && (
                                <span className="ml-2 text-gray-500 dark:text-gray-400">
                                  (${pending.suggestedClient.clientProfile.sessionRate}/session)
                                </span>
                              )}
                            </span>
                          </div>
                        )}

                        {pending.matchReason && (
                          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-3 mt-3">
                            <p className="text-xs text-blue-800 dark:text-blue-300">
                              <strong>Why this match?</strong> {pending.matchReason}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0 sm:ml-4">
                      <button
                        onClick={() =>
                          handleApprove(
                            pending.id,
                            pending.suggestedClient?.id
                          )
                        }
                        disabled={processingId === pending.id || !pending.suggestedClient}
                        className="px-4 py-2 min-h-[44px] bg-green-600 dark:bg-green-500 text-white text-sm rounded-md hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingId === pending.id ? "Processing..." : "Approve"}
                      </button>
                      <button
                        onClick={() => handleReject(pending.id)}
                        disabled={processingId === pending.id}
                        className="px-4 py-2 min-h-[44px] bg-red-600 dark:bg-red-500 text-white text-sm rounded-md hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Reject
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      <strong>What happens:</strong>
                      <br />
                      • <strong>Approve:</strong> Converts to billable appointment with{" "}
                      {pending.suggestedClient?.fullName || "selected client"}
                      <br />• <strong>Reject:</strong> Creates as blocked time (non-billable)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && pendingAppointments.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-yellow-900 dark:text-yellow-300 mb-2">
                Important Notes:
              </h3>
              <ul className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1 list-disc list-inside">
                <li>Approved appointments will be added to client invoices</li>
                <li>High confidence matches are very likely correct</li>
                <li>Medium/low confidence matches should be reviewed carefully</li>
                <li>You can always manually edit appointments after approval</li>
              </ul>
            </div>
          )}
        </div>
      ) : (
        <PendingClientsTab onCountChange={setPendingProfilesCount} />
      )}
    </div>
  )
}
