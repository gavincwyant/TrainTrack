"use client"

import { Settings } from "../useTrainerSettings"
import { useDarkMode } from "@/lib/contexts/dark-mode-context"
import { useState } from "react"

type Props = {
  settings: Settings | null
  isLoading: boolean
}

export function UIPreferencesSettings({ settings, isLoading }: Props) {
  const { isDarkMode, setDarkMode } = useDarkMode()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDarkModeToggle = async (enabled: boolean) => {
    // Optimistic UI update
    setDarkMode(enabled)
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch("/api/trainer-settings/dark-mode", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ darkModeEnabled: enabled }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save dark mode preference")
      }
    } catch (err) {
      // Revert on error
      setDarkMode(!enabled)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="text-gray-600 dark:text-gray-400">Loading settings...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">UI Preferences</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Customize your application appearance and interface settings
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
          <div className="flex items-start">
            <div className="flex-1 text-sm text-red-800 dark:text-red-300">{error}</div>
            <button
              onClick={() => setError(null)}
              className="ml-3 text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex-1">
            <label htmlFor="darkModeToggle" className="block text-sm font-medium text-gray-900 dark:text-white">
              Dark Mode
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Enable dark mode for a more comfortable viewing experience in low-light environments
            </p>
          </div>
          <div className="ml-4">
            <button
              id="darkModeToggle"
              type="button"
              role="switch"
              aria-checked={isDarkMode}
              disabled={isSaving}
              onClick={() => handleDarkModeToggle(!isDarkMode)}
              className={`
                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
                transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                ${isDarkMode ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"}
              `}
            >
              <span className="sr-only">Toggle dark mode</span>
              <span
                aria-hidden="true"
                className={`
                  pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
                  transition duration-200 ease-in-out
                  ${isDarkMode ? "translate-x-5" : "translate-x-0"}
                `}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">About Dark Mode:</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
          <li>Dark mode reduces eye strain in low-light conditions</li>
          <li>Your preference is saved and synced across all devices</li>
          <li>The interface will automatically adjust colors for better readability</li>
        </ul>
      </div>
    </div>
  )
}
