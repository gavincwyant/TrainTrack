"use client"

export function NotificationSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Notifications</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage how you receive notifications and reminders.
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
        <svg
          className="mx-auto h-12 w-12 text-blue-400 dark:text-blue-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        <h4 className="mt-4 text-sm font-medium text-blue-900 dark:text-blue-100">Coming Soon</h4>
        <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">
          Notification preferences will be available in a future update. You&apos;ll be able to customize
          appointment reminders, workout summaries, and invoice alerts.
        </p>
      </div>

      {/* Placeholder for future notification settings */}
      <div className="space-y-4 opacity-50 pointer-events-none">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Notifications</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Receive updates via email</p>
          </div>
          <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700">
            <span className="translate-x-1 inline-block h-4 w-4 rounded-full bg-white" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Appointment Reminders</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Get reminded before sessions</p>
          </div>
          <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700">
            <span className="translate-x-1 inline-block h-4 w-4 rounded-full bg-white" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Invoice Alerts</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Notifications about new invoices</p>
          </div>
          <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700">
            <span className="translate-x-1 inline-block h-4 w-4 rounded-full bg-white" />
          </div>
        </div>
      </div>
    </div>
  )
}
