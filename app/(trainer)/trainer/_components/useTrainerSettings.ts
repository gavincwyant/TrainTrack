import { useState, useCallback } from "react"

export type GroupSessionMatchingLogic = "EXACT_MATCH" | "START_MATCH" | "END_MATCH" | "ANY_OVERLAP"

export type Settings = {
  dayStartTime: string
  dayEndTime: string
  timezone: string
  googleCalendarConnected: boolean
  googleCalendarEmail: string | null
  autoSyncEnabled: boolean
  lastSyncedAt: string | null
  autoInvoicingEnabled: boolean
  monthlyInvoiceDay: number
  defaultInvoiceDueDays: number
  defaultIndividualSessionRate: number | null
  defaultGroupSessionRate: number | null
  groupSessionMatchingLogic: GroupSessionMatchingLogic
  autoClientSyncEnabled: boolean
  darkModeEnabled: boolean
  // Notification settings
  appointmentReminderEnabled: boolean
  appointmentReminderHours: number[]
  invoiceReminderBeforeDue: boolean
  invoiceReminderBeforeDueDays: number
  invoiceReminderOnDue: boolean
  invoiceReminderOverdue: boolean
  invoiceReminderOverdueDays: number[]
}

export function useTrainerSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const fetchSettings = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/trainer-settings")
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

  const updateSettings = async (updates: Partial<Settings>) => {
    setIsSaving(true)
    setError(null)
    try {
      const response = await fetch("/api/trainer-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to update settings")
      }

      await fetchSettings()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const handleConnectGoogle = () => {
    window.location.href = "/api/calendar/connect"
  }

  const handleDisconnectGoogle = async () => {
    if (!confirm("Are you sure you want to disconnect your Google Calendar?")) {
      return false
    }

    try {
      const response = await fetch("/api/calendar/disconnect", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to disconnect calendar")
      }

      await fetchSettings()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      return false
    }
  }

  const handleToggleAutoSync = async (enabled: boolean) => {
    return await updateSettings({ autoSyncEnabled: enabled })
  }

  const handleToggleClientSync = async (enabled: boolean) => {
    return await updateSettings({ autoClientSyncEnabled: enabled })
  }

  const handleToggleAutoInvoicing = async (enabled: boolean) => {
    return await updateSettings({ autoInvoicingEnabled: enabled })
  }

  const handleMonthlyInvoiceDayChange = async (day: number) => {
    return await updateSettings({ monthlyInvoiceDay: day })
  }

  const handleDefaultDueDaysChange = async (days: number) => {
    return await updateSettings({ defaultInvoiceDueDays: days })
  }

  const handleIndividualSessionRateChange = async (rate: number) => {
    return await updateSettings({ defaultIndividualSessionRate: rate })
  }

  const handleGroupSessionRateChange = async (rate: number) => {
    return await updateSettings({ defaultGroupSessionRate: rate })
  }

  const handleGroupSessionMatchingLogicChange = async (logic: GroupSessionMatchingLogic) => {
    return await updateSettings({ groupSessionMatchingLogic: logic })
  }

  // Notification handlers
  const handleAppointmentReminderEnabledChange = async (enabled: boolean) => {
    return await updateSettings({ appointmentReminderEnabled: enabled })
  }

  const handleAppointmentReminderHoursChange = async (hours: number[]) => {
    return await updateSettings({ appointmentReminderHours: hours })
  }

  const handleInvoiceReminderBeforeDueChange = async (enabled: boolean) => {
    return await updateSettings({ invoiceReminderBeforeDue: enabled })
  }

  const handleInvoiceReminderBeforeDueDaysChange = async (days: number) => {
    return await updateSettings({ invoiceReminderBeforeDueDays: days })
  }

  const handleInvoiceReminderOnDueChange = async (enabled: boolean) => {
    return await updateSettings({ invoiceReminderOnDue: enabled })
  }

  const handleInvoiceReminderOverdueChange = async (enabled: boolean) => {
    return await updateSettings({ invoiceReminderOverdue: enabled })
  }

  const handleInvoiceReminderOverdueDaysChange = async (days: number[]) => {
    return await updateSettings({ invoiceReminderOverdueDays: days })
  }

  const handleManualSync = async () => {
    setIsSyncing(true)
    setError(null)
    try {
      const response = await fetch("/api/calendar/sync", {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to sync calendar")
      }

      await fetchSettings()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      return false
    } finally {
      setIsSyncing(false)
    }
  }

  return {
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
    // Notification handlers
    handleAppointmentReminderEnabledChange,
    handleAppointmentReminderHoursChange,
    handleInvoiceReminderBeforeDueChange,
    handleInvoiceReminderBeforeDueDaysChange,
    handleInvoiceReminderOnDueChange,
    handleInvoiceReminderOverdueChange,
    handleInvoiceReminderOverdueDaysChange,
    clearError: () => setError(null),
  }
}
