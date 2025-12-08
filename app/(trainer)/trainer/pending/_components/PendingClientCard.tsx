"use client"

import { format } from "date-fns"
import { useState } from "react"

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
}

type Props = {
  profile: PendingClientProfile
  onApprove: (id: string) => void
  onReject: (id: string) => void
  isProcessing: boolean
}

export function PendingClientCard({ profile, onApprove, onReject, isProcessing }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getConfidenceBadgeColor = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "bg-green-100 text-green-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const displayName = profile.reviewedName || profile.extractedName
  const displayEmail = profile.reviewedEmail || profile.extractedEmail

  return (
    <div className="bg-white shadow rounded-lg p-6 border-l-4 border-purple-500">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{displayName}</h3>
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${getConfidenceBadgeColor(
                profile.extractionConfidence
              )}`}
            >
              {profile.extractionConfidence} confidence
            </span>
            {profile.occurrenceCount > 1 && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                {profile.occurrenceCount} occurrences
              </span>
            )}
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            {displayEmail && (
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
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <span>{displayEmail}</span>
              </div>
            )}

            {profile.extractedPhone && (
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
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                <span>{profile.extractedPhone}</span>
              </div>
            )}

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
              <span>First seen: {format(new Date(profile.firstSeenDate), "PPP")}</span>
            </div>

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
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                Default rate: ${profile.defaultSessionRate}/{profile.defaultBillingFrequency === "PER_SESSION" ? "session" : "month"}
              </span>
            </div>

            {isExpanded && (
              <div className="bg-purple-50 border border-purple-200 rounded p-3 mt-3">
                <p className="text-xs text-purple-800">
                  <strong>Why detected:</strong> {profile.extractionReason}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3 text-xs text-purple-600 hover:text-purple-800 font-medium"
          >
            {isExpanded ? "Show less" : "Show detection details"}
          </button>
        </div>

        <div className="flex gap-2 ml-4">
          <button
            onClick={() => onApprove(profile.id)}
            disabled={isProcessing}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? "Processing..." : "Edit & Approve"}
          </button>
          <button
            onClick={() => onReject(profile.id)}
            disabled={isProcessing}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reject
          </button>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          <strong>What happens:</strong>
          <br />
          • <strong>Edit & Approve:</strong> Review details and create client profile
          <br />• <strong>Reject:</strong> Remove from pending list (won't be suggested again)
        </p>
      </div>
    </div>
  )
}
