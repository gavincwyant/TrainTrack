"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"

type InvoiceLineItem = {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
  appointment?: {
    id: string
    startTime: string
    endTime: string
  }
}

type Invoice = {
  id: string
  client: {
    id: string
    fullName: string
    email: string
    phone?: string
  }
  trainer: {
    id: string
    fullName: string
    email: string
  }
  amount: number
  dueDate: string
  status: string
  createdAt: string
  notes?: string
  lineItems: InvoiceLineItem[]
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchInvoice()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const fetchInvoice = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/invoices/${params.id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch invoice")
      }

      setInvoice(data.invoice)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkAsPaid = async () => {
    if (!invoice) return

    setIsUpdating(true)
    setError(null)
    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update invoice")
      }

      setInvoice(data.invoice)
      setSuccessMessage("Invoice marked as paid")
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleUnmarkAsPaid = async () => {
    if (!invoice) return

    setIsUpdating(true)
    setError(null)
    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SENT" }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update invoice")
      }

      setInvoice(data.invoice)
      setSuccessMessage("Invoice unmarked as paid")
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSendInvoice = async () => {
    if (!invoice) return

    setIsSending(true)
    setError(null)
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/send`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send invoice")
      }

      // Refresh invoice data
      await fetchInvoice()
      setSuccessMessage("Invoice sent successfully!")
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSending(false)
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300"
      case "OVERDUE":
        return "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300"
      case "SENT":
        return "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300"
      case "DRAFT":
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300"
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300"
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 rounded-lg p-12 text-center border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 rounded-lg p-12 text-center border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-red-900 dark:text-red-300 mb-2">Error</h3>
          <p className="text-red-600 dark:text-red-400 mb-6">{error || "Invoice not found"}</p>
          <Link
            href="/trainer/invoices"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            ← Back to invoices
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <Link href="/trainer/invoices" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
          ← Back to invoices
        </Link>
        <div className="flex gap-3">
          {invoice.status !== "PAID" && (
            <button
              onClick={handleSendInvoice}
              disabled={isSending}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? "Sending..." : invoice.status === "DRAFT" ? "Send Invoice" : "Resend Invoice"}
            </button>
          )}
          {invoice.status === "PAID" ? (
            <button
              onClick={handleUnmarkAsPaid}
              disabled={isUpdating}
              className="px-4 py-2 bg-yellow-600 dark:bg-yellow-600 text-white rounded-md hover:bg-yellow-700 dark:hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? "Updating..." : "Unmark as Paid"}
            </button>
          ) : (
            <button
              onClick={handleMarkAsPaid}
              disabled={isUpdating}
              className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? "Updating..." : "Mark as Paid"}
            </button>
          )}
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="rounded-md bg-green-50 dark:bg-green-950/30 p-4 border border-green-200 dark:border-green-800">
          <div className="text-sm text-green-800 dark:text-green-300">{successMessage}</div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-4 border border-red-200 dark:border-red-800">
          <div className="text-sm text-red-800 dark:text-red-300">{error}</div>
        </div>
      )}

      {/* Invoice Header */}
      <div className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="bg-blue-600 dark:bg-blue-700 text-white px-6 py-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">Invoice</h1>
              <p className="text-blue-100 dark:text-blue-200 mt-1">From {invoice.trainer.fullName}</p>
            </div>
            <span
              className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadgeClass(
                invoice.status
              )}`}
            >
              {invoice.status}
            </span>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="px-6 py-6 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Bill To</p>
              <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">{invoice.client.fullName}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{invoice.client.email}</p>
              {invoice.client.phone && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{invoice.client.phone}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Invoice Date</p>
              <p className="mt-1 text-gray-900 dark:text-gray-100">
                {new Date(invoice.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mt-3">Due Date</p>
              <p className="mt-1 font-semibold text-red-600 dark:text-red-400">
                {new Date(invoice.dueDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="px-6 py-6">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase py-3">
                  Description
                </th>
                <th className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase py-3">
                  Qty
                </th>
                <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase py-3">
                  Rate
                </th>
                <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase py-3">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-3 text-sm text-gray-900 dark:text-gray-100">{item.description}</td>
                  <td className="py-3 text-sm text-center text-gray-700 dark:text-gray-300">{item.quantity}</td>
                  <td className="py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                    ${Number(item.unitPrice).toFixed(2)}
                  </td>
                  <td className="py-3 text-sm text-right font-semibold text-gray-900 dark:text-gray-100">
                    ${Number(item.total).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="pt-6 text-right text-base font-semibold text-gray-900 dark:text-gray-100">
                  Total Due
                </td>
                <td className="pt-6 text-right text-lg font-bold text-blue-600 dark:text-blue-400">
                  ${Number(invoice.amount).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="px-6 py-4 bg-yellow-50 dark:bg-yellow-950/30 border-t border-yellow-100 dark:border-yellow-800">
            <p className="text-sm font-medium text-yellow-900 dark:text-yellow-300">Note:</p>
            <p className="mt-1 text-sm text-yellow-800 dark:text-yellow-300">{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Questions about this invoice? Contact {invoice.trainer.fullName} at{" "}
            {invoice.trainer.email}
          </p>
        </div>
      </div>
    </div>
  )
}
