import { Settings } from "../useTrainerSettings"

type Props = {
  settings: Settings | null
  isLoading: boolean
  isSyncing: boolean
  onConnectGoogle: () => void
  onDisconnectGoogle: () => Promise<boolean>
  onToggleAutoSync: (enabled: boolean) => Promise<boolean>
  onToggleClientSync: (enabled: boolean) => Promise<boolean>
  onManualSync: () => Promise<boolean>
}

export function CalendarSettings({
  settings,
  isLoading,
  isSyncing,
  onConnectGoogle,
  onDisconnectGoogle,
  onToggleAutoSync,
  onToggleClientSync,
  onManualSync,
}: Props) {
  if (isLoading) {
    return <div className="text-gray-600">Loading settings...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Calendar Integration</h2>
        <p className="mt-2 text-gray-600">Manage your Google Calendar connection and sync settings</p>
      </div>

      {settings?.googleCalendarConnected ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-md border border-green-200">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
              </svg>
              <div>
                <p className="text-sm font-medium text-green-800">
                  Google Calendar Connected
                </p>
                <p className="text-sm text-green-600">
                  {settings.googleCalendarEmail}
                </p>
              </div>
            </div>
            <button
              onClick={onDisconnectGoogle}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Disconnect
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Auto-sync enabled
              </label>
              <p className="text-sm text-gray-500">
                Automatically sync appointments and blocked times with Google Calendar
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoSyncEnabled}
              onChange={(e) => onToggleAutoSync(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Auto-detect client profiles
              </label>
              <p className="text-sm text-gray-500">
                Automatically detect potential clients from calendar event names
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoClientSyncEnabled || false}
              onChange={(e) => onToggleClientSync(e.target.checked)}
              disabled={!settings.autoSyncEnabled}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
            />
          </div>

          {settings.lastSyncedAt && (
            <p className="text-xs text-gray-500">
              Last synced: {new Date(settings.lastSyncedAt).toLocaleString()}
            </p>
          )}

          <button
            onClick={onManualSync}
            disabled={isSyncing}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSyncing ? "Syncing..." : "Sync Now"}
          </button>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">How sync works:</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Your appointments automatically appear in Google Calendar</li>
              <li>Events in Google Calendar create blocked times here</li>
              <li>Prevents double-booking across both calendars</li>
              <li>Auto-sync runs every 15 minutes when enabled</li>
            </ul>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Connect your Google Calendar to automatically sync appointments and prevent double-booking.
          </p>
          <button
            onClick={onConnectGoogle}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
            </svg>
            Connect Google Calendar
          </button>
        </div>
      )}
    </div>
  )
}
