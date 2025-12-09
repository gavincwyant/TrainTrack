"use client"

import { useState, useEffect } from "react"
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from "recharts"
import { DateRange } from "@/lib/utils/analytics"

type AnalyticsData = {
  sessionMetrics: {
    total: number
    completed: number
    cancelled: number
    scheduled: number
    completionRate: number
    cancellationRate: number
  }
  invoiceMetrics: {
    totalRevenue: number
    pendingRevenue: number
    overdueAmount: number
    paid: { count: number }
    sent: { count: number }
    overdue: { count: number }
    draft: { count: number }
  }
  sessionTrends: Array<{
    date: string
    completed: number
    cancelled: number
    total: number
  }>
  revenueTrends: Array<{
    date: string
    revenue: number
  }>
  clientMetrics: {
    topByRevenue: Array<{ name: string, revenue: number }>
    topBySessions: Array<{ name: string, sessions: number }>
  }
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<DateRange>("month")
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)

  useEffect(() => {
    fetchAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range])

  const fetchAnalytics = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/analytics?range=${range}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch analytics")
      }

      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      console.error("Failed to fetch analytics:", err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <h3 className="text-lg font-medium text-red-900 mb-2">Error</h3>
          <p className="text-red-600">{error || "Failed to load analytics"}</p>
        </div>
      </div>
    )
  }

  const hasSessionData = data.sessionTrends.some(t => t.total > 0)
  const hasRevenueData = data.revenueTrends.some(t => t.revenue > 0)
  const hasClientData = data.clientMetrics.topByRevenue.length > 0 || data.clientMetrics.topBySessions.length > 0

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header with Date Range Selector and Export Button */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>

        <div className="flex items-center gap-6">
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium text-sm"
          >
            Export for Taxes
          </button>

          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              {(["week", "month", "year"] as DateRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    range === r
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {r === "week" ? "Last 7 Days" : r === "month" ? "Last 30 Days" : "Last Year"}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal onClose={() => setShowExportModal(false)} />
      )}

      {/* Session Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Sessions"
          value={data.sessionMetrics.total}
          subtitle={`${data.sessionMetrics.completed} completed`}
          color="blue"
        />
        <StatCard
          title="Completion Rate"
          value={`${data.sessionMetrics.completionRate.toFixed(1)}%`}
          subtitle={`${data.sessionMetrics.cancelled} cancelled`}
          color="green"
        />
        <StatCard
          title="Cancellation Rate"
          value={`${data.sessionMetrics.cancellationRate.toFixed(1)}%`}
          subtitle={`${data.sessionMetrics.scheduled} scheduled`}
          color="yellow"
        />
      </div>

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Revenue (Paid)"
          value={`$${data.invoiceMetrics.totalRevenue.toFixed(2)}`}
          subtitle={`${data.invoiceMetrics.paid.count} paid invoices`}
          color="green"
        />
        <StatCard
          title="Pending (Sent)"
          value={`$${data.invoiceMetrics.pendingRevenue.toFixed(2)}`}
          subtitle={`${data.invoiceMetrics.sent.count} awaiting payment`}
          color="blue"
        />
        <StatCard
          title="Overdue (Action Needed)"
          value={`$${data.invoiceMetrics.overdueAmount.toFixed(2)}`}
          subtitle={`${data.invoiceMetrics.overdue.count} overdue invoices`}
          color="red"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Session Trends Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Session Trends
          </h3>
          {hasSessionData ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.sessionTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Completed"
                />
                <Line
                  type="monotone"
                  dataKey="cancelled"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Cancelled"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No session data for this period
            </div>
          )}
        </div>

        {/* Revenue Trends Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue Trends
          </h3>
          {hasRevenueData ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.revenueTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                <Bar dataKey="revenue" fill="#3b82f6" name="Revenue ($)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No revenue data for this period
            </div>
          )}
        </div>

        {/* Invoice Status Pie Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Invoice Status Breakdown
          </h3>
          {data.invoiceMetrics.paid.count + data.invoiceMetrics.sent.count +
           data.invoiceMetrics.overdue.count + data.invoiceMetrics.draft.count > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Paid", value: data.invoiceMetrics.paid.count },
                    { name: "Sent", value: data.invoiceMetrics.sent.count },
                    { name: "Overdue", value: data.invoiceMetrics.overdue.count },
                    { name: "Draft", value: data.invoiceMetrics.draft.count },
                  ].filter(item => item.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#3b82f6" />
                  <Cell fill="#ef4444" />
                  <Cell fill="#6b7280" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No invoices for this period
            </div>
          )}
        </div>

        {/* Top Clients by Revenue */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Top Clients by Revenue
          </h3>
          {data.clientMetrics.topByRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={data.clientMetrics.topByRevenue.slice(0, 5)}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue ($)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No client revenue data
            </div>
          )}
        </div>
      </div>

      {/* Client Tables */}
      {hasClientData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Clients by Revenue Table */}
          {data.clientMetrics.topByRevenue.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Revenue Leaders
              </h3>
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-gray-900">Client</th>
                    <th className="text-right py-2 text-gray-900">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.clientMetrics.topByRevenue.slice(0, 10).map((client, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 text-gray-900">{client.name}</td>
                      <td className="text-right py-2 font-semibold text-gray-900">
                        ${client.revenue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Top Clients by Sessions Table */}
          {data.clientMetrics.topBySessions.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Most Active Clients
              </h3>
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-gray-900">Client</th>
                    <th className="text-right py-2 text-gray-900">Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.clientMetrics.topBySessions.slice(0, 10).map((client, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 text-gray-900">{client.name}</td>
                      <td className="text-right py-2 font-semibold text-gray-900">
                        {client.sessions}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  color
}: {
  title: string
  value: string | number
  subtitle: string
  color: "blue" | "green" | "red" | "yellow"
}) {
  const colorClasses = {
    blue: "text-blue-600",
    green: "text-green-600",
    red: "text-red-600",
    yellow: "text-yellow-600",
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className={`text-3xl font-bold mt-2 ${colorClasses[color]}`}>
        {value}
      </p>
      <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderCustomLabel(entry: any) {
  if (!entry.name || entry.value === undefined) return ""
  return `${entry.name}: ${entry.value}`
}

// Export Modal Component
function ExportModal({ onClose }: { onClose: () => void }) {
  const [exportType, setExportType] = useState<"month" | "year">("month")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i)
  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ]

  const handleExport = () => {
    const params = new URLSearchParams({
      period: exportType,
      year: selectedYear.toString(),
    })

    if (exportType === "month") {
      params.append("month", selectedMonth.toString())
    }

    window.location.href = `/api/analytics/export?${params.toString()}`
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Export Payment Data
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Export paid invoices as CSV for tax purposes. Only includes payments that have been received.
        </p>

        {/* Export Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Export Period
          </label>
          <div className="flex gap-4">
            <button
              onClick={() => setExportType("month")}
              className={`flex-1 py-2 px-4 rounded-md font-medium ${
                exportType === "month"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Specific Month
            </button>
            <button
              onClick={() => setExportType("year")}
              className={`flex-1 py-2 px-4 rounded-md font-medium ${
                exportType === "year"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Calendar Year
            </button>
          </div>
        </div>

        {/* Month Selection */}
        {exportType === "month" && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Month
            </label>
            <div className="grid grid-cols-2 gap-4">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Year Selection */}
        {exportType === "year" && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Export Details */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            CSV will include:
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Payment Date</li>
            <li>• Client Name and Email</li>
            <li>• Amount Paid</li>
            <li>• Payment Method</li>
            <li>• Invoice ID</li>
            <li>• Services/Items</li>
            <li>• Notes</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
          >
            Download CSV
          </button>
        </div>
      </div>
    </div>
  )
}
