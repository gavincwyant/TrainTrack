"use client"

import { useState, useEffect, useRef } from "react"
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

const INITIAL_LOAD_MIN_DURATION = 1250 // 1.25 seconds minimum for initial skeleton

export default function AnalyticsPage() {
  const [range, setRange] = useState<DateRange>("month")
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const isInitialLoad = useRef(true)

  useEffect(() => {
    fetchAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range])

  const fetchAnalytics = async () => {
    const isFirstLoad = isInitialLoad.current

    if (isFirstLoad) {
      setIsInitialLoading(true)
    } else {
      setIsRefreshing(true)
    }

    setError(null)
    const startTime = Date.now()

    try {
      const response = await fetch(`/api/analytics?range=${range}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch analytics")
      }

      // For initial load, ensure minimum skeleton duration for smooth UX
      if (isFirstLoad) {
        const elapsed = Date.now() - startTime
        const remainingTime = INITIAL_LOAD_MIN_DURATION - elapsed
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime))
        }
        isInitialLoad.current = false
      }

      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      console.error("Failed to fetch analytics:", err)
    } finally {
      setIsInitialLoading(false)
      setIsRefreshing(false)
    }
  }

  if (isInitialLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="h-9 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            <div className="h-11 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="flex space-x-4 sm:space-x-8">
              <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-10 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Session Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        {/* Revenue Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        {/* Charts Section Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCardSkeleton />
          <ChartCardSkeleton />
          <ChartCardSkeleton />
          <ChartCardSkeleton />
        </div>

        {/* Tables Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TableCardSkeleton />
          <TableCardSkeleton />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
          <h3 className="text-lg font-medium text-red-900 dark:text-red-300 mb-2">Error</h3>
          <p className="text-red-600 dark:text-red-400">{error || "Failed to load analytics"}</p>
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Analytics</h1>
          {/* Subtle loading indicator when refreshing */}
          {isRefreshing && (
            <div className="h-5 w-5 border-2 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 min-h-[44px] bg-green-600 dark:bg-green-500 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600 font-medium text-sm"
          >
            Export for Taxes
          </button>

          <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto w-full sm:w-auto">
            <nav className="flex space-x-4 sm:space-x-8">
              {(["week", "month", "year"] as DateRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  disabled={isRefreshing}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap min-h-[44px] transition-colors ${
                    range === r
                      ? "border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  } ${isRefreshing ? "opacity-50 cursor-not-allowed" : ""}`}
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

      {/* Content wrapper with transition */}
      <div className={`space-y-6 transition-opacity duration-300 ${isRefreshing ? "opacity-60" : "opacity-100"}`}>
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
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
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
            <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
              No session data for this period
            </div>
          )}
        </div>

        {/* Revenue Trends Chart */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
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
            <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
              No revenue data for this period
            </div>
          )}
        </div>

        {/* Invoice Status Pie Chart */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
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
            <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
              No invoices for this period
            </div>
          )}
        </div>

        {/* Top Clients by Revenue */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
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
            <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
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
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Revenue Leaders
              </h3>
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 text-gray-900 dark:text-gray-100">Client</th>
                    <th className="text-right py-2 text-gray-900 dark:text-gray-100">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.clientMetrics.topByRevenue.slice(0, 10).map((client, index) => (
                    <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="py-2 text-gray-900 dark:text-gray-100">{client.name}</td>
                      <td className="text-right py-2 font-semibold text-gray-900 dark:text-gray-100">
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
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Most Active Clients
              </h3>
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 text-gray-900 dark:text-gray-100">Client</th>
                    <th className="text-right py-2 text-gray-900 dark:text-gray-100">Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.clientMetrics.topBySessions.slice(0, 10).map((client, index) => (
                    <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="py-2 text-gray-900 dark:text-gray-100">{client.name}</td>
                      <td className="text-right py-2 font-semibold text-gray-900 dark:text-gray-100">
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
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-green-600 dark:text-green-400",
    red: "text-red-600 dark:text-red-400",
    yellow: "text-yellow-600 dark:text-yellow-400",
  }

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <p className={`text-3xl font-bold mt-2 ${colorClasses[color]}`}>
        {value}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
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
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("xlsx")
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
      format: exportFormat,
    })

    if (exportType === "month") {
      params.append("month", selectedMonth.toString())
    }

    window.location.href = `/api/analytics/export?${params.toString()}`
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl dark:shadow-2xl dark:shadow-black/40 border border-gray-200 dark:border-gray-700 max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Export Payment Data
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Export paid invoices as CSV for tax purposes. Only includes payments that have been received.
        </p>

        {/* Export Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Export Period
          </label>
          <div className="flex gap-4">
            <button
              onClick={() => setExportType("month")}
              className={`flex-1 py-2 px-4 rounded-md font-medium ${
                exportType === "month"
                  ? "bg-blue-600 dark:bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              Specific Month
            </button>
            <button
              onClick={() => setExportType("year")}
              className={`flex-1 py-2 px-4 rounded-md font-medium ${
                exportType === "year"
                  ? "bg-blue-600 dark:bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              Calendar Year
            </button>
          </div>
        </div>

        {/* Month Selection */}
        {exportType === "month" && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Month
            </label>
            <div className="grid grid-cols-2 gap-4">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
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
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Export Format Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            File Format
          </label>
          <div className="flex gap-4">
            <button
              onClick={() => setExportFormat("csv")}
              className={`flex-1 py-2 px-4 rounded-md font-medium ${
                exportFormat === "csv"
                  ? "bg-blue-600 dark:bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              CSV
            </button>
            <button
              onClick={() => setExportFormat("xlsx")}
              className={`flex-1 py-2 px-4 rounded-md font-medium ${
                exportFormat === "xlsx"
                  ? "bg-blue-600 dark:bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              Excel (.xlsx)
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {exportFormat === "csv"
              ? "CSV files can be opened in any spreadsheet application"
              : "Excel files include formatted columns and are ready to use"}
          </p>
        </div>

        {/* Export Details */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-4 mb-6">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
            Export will include:
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
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
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="flex-1 px-4 py-2 min-h-[44px] bg-green-600 dark:bg-green-500 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600 font-medium"
          >
            Download {exportFormat === "xlsx" ? "Excel" : "CSV"}
          </button>
        </div>
      </div>
    </div>
  )
}

// Skeleton Components
function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700">
      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-2" />
      <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1" />
    </div>
  )
}

function ChartCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700">
      <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
      <div className="h-[300px] flex flex-col justify-end">
        {/* Fake chart bars/lines */}
        <div className="flex items-end justify-around h-full gap-2 px-4">
          <div className="w-full h-[40%] bg-gray-200 dark:bg-gray-700 rounded-t animate-pulse" style={{ animationDelay: '0ms' }} />
          <div className="w-full h-[65%] bg-gray-200 dark:bg-gray-700 rounded-t animate-pulse" style={{ animationDelay: '100ms' }} />
          <div className="w-full h-[45%] bg-gray-200 dark:bg-gray-700 rounded-t animate-pulse" style={{ animationDelay: '200ms' }} />
          <div className="w-full h-[80%] bg-gray-200 dark:bg-gray-700 rounded-t animate-pulse" style={{ animationDelay: '300ms' }} />
          <div className="w-full h-[55%] bg-gray-200 dark:bg-gray-700 rounded-t animate-pulse" style={{ animationDelay: '400ms' }} />
          <div className="w-full h-[70%] bg-gray-200 dark:bg-gray-700 rounded-t animate-pulse" style={{ animationDelay: '500ms' }} />
          <div className="w-full h-[50%] bg-gray-200 dark:bg-gray-700 rounded-t animate-pulse" style={{ animationDelay: '600ms' }} />
        </div>
      </div>
    </div>
  )
}

function TableCardSkeleton() {
  const rowWidths = ['80%', '65%', '90%', '70%', '75%']

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700">
      <div className="h-5 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-2">
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </th>
            <th className="text-right py-2">
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto" />
            </th>
          </tr>
        </thead>
        <tbody>
          {rowWidths.map((width, index) => (
            <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
              <td className="py-2">
                <div
                  className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                  style={{ width, animationDelay: `${index * 100}ms` }}
                />
              </td>
              <td className="text-right py-2">
                <div
                  className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto"
                  style={{ animationDelay: `${index * 100}ms` }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
