"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"

export function CalendarToast() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  useEffect(() => {
    const success = searchParams.get("calendarSuccess")
    const error = searchParams.get("calendarError")

    if (success === "connected") {
      setToast({ type: "success", message: "Google Calendar connected successfully!" })
    } else if (error) {
      const errorMessages: Record<string, string> = {
        NoCode: "Authorization was cancelled",
        NoTokens: "Failed to get calendar access",
        NoWorkspace: "No workspace found",
        CallbackFailed: "Failed to connect calendar",
        access_denied: "Calendar access was denied",
      }
      setToast({ type: "error", message: errorMessages[error] || `Calendar error: ${error}` })
    }

    // Clear the URL params after showing toast
    if (success || error) {
      const timeout = setTimeout(() => {
        router.replace("/trainer/dashboard", { scroll: false })
      }, 100)
      return () => clearTimeout(timeout)
    }
  }, [searchParams, router])

  useEffect(() => {
    if (toast) {
      const timeout = setTimeout(() => {
        setToast(null)
      }, 5000)
      return () => clearTimeout(timeout)
    }
  }, [toast])

  if (!toast) return null

  return (
    <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right duration-300">
      <div
        className={`px-4 py-3 rounded-lg shadow-lg border ${
          toast.type === "success"
            ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
            : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
        }`}
      >
        <div className="flex items-center gap-3">
          {toast.type === "success" ? (
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span className="font-medium">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
