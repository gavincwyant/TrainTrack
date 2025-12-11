"use client"

import { useEffect, useState } from "react"
import { useClientSettings } from "./useClientSettings"
import { ProfileSettings } from "./settings/ProfileSettings"
import { NotificationSettings } from "./settings/NotificationSettings"

type Props = {
  isOpen: boolean
  onClose: () => void
}

type Category = "profile" | "notifications"

export function ClientSettingsModal({ isOpen, onClose }: Props) {
  const [activeCategory, setActiveCategory] = useState<Category>("profile")
  const [showSuccess, setShowSuccess] = useState(false)

  const {
    settings,
    isLoading,
    error,
    isSaving,
    fetchSettings,
    handlePhoneChange,
    clearError,
  } = useClientSettings()

  // Fetch settings when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSettings()
    }
  }, [isOpen, fetchSettings])

  // Keyboard handler (Escape to close)
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = "unset"
    }
  }, [isOpen, onClose])

  // Show success message temporarily after successful updates
  const handleSuccessfulUpdate = async (updateFn: () => Promise<boolean>) => {
    const success = await updateFn()
    if (success) {
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    }
    return success
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-3xl mx-4 sm:mx-auto min-h-0 max-h-[90vh] md:h-[500px] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mx-6 mt-4 rounded-md bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
              <div className="flex items-start">
                <div className="flex-1 text-sm text-red-800 dark:text-red-300">{error}</div>
                <button
                  onClick={clearError}
                  className="ml-3 text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {showSuccess && (
            <div className="mx-6 mt-4 rounded-md bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-800">
              <div className="text-sm text-green-800 dark:text-green-300">Settings saved successfully!</div>
            </div>
          )}

          {/* Content Area with Sidebar */}
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
            {/* Mobile Tab Pills - visible on mobile only */}
            <div className="md:hidden flex overflow-x-auto gap-2 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
              {(["profile", "notifications"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium min-h-[44px] transition-colors ${
                    activeCategory === cat
                      ? "bg-blue-600 dark:bg-blue-500 text-white"
                      : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>

            {/* Desktop Sidebar - hidden on mobile */}
            <div className="hidden md:block w-48 flex-shrink-0 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveCategory("profile")}
                  className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeCategory === "profile"
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  Profile
                </button>
                <button
                  onClick={() => setActiveCategory("notifications")}
                  className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeCategory === "notifications"
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  Notifications
                </button>
              </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {activeCategory === "profile" && (
                <ProfileSettings
                  settings={settings}
                  onPhoneChange={(phone) => handleSuccessfulUpdate(() => handlePhoneChange(phone))}
                  isLoading={isLoading}
                  isSaving={isSaving}
                />
              )}

              {activeCategory === "notifications" && <NotificationSettings />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
