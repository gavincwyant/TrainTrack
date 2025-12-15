"use client"

import { useState } from "react"
import type { ClientSettings } from "../useClientSettings"

type Props = {
  settings: ClientSettings | null
  onSmsChange: (enabled: boolean) => Promise<boolean>
  onEmailChange: (enabled: boolean) => Promise<boolean>
  onAppointmentRemindersChange: (enabled: boolean) => Promise<boolean>
  onInvoiceAlertsChange: (enabled: boolean) => Promise<boolean>
  isLoading: boolean
  isSaving: boolean
}

function Toggle({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean
  onChange: (enabled: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
        enabled ? "bg-blue-600 dark:bg-blue-500" : "bg-gray-200 dark:bg-gray-700"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  )
}

export function NotificationSettings({
  settings,
  onSmsChange,
  onEmailChange,
  onAppointmentRemindersChange,
  onInvoiceAlertsChange,
  isLoading,
  isSaving,
}: Props) {
  const [savingField, setSavingField] = useState<string | null>(null)

  const handleToggle = async (
    field: string,
    onChange: (enabled: boolean) => Promise<boolean>,
    newValue: boolean
  ) => {
    setSavingField(field)
    await onChange(newValue)
    setSavingField(null)
  }

  const hasPhone = Boolean(settings?.phone)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Notifications</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage how you receive notifications and reminders.
          </p>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
              </div>
              <div className="h-6 w-11 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Notifications</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage how you receive notifications and reminders.
        </p>
      </div>

      {/* Communication Channels */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          Communication Channels
        </h4>

        {/* SMS Notifications */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">SMS Notifications</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {hasPhone
                ? "Receive text message reminders"
                : "Add a phone number in Profile to enable SMS"}
            </p>
          </div>
          <Toggle
            enabled={settings?.smsNotificationsEnabled ?? false}
            onChange={(enabled) =>
              handleToggle("sms", onSmsChange, enabled)
            }
            disabled={isSaving || savingField === "sms" || !hasPhone}
          />
        </div>

        {/* Email Notifications */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Email Notifications</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Receive reminders via email
            </p>
          </div>
          <Toggle
            enabled={settings?.emailNotificationsEnabled ?? true}
            onChange={(enabled) =>
              handleToggle("email", onEmailChange, enabled)
            }
            disabled={isSaving || savingField === "email"}
          />
        </div>
      </div>

      <hr className="border-gray-200 dark:border-gray-700" />

      {/* Notification Types */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          Notification Types
        </h4>

        {/* Appointment Reminders */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Appointment Reminders</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Get reminded before your training sessions
            </p>
          </div>
          <Toggle
            enabled={settings?.appointmentRemindersEnabled ?? true}
            onChange={(enabled) =>
              handleToggle("appointments", onAppointmentRemindersChange, enabled)
            }
            disabled={isSaving || savingField === "appointments"}
          />
        </div>

        {/* Invoice Alerts */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Invoice Alerts</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Notifications about new invoices and payment reminders
            </p>
          </div>
          <Toggle
            enabled={settings?.invoiceAlertsEnabled ?? true}
            onChange={(enabled) =>
              handleToggle("invoices", onInvoiceAlertsChange, enabled)
            }
            disabled={isSaving || savingField === "invoices"}
          />
        </div>
      </div>

      {/* Info box */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex">
          <svg
            className="h-5 w-5 text-blue-400 dark:text-blue-500 flex-shrink-0"
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
          <p className="ml-3 text-sm text-blue-700 dark:text-blue-300">
            Reminder timing is configured by your trainer. Contact them if you&apos;d like to adjust when you receive reminders.
          </p>
        </div>
      </div>
    </div>
  )
}
