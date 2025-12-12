import { useState, useCallback } from "react"

export type GroupSessionPermission = "NO_GROUP_SESSIONS" | "ALLOW_ALL_GROUP" | "ALLOW_SPECIFIC_CLIENTS"

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
  // Group session settings
  groupSessionPermission: GroupSessionPermission
  groupSessionDiscoverable: boolean
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

  const updateSettings = async (updates: {
    phone?: string | null
    groupSessionPermission?: GroupSessionPermission
    groupSessionDiscoverable?: boolean
  }) => {
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
          phone: result.settings.phone ?? settings.phone,
          groupSessionPermission: result.settings.groupSessionPermission ?? settings.groupSessionPermission,
          groupSessionDiscoverable: result.settings.groupSessionDiscoverable ?? settings.groupSessionDiscoverable,
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

  const handleGroupSessionPermissionChange = async (permission: GroupSessionPermission) => {
    return await updateSettings({ groupSessionPermission: permission })
  }

  const handleGroupSessionDiscoverableChange = async (discoverable: boolean) => {
    return await updateSettings({ groupSessionDiscoverable: discoverable })
  }

  return {
    settings,
    isLoading,
    error,
    isSaving,
    fetchSettings,
    updateSettings,
    handlePhoneChange,
    handleGroupSessionPermissionChange,
    handleGroupSessionDiscoverableChange,
    clearError: () => setError(null),
  }
}
