"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

type Invoice = {
  id: string
  client: { fullName: string; email: string }
  amount: number
  dueDate: string
  status: string
  createdAt: string
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filter, setFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchInvoices()
  }, [filter])

  const fetchInvoices = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/invoices?status=${filter}`)
      const data = await response.json()
      setInvoices(data.invoices || [])
    } catch (error) {
      console.error("Failed to fetch invoices:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-100 text-green-800"
      case "OVERDUE":
        return "bg-red-100 text-red-800"
      case "SENT":
        return "bg-blue-100 text-blue-800"
      case "DRAFT":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="mt-2 text-gray-600">View and manage your client invoices</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { value: "all", label: "All" },
            { value: "SENT", label: "Sent" },
            { value: "PAID", label: "Paid" },
            { value: "OVERDUE", label: "Overdue" },
            { value: "DRAFT", label: "Draft" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                filter === tab.value
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Invoice list */}
      {isLoading ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <p className="text-gray-500">Loading invoices...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
          <p className="text-gray-600">
            {filter === "all"
              ? "Invoices will be automatically generated when appointments are completed."
              : `No ${filter.toLowerCase()} invoices found.`}
          </p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {invoice.client.fullName}
                    </div>
                    <div className="text-sm text-gray-500">{invoice.client.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    ${Number(invoice.amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(invoice.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                        invoice.status
                      )}`}
                    >
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/trainer/invoices/${invoice.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
