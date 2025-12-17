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
    return <div className="text-gray-600 dark:text-gray-400">Loading settings...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Calendar Integration</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Manage your Google Calendar connection and sync settings</p>
      </div>

      {settings?.googleCalendarConnected ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-green-600 dark:text-green-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
              </svg>
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  Google Calendar Connected
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {settings.googleCalendarEmail}
                </p>
              </div>
            </div>
            <button
              onClick={onDisconnectGoogle}
              className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
            >
              Disconnect
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Auto-sync enabled
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Automatically sync appointments and blocked times with Google Calendar
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.autoSyncEnabled}
              onClick={() => onToggleAutoSync(!settings.autoSyncEnabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                settings.autoSyncEnabled ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-600"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.autoSyncEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Auto-detect client profiles
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Automatically detect potential clients from calendar event names
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.autoClientSyncEnabled || false}
              onClick={() => onToggleClientSync(!settings.autoClientSyncEnabled)}
              disabled={!settings.autoSyncEnabled}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed ${
                settings.autoClientSyncEnabled ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-600"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.autoClientSyncEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {settings.lastSyncedAt && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
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

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">How sync works:</h3>
            <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
              <li>Your appointments automatically appear in Google Calendar</li>
              <li>Events in Google Calendar create blocked times here</li>
              <li>Prevents double-booking across both calendars</li>
              <li>Auto-sync runs every 15 minutes when enabled</li>
            </ul>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
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
