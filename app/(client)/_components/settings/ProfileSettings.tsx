"use client"

import { useState, useEffect } from "react"
import type { ClientSettings } from "../useClientSettings"

type Props = {
  settings: ClientSettings | null
  onPhoneChange: (phone: string | null) => Promise<boolean>
  isLoading: boolean
  isSaving: boolean
}

export function ProfileSettings({ settings, onPhoneChange, isLoading, isSaving }: Props) {
  const [phone, setPhone] = useState("")
  const [hasChanges, setHasChanges] = useState(false)

  // Sync local state with settings when loaded
  useEffect(() => {
    if (settings?.phone !== undefined) {
      setPhone(settings.phone || "")
    }
  }, [settings?.phone])

  const handlePhoneBlur = async () => {
    const newPhone = phone.trim() || null
    if (newPhone !== settings?.phone) {
      const success = await onPhoneChange(newPhone)
      if (success) {
        setHasChanges(false)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Profile Information</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Your personal information and contact details.
        </p>
      </div>

      {/* Read-only fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Full Name
          </label>
          <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700">
            {settings?.fullName || "-"}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email
          </label>
          <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700">
            {settings?.email || "-"}
          </p>
        </div>

        {/* Editable phone field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Phone Number
          </label>
          <div className="mt-1 relative">
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value)
                setHasChanges(true)
              }}
              onBlur={handlePhoneBlur}
              placeholder="(555) 555-5555"
              disabled={isSaving}
              className="block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {isSaving && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="animate-spin h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Changes are saved automatically
          </p>
        </div>
      </div>

      {/* Trainer Information */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">Your Trainer</h4>

        {settings?.trainers && settings.trainers.length > 0 ? (
          <div className="space-y-3">
            {settings.trainers.map((trainer) => (
              <div
                key={trainer.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {trainer.fullName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{trainer.email}</p>
                </div>
                <a
                  href={`mailto:${trainer.email}`}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  Contact
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No trainer assigned</p>
        )}
      </div>

      {/* Billing Information (read-only) */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">Billing Information</h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Billing Frequency
            </label>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
              {settings?.billingFrequency === "PER_SESSION" ? "Per Session" : "Monthly"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Session Rate
            </label>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
              {settings?.sessionRate ? `$${settings.sessionRate.toFixed(2)}` : "-"}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Contact your trainer to update billing settings.
        </p>
      </div>
    </div>
  )
}
