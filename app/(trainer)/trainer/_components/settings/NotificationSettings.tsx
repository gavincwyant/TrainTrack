import { Settings } from "../useTrainerSettings"

type Props = {
  settings: Settings | null
  isLoading: boolean
  onAppointmentReminderEnabledChange: (enabled: boolean) => Promise<boolean>
  onAppointmentReminderHoursChange: (hours: number[]) => Promise<boolean>
  onInvoiceReminderBeforeDueChange: (enabled: boolean) => Promise<boolean>
  onInvoiceReminderBeforeDueDaysChange: (days: number) => Promise<boolean>
  onInvoiceReminderOnDueChange: (enabled: boolean) => Promise<boolean>
  onInvoiceReminderOverdueChange: (enabled: boolean) => Promise<boolean>
  onInvoiceReminderOverdueDaysChange: (days: number[]) => Promise<boolean>
}

const REMINDER_HOUR_OPTIONS = [
  { value: 1, label: "1 hour before" },
  { value: 2, label: "2 hours before" },
  { value: 6, label: "6 hours before" },
  { value: 12, label: "12 hours before" },
  { value: 24, label: "24 hours before" },
  { value: 48, label: "48 hours before" },
]

const OVERDUE_DAY_OPTIONS = [
  { value: 1, label: "1 day" },
  { value: 3, label: "3 days" },
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
]

export function NotificationSettings({
  settings,
  isLoading,
  onAppointmentReminderEnabledChange,
  onAppointmentReminderHoursChange,
  onInvoiceReminderBeforeDueChange,
  onInvoiceReminderBeforeDueDaysChange,
  onInvoiceReminderOnDueChange,
  onInvoiceReminderOverdueChange,
  onInvoiceReminderOverdueDaysChange,
}: Props) {
  if (isLoading) {
    return <div className="text-gray-600 dark:text-gray-400">Loading settings...</div>
  }

  const appointmentReminderHours = settings?.appointmentReminderHours ?? [24]
  const invoiceReminderOverdueDays = settings?.invoiceReminderOverdueDays ?? [3, 7]

  const handleHourToggle = (hour: number) => {
    const currentHours = appointmentReminderHours
    const newHours = currentHours.includes(hour)
      ? currentHours.filter((h) => h !== hour)
      : [...currentHours, hour].sort((a, b) => a - b)

    // Ensure at least one hour is selected
    if (newHours.length > 0) {
      onAppointmentReminderHoursChange(newHours)
    }
  }

  const handleOverdueDayToggle = (day: number) => {
    const currentDays = invoiceReminderOverdueDays
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day].sort((a, b) => a - b)

    // Ensure at least one day is selected if overdue reminders are enabled
    if (newDays.length > 0 || !settings?.invoiceReminderOverdue) {
      onInvoiceReminderOverdueDaysChange(newDays)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Notifications</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Configure when clients receive reminders about appointments and invoices
        </p>
      </div>

      {/* Appointment Reminders Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
          Appointment Reminders
        </h3>

        {/* Enable/Disable */}
        <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-md">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Send Appointment Reminders
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Automatically remind clients before their scheduled sessions
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings?.appointmentReminderEnabled ?? true}
            onChange={(e) => onAppointmentReminderEnabledChange(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
          />
        </div>

        {/* Reminder Times */}
        {settings?.appointmentReminderEnabled && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Send reminders at these times:
            </label>
            <div className="flex flex-wrap gap-2">
              {REMINDER_HOUR_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleHourToggle(option.value)}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    appointmentReminderHours.includes(option.value)
                      ? "bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Invoice Reminders Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
          Invoice Reminders
        </h3>

        {/* Before Due Date */}
        <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-md">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Remind Before Due Date
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Send a reminder before the invoice is due
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings?.invoiceReminderBeforeDue ?? true}
            onChange={(e) => onInvoiceReminderBeforeDueChange(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
          />
        </div>

        {settings?.invoiceReminderBeforeDue && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Days before due date:
            </label>
            <select
              value={settings?.invoiceReminderBeforeDueDays ?? 3}
              onChange={(e) => onInvoiceReminderBeforeDueDaysChange(Number(e.target.value))}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              {[1, 2, 3, 5, 7, 14].map((days) => (
                <option key={days} value={days}>
                  {days} day{days > 1 ? "s" : ""} before
                </option>
              ))}
            </select>
          </div>
        )}

        {/* On Due Date */}
        <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-md">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Remind On Due Date
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Send a reminder on the day the invoice is due
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings?.invoiceReminderOnDue ?? true}
            onChange={(e) => onInvoiceReminderOnDueChange(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
          />
        </div>

        {/* Overdue Reminders */}
        <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-md">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Overdue Reminders
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Send follow-up reminders for overdue invoices
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings?.invoiceReminderOverdue ?? true}
            onChange={(e) => onInvoiceReminderOverdueChange(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
          />
        </div>

        {settings?.invoiceReminderOverdue && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Send overdue reminders at:
            </label>
            <div className="flex flex-wrap gap-2">
              {OVERDUE_DAY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleOverdueDayToggle(option.value)}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    invoiceReminderOverdueDays.includes(option.value)
                      ? "bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {option.label} overdue
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">How notifications work:</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
          <li>Clients can choose to receive reminders via SMS, email, or both</li>
          <li>SMS requires clients to have a phone number on file</li>
          <li>Clients can opt out of specific notification types in their settings</li>
          <li>Reminders are sent automatically based on your schedule above</li>
        </ul>
      </div>
    </div>
  )
}
