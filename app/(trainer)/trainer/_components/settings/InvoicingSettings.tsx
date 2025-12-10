import { Settings } from "../useTrainerSettings"

type Props = {
  settings: Settings | null
  isLoading: boolean
  onToggleAutoInvoicing: (enabled: boolean) => Promise<boolean>
  onMonthlyInvoiceDayChange: (day: number) => Promise<boolean>
  onDefaultDueDaysChange: (days: number) => Promise<boolean>
}

export function InvoicingSettings({
  settings,
  isLoading,
  onToggleAutoInvoicing,
  onMonthlyInvoiceDayChange,
  onDefaultDueDaysChange,
}: Props) {
  if (isLoading) {
    return <div className="text-gray-600 dark:text-gray-400">Loading settings...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Invoicing & Billing</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Configure automatic invoicing and payment settings</p>
      </div>

      <div className="space-y-6">
        {/* Auto-invoicing toggle */}
        <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-md">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Automatic Invoicing
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Automatically generate and send invoices to clients based on their billing frequency
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings?.autoInvoicingEnabled ?? true}
            onChange={(e) => onToggleAutoInvoicing(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
          />
        </div>

        {/* Monthly invoice day */}
        <div>
          <label htmlFor="monthlyInvoiceDay" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Monthly Invoice Day
          </label>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Day of month to generate invoices for monthly billing clients
          </p>
          <select
            id="monthlyInvoiceDay"
            value={settings?.monthlyInvoiceDay ?? 1}
            onChange={(e) => onMonthlyInvoiceDayChange(Number(e.target.value))}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <option key={day} value={day}>
                {day}
                {day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th"} of the month
              </option>
            ))}
          </select>
        </div>

        {/* Default due days */}
        <div>
          <label htmlFor="defaultDueDays" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Default Payment Terms
          </label>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Number of days until invoice is due after generation
          </p>
          <select
            id="defaultDueDays"
            value={settings?.defaultInvoiceDueDays ?? 30}
            onChange={(e) => onDefaultDueDaysChange(Number(e.target.value))}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value={7}>Net 7 (Due in 7 days)</option>
            <option value={15}>Net 15 (Due in 15 days)</option>
            <option value={30}>Net 30 (Due in 30 days)</option>
            <option value={60}>Net 60 (Due in 60 days)</option>
          </select>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">How invoicing works:</h3>
          <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
            <li>Per-session clients: Invoice generated immediately when appointment is marked completed</li>
            <li>Monthly clients: Invoices generated on your chosen day of the month</li>
            <li>All invoices are automatically emailed to clients</li>
            <li>You can disable auto-invoicing for specific clients in their profile</li>
            <li>View and manage all invoices in the Invoices section</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
