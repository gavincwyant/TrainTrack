import { useState, useCallback } from "react"

export type ClientSettings = {
  fullName: string
  email: string
  phone: string | null
  trainerName: string | null
  trainerEmail: string | null
  billingFrequency: string
  sessionRate: number | null
  trainers: Array<{
    id: string
    fullName: string
    email: string
  }>
}

export function useClientSettings() {
  const [settings, setSettings] = useState<ClientSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const fetchSettings = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/client-settings")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch settings")
      }

      setSettings(data.settings)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateSettings = async (updates: { phone?: string | null }) => {
    setIsSaving(true)
    setError(null)
    try {
      const response = await fetch("/api/client-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to update settings")
      }

      // Update local state with returned values
      if (settings) {
        setSettings({
          ...settings,
          phone: result.settings.phone,
        })
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const handlePhoneChange = async (phone: string | null) => {
    return await updateSettings({ phone })
  }

  return {
    settings,
    isLoading,
    error,
    isSaving,
    fetchSettings,
    updateSettings,
    handlePhoneChange,
    clearError: () => setError(null),
  }
}
