"use client"

import { Settings } from "../useTrainerSettings"
// Dark mode feature removed
// import { useDarkMode } from "@/lib/contexts/dark-mode-context"
import { useState } from "react"

type Props = {
  settings: Settings | null
  isLoading: boolean
}

export function UIPreferencesSettings({ isLoading }: Props) {
  if (isLoading) {
    return <div className="text-[var(--text-secondary)]">Loading settings...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">UI Preferences</h2>
        <p className="mt-2 text-[var(--text-secondary)]">
          Customize your application appearance and interface settings
        </p>
      </div>

      <div className="bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Theme Settings</h3>
        <p className="text-[var(--text-secondary)]">
          The application automatically adapts to your system theme preferences and browser extensions.
          Use your operating system settings or browser dark mode extension to control the appearance.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-sm font-medium text-blue-900 mb-2">How to customize your theme:</h3>
        <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
          <li>Use your operating system&apos;s theme settings (Windows/Mac/Linux)</li>
          <li>Install a browser dark mode extension for more control</li>
          <li>The app uses CSS variables that adapt to your theme preferences</li>
        </ul>
      </div>
    </div>
  )
}
