"use client"

import React, { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useTrainerSettings } from "./useTrainerSettings"
import { SchedulingSettings } from "./settings/SchedulingSettings"
import { CalendarSettings } from "./settings/CalendarSettings"
import { InvoicingSettings } from "./settings/InvoicingSettings"
import { PricingSettings } from "./settings/PricingSettings"

type Props = {
  isOpen: boolean
  onClose: () => void
}

type Category = "scheduling" | "calendar" | "pricing" | "invoicing"

export function SettingsModal({ isOpen, onClose }: Props) {
  const [activeCategory, setActiveCategory] = useState<Category>("scheduling")
  const [showSuccess, setShowSuccess] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Wait for client-side mount before rendering portal
  useEffect(() => {
    setMounted(true)
  }, [])

  const {
    settings,
    isLoading,
    error,
    isSaving,
    isSyncing,
    fetchSettings,
    updateSettings,
    handleConnectGoogle,
    handleDisconnectGoogle,
    handleToggleAutoSync,
    handleToggleClientSync,
    handleToggleAutoInvoicing,
    handleMonthlyInvoiceDayChange,
    handleDefaultDueDaysChange,
    handleIndividualSessionRateChange,
    handleGroupSessionRateChange,
    handleGroupSessionMatchingLogicChange,
    handleManualSync,
    clearError,
  } = useTrainerSettings()

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

  if (!isOpen || !mounted) return null

  const navItems: { key: Category; label: string; icon: React.ReactNode }[] = [
    {
      key: "scheduling",
      label: "Scheduling",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      key: "calendar",
      label: "Calendar",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      key: "pricing",
      label: "Pricing",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      key: "invoicing",
      label: "Invoicing",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ]

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-0 md:p-6">
        <div
          className="relative bg-white dark:bg-gray-900 md:rounded-2xl w-full max-w-6xl md:mx-auto min-h-0 h-[100dvh] md:h-[720px] md:max-h-[90vh] overflow-hidden flex flex-col shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25),0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)] animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-b from-gray-50/80 to-transparent dark:from-gray-800/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              <svg
                className="h-5 w-5"
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
            <div className="mx-6 mt-4 rounded-xl bg-red-50 dark:bg-red-900/20 p-4 border border-red-100 dark:border-red-800/50">
              <div className="flex items-start gap-3">
                <div className="p-1 rounded-full bg-red-100 dark:bg-red-800/30">
                  <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 text-sm text-red-800 dark:text-red-300">{error}</div>
                <button
                  onClick={clearError}
                  className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {showSuccess && (
            <div className="absolute top-20 right-6 z-10 rounded-xl bg-green-50 dark:bg-green-900/30 px-4 py-3 border border-green-100 dark:border-green-800/50 shadow-lg shadow-green-500/10 animate-in slide-in-from-top duration-200">
              <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-300">
                <div className="p-0.5 rounded-full bg-green-500 text-white">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                Settings saved
              </div>
            </div>
          )}

          {/* Content Area with Sidebar */}
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
            {/* Mobile Tab Pills - visible on mobile only */}
            <div className="md:hidden flex overflow-x-auto gap-2 p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex-shrink-0">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveCategory(item.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium min-h-[44px] transition-all ${
                    activeCategory === item.key
                      ? "bg-blue-600 dark:bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                      : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>

            {/* Desktop Sidebar - hidden on mobile */}
            <div className="hidden md:flex flex-col w-56 flex-shrink-0 bg-gray-50/70 dark:bg-gray-800/50 border-r border-gray-100 dark:border-gray-800 p-4 overflow-y-auto">
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setActiveCategory(item.key)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                      activeCategory === item.key
                        ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-600/50"
                        : "text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-gray-200"
                    }`}
                  >
                    <span className={activeCategory === item.key ? "text-blue-500 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}>
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
              {activeCategory === "scheduling" && (
                <SchedulingSettings
                  settings={settings}
                  onUpdate={(data) => handleSuccessfulUpdate(() => updateSettings(data))}
                  isLoading={isLoading}
                  isSaving={isSaving}
                />
              )}

              {activeCategory === "calendar" && (
                <CalendarSettings
                  settings={settings}
                  isLoading={isLoading}
                  isSyncing={isSyncing}
                  onConnectGoogle={handleConnectGoogle}
                  onDisconnectGoogle={() => handleSuccessfulUpdate(handleDisconnectGoogle)}
                  onToggleAutoSync={(enabled) => handleSuccessfulUpdate(() => handleToggleAutoSync(enabled))}
                  onToggleClientSync={(enabled) => handleSuccessfulUpdate(() => handleToggleClientSync(enabled))}
                  onManualSync={() => handleSuccessfulUpdate(handleManualSync)}
                />
              )}

              {activeCategory === "pricing" && (
                <PricingSettings
                  settings={settings}
                  isLoading={isLoading}
                  onIndividualRateChange={(rate) => handleSuccessfulUpdate(() => handleIndividualSessionRateChange(rate))}
                  onGroupRateChange={(rate) => handleSuccessfulUpdate(() => handleGroupSessionRateChange(rate))}
                  onGroupMatchingLogicChange={(logic) => handleSuccessfulUpdate(() => handleGroupSessionMatchingLogicChange(logic))}
                />
              )}

              {activeCategory === "invoicing" && (
                <InvoicingSettings
                  settings={settings}
                  isLoading={isLoading}
                  onToggleAutoInvoicing={(enabled) => handleSuccessfulUpdate(() => handleToggleAutoInvoicing(enabled))}
                  onMonthlyInvoiceDayChange={(day) => handleSuccessfulUpdate(() => handleMonthlyInvoiceDayChange(day))}
                  onDefaultDueDaysChange={(days) => handleSuccessfulUpdate(() => handleDefaultDueDaysChange(days))}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
