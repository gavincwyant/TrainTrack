"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { StatusBadge } from "@/components/StatusBadge"
import { EmptyState } from "@/components/EmptyState"

type LineItem = {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
  appointment: {
    id: string
    startTime: string
    endTime: string
  } | null
}

type Invoice = {
  id: string
  amount: number
  dueDate: string
  paidAt: string | null
  status: string
  paymentMethod: string | null
  notes: string | null
  createdAt: string
  trainer: {
    id: string
    fullName: string
    email: string
  }
  lineItems: LineItem[]
}

type Summary = {
  total: number
  outstanding: number
  paid: number
  overdue: number
}

type TabType = "all" | "outstanding" | "paid"

export default function ClientInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>("all")
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null)

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/client/invoices")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch invoices")
      }

      setInvoices(data.invoices)
      setSummary(data.summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleExpand = (invoiceId: string) => {
    setExpandedInvoice(expandedInvoice === invoiceId ? null : invoiceId)
  }

  const filteredInvoices = invoices.filter((invoice) => {
    if (activeTab === "all") return true
    if (activeTab === "outstanding") return invoice.status === "SENT" || invoice.status === "OVERDUE"
    if (activeTab === "paid") return invoice.status === "PAID"
    return true
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Invoices</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading your invoices...</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Invoices</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          View and manage your training invoices
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
          <div className="text-sm text-red-800 dark:text-red-300">{error}</div>
        </div>
      )}

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Billed</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
              ${summary.total.toFixed(2)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Outstanding</p>
            <p className={`mt-1 text-2xl font-semibold ${
              summary.outstanding > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-900 dark:text-gray-100"
            }`}>
              ${summary.outstanding.toFixed(2)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Overdue</p>
            <p className={`mt-1 text-2xl font-semibold ${
              summary.overdue > 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"
            }`}>
              ${summary.overdue.toFixed(2)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Paid</p>
            <p className="mt-1 text-2xl font-semibold text-green-600 dark:text-green-400">
              ${summary.paid.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {(["all", "outstanding", "paid"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              {tab === "all" ? "All" : tab === "outstanding" ? "Outstanding" : "Paid"}
              {tab === "outstanding" && summary && summary.outstanding > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 rounded-full">
                  {invoices.filter((i) => i.status === "SENT" || i.status === "OVERDUE").length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Invoice List */}
      {filteredInvoices.length === 0 ? (
        <EmptyState
          icon={
            <svg className="h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          }
          title={activeTab === "all" ? "No invoices yet" : `No ${activeTab} invoices`}
          description={
            activeTab === "all"
              ? "Your invoices will appear here once your trainer sends them."
              : activeTab === "outstanding"
                ? "You're all caught up! No outstanding invoices."
                : "No paid invoices yet."
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredInvoices.map((invoice) => (
            <div
              key={invoice.id}
              className={`bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden ${
                invoice.status === "OVERDUE" ? "ring-2 ring-red-500 dark:ring-red-400" : ""
              }`}
            >
              <div
                className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                onClick={() => toggleExpand(invoice.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        ${invoice.amount.toFixed(2)}
                      </span>
                      <StatusBadge status={invoice.status} type="invoice" />
                    </div>
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      <p>Invoice Date: {format(new Date(invoice.createdAt), "MMM d, yyyy")}</p>
                      <p>
                        Due: {format(new Date(invoice.dueDate), "MMM d, yyyy")}
                        {invoice.status === "OVERDUE" && (
                          <span className="text-red-600 dark:text-red-400 ml-2">(Overdue)</span>
                        )}
                      </p>
                      {invoice.paidAt && (
                        <p className="text-green-600 dark:text-green-400">
                          Paid: {format(new Date(invoice.paidAt), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  </div>
                  <svg
                    className={`h-5 w-5 text-gray-400 dark:text-gray-500 transition-transform ${
                      expandedInvoice === invoice.id ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedInvoice === invoice.id && (
                <div className="px-6 pb-6 border-t border-gray-100 dark:border-gray-800">
                  {/* Trainer Info */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">From</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {invoice.trainer.fullName}
                    </p>
                    <a
                      href={`mailto:${invoice.trainer.email}`}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {invoice.trainer.email}
                    </a>
                  </div>

                  {/* Line Items */}
                  {invoice.lineItems.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Line Items</h4>
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Description
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Qty
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Price
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Total
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {invoice.lineItems.map((item) => (
                              <tr key={item.id}>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                  {item.description}
                                  {item.appointment && (
                                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                                      {format(new Date(item.appointment.startTime), "MMM d, h:mm a")}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">
                                  {item.quantity}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">
                                  ${item.unitPrice.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right font-medium">
                                  ${item.total.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                              <td colSpan={3} className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 text-right">
                                Total
                              </td>
                              <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-gray-100 text-right">
                                ${invoice.amount.toFixed(2)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Payment Info */}
                  {invoice.paymentMethod && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment Method</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {invoice.paymentMethod.replace(/_/g, " ")}
                      </p>
                    </div>
                  )}

                  {/* Notes */}
                  {invoice.notes && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap">
                        {invoice.notes}
                      </p>
                    </div>
                  )}

                  {/* Contact for Payment */}
                  {(invoice.status === "SENT" || invoice.status === "OVERDUE") && (
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        To pay this invoice, please contact your trainer at{" "}
                        <a
                          href={`mailto:${invoice.trainer.email}?subject=Invoice Payment`}
                          className="font-medium underline"
                        >
                          {invoice.trainer.email}
                        </a>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
