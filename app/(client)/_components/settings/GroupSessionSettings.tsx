"use client"

import { useState, useEffect, useCallback } from "react"
import type { ClientSettings, GroupSessionPermission } from "../useClientSettings"

type AllowedClient = {
  id: string
  profileId: string
  userId: string
  fullName: string
}

type DiscoverableClient = {
  profileId: string
  userId: string
  fullName: string
}

type Props = {
  settings: ClientSettings | null
  onPermissionChange: (permission: GroupSessionPermission) => Promise<boolean>
  onDiscoverableChange: (discoverable: boolean) => Promise<boolean>
  isLoading: boolean
  isSaving: boolean
}

export function GroupSessionSettings({
  settings,
  onPermissionChange,
  onDiscoverableChange,
  isLoading,
  isSaving,
}: Props) {
  const [allowedClients, setAllowedClients] = useState<AllowedClient[]>([])
  const [discoverableClients, setDiscoverableClients] = useState<DiscoverableClient[]>([])
  const [isLoadingClients, setIsLoadingClients] = useState(false)
  const [selectedClientToAdd, setSelectedClientToAdd] = useState<string>("")
  const [isAddingClient, setIsAddingClient] = useState(false)

  const fetchAllowedClients = useCallback(async () => {
    setIsLoadingClients(true)
    try {
      const response = await fetch("/api/client/group-session-allowed-clients")
      const data = await response.json()
      if (response.ok) {
        setAllowedClients(data.allowedClients || [])
        setDiscoverableClients(data.discoverableClients || [])
      }
    } catch (error) {
      console.error("Failed to fetch allowed clients:", error)
    } finally {
      setIsLoadingClients(false)
    }
  }, [])

  useEffect(() => {
    if (settings?.groupSessionPermission === "ALLOW_SPECIFIC_CLIENTS") {
      fetchAllowedClients()
    }
  }, [settings?.groupSessionPermission, fetchAllowedClients])

  const handlePermissionChange = async (permission: GroupSessionPermission) => {
    const success = await onPermissionChange(permission)
    if (success && permission === "ALLOW_SPECIFIC_CLIENTS") {
      fetchAllowedClients()
    }
  }

  const handleAddClient = async () => {
    if (!selectedClientToAdd) return
    setIsAddingClient(true)
    try {
      const response = await fetch("/api/client/group-session-allowed-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowedClientProfileId: selectedClientToAdd }),
      })
      if (response.ok) {
        await fetchAllowedClients()
        setSelectedClientToAdd("")
      }
    } catch (error) {
      console.error("Failed to add client:", error)
    } finally {
      setIsAddingClient(false)
    }
  }

  const handleRemoveClient = async (profileId: string) => {
    try {
      await fetch(`/api/client/group-session-allowed-clients?allowedClientProfileId=${profileId}`, {
        method: "DELETE",
      })
      setAllowedClients((prev) => prev.filter((c) => c.profileId !== profileId))
    } catch (error) {
      console.error("Failed to remove client:", error)
    }
  }

  // Filter out already allowed clients from discoverable list
  const availableToAdd = discoverableClients.filter(
    (dc) => !allowedClients.some((ac) => ac.profileId === dc.profileId)
  )

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
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Group Session Settings</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Control whether other clients can book sessions at the same time as yours.
        </p>
      </div>

      {/* Permission Level */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Group Session Permission
        </label>
        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
            <input
              type="radio"
              name="permission"
              checked={settings?.groupSessionPermission === "NO_GROUP_SESSIONS"}
              onChange={() => handlePermissionChange("NO_GROUP_SESSIONS")}
              disabled={isSaving}
              className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                No group sessions
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Only you can book at your appointment times
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
            <input
              type="radio"
              name="permission"
              checked={settings?.groupSessionPermission === "ALLOW_ALL_GROUP"}
              onChange={() => handlePermissionChange("ALLOW_ALL_GROUP")}
              disabled={isSaving}
              className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Allow anyone to book with me
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Any client can book a session at the same time as yours
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
            <input
              type="radio"
              name="permission"
              checked={settings?.groupSessionPermission === "ALLOW_SPECIFIC_CLIENTS"}
              onChange={() => handlePermissionChange("ALLOW_SPECIFIC_CLIENTS")}
              disabled={isSaving}
              className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Allow specific clients only
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Only clients you select can book at the same time as you
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Allowed Clients List (only shown when ALLOW_SPECIFIC_CLIENTS) */}
      {settings?.groupSessionPermission === "ALLOW_SPECIFIC_CLIENTS" && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
          <div>
            <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">
              Allowed Clients
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              These clients can book sessions at the same time as yours
            </p>
          </div>

          {isLoadingClients ? (
            <div className="animate-pulse space-y-2">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ) : (
            <>
              {/* Current allowed clients */}
              {allowedClients.length > 0 ? (
                <ul className="space-y-2">
                  {allowedClients.map((client) => (
                    <li
                      key={client.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {client.fullName}
                      </span>
                      <button
                        onClick={() => handleRemoveClient(client.profileId)}
                        className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  No clients added yet
                </p>
              )}

              {/* Add client dropdown */}
              {availableToAdd.length > 0 && (
                <div className="flex gap-2">
                  <select
                    value={selectedClientToAdd}
                    onChange={(e) => setSelectedClientToAdd(e.target.value)}
                    disabled={isAddingClient}
                    className="flex-1 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a client to add...</option>
                    {availableToAdd.map((client) => (
                      <option key={client.profileId} value={client.profileId}>
                        {client.fullName}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddClient}
                    disabled={!selectedClientToAdd || isAddingClient}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAddingClient ? "Adding..." : "Add"}
                  </button>
                </div>
              )}

              {availableToAdd.length === 0 && allowedClients.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  No more discoverable clients available to add
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Discoverability Toggle */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">
              Allow others to find me
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              When enabled, other clients can add you to their allowed list for group sessions
            </p>
          </div>
          <button
            type="button"
            onClick={() => onDiscoverableChange(!settings?.groupSessionDiscoverable)}
            disabled={isSaving}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
              settings?.groupSessionDiscoverable
                ? "bg-blue-600"
                : "bg-gray-200 dark:bg-gray-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings?.groupSessionDiscoverable ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Your name will only be visible to other clients who want to add you to their allowed list.
          This does not automatically allow anyone to book with you.
        </p>
      </div>
    </div>
  )
}
