"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { User, ClientProfile } from "@prisma/client"

type ClientWithProfile = User & {
  clientProfile: ClientProfile | null
}

type EditClientData = {
  fullName: string
  email: string
  phone: string
  billingFrequency: "PER_SESSION" | "MONTHLY" | "PREPAID"
  sessionRate: string
  notes: string
  autoInvoiceEnabled: boolean
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientWithProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingClient, setEditingClient] = useState<ClientWithProfile | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [reactivatingId, setReactivatingId] = useState<string | null>(null)
  const [clientToReactivate, setClientToReactivate] = useState<ClientWithProfile | null>(null)
  const [formData, setFormData] = useState<EditClientData>({
    fullName: "",
    email: "",
    phone: "",
    billingFrequency: "PER_SESSION",
    sessionRate: "",
    notes: "",
    autoInvoiceEnabled: true,
  })

  // Filter clients by active status
  const activeClients = clients.filter(c => c.isActive !== false)
  const inactiveClients = clients.filter(c => c.isActive === false)

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/clients")
      const data = await response.json()
      setClients(data.clients || [])
    } catch (err) {
      console.error("Failed to fetch clients:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditClick = (client: ClientWithProfile) => {
    setEditingClient(client)
    setFormData({
      fullName: client.fullName,
      email: client.email,
      phone: client.phone || "",
      billingFrequency: client.clientProfile?.billingFrequency || "PER_SESSION",
      sessionRate: client.clientProfile?.sessionRate.toString() || "",
      notes: client.clientProfile?.notes || "",
      autoInvoiceEnabled: client.clientProfile?.autoInvoiceEnabled ?? true,
    })
    setIsEditModalOpen(true)
    setError(null)
  }

  const handleCloseModal = () => {
    setIsEditModalOpen(false)
    setEditingClient(null)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingClient) return

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/clients/${editingClient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to update client")
      }

      // Refresh clients list
      await fetchClients()
      handleCloseModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSaving(false)
    }
  }

  const handleReactivateClick = (client: ClientWithProfile) => {
    setClientToReactivate(client)
  }

  const handleReactivateConfirm = async () => {
    if (!clientToReactivate) return

    setReactivatingId(clientToReactivate.id)
    try {
      const response = await fetch(`/api/clients/${clientToReactivate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || "Failed to reactivate client")
      }

      await fetchClients()
      setClientToReactivate(null)
    } catch (err) {
      console.error("Failed to reactivate client:", err)
    } finally {
      setReactivatingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Clients</h1>
        </div>
        <div className="bg-white dark:bg-gray-900 p-12 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 text-center">
          <p className="text-gray-600 dark:text-gray-400">Loading clients...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Clients</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">Manage your training clients</p>
        </div>
        <Link
          href="/trainer/clients/new"
          className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 font-medium text-center min-h-[44px] flex items-center justify-center sm:w-auto"
        >
          + Add Client
        </Link>
      </div>

      {/* Clients List */}
      {clients.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 p-12 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No clients yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Get started by adding your first client</p>
          <Link
            href="/trainer/clients/new"
            className="inline-block px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 font-medium"
          >
            Add Your First Client
          </Link>
        </div>
      ) : (
        <>
          {/* Active Clients Section */}
          {activeClients.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 text-center">
              <p className="text-gray-600 dark:text-gray-400">No active clients. {inactiveClients.length > 0 && "Check the inactive clients section below."}</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {activeClients.map((client: ClientWithProfile) => (
              <div
                key={client.id}
                className="bg-white dark:bg-gray-900 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* Card Header */}
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {client.fullName}
                    </h3>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 ${
                      client.clientProfile?.billingFrequency === "PREPAID"
                        ? "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300"
                        : "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300"
                    }`}>
                      {client.clientProfile?.billingFrequency === "PER_SESSION"
                        ? "Per Session"
                        : client.clientProfile?.billingFrequency === "PREPAID"
                          ? "Prepaid"
                          : "Monthly"}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <dl className="px-4 py-3 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <dt className="text-gray-500 dark:text-gray-400">Email</dt>
                    <dd className="text-gray-900 dark:text-gray-100 font-medium text-right truncate ml-2 max-w-[60%]">
                      {client.email}
                    </dd>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <dt className="text-gray-500 dark:text-gray-400">Phone</dt>
                    <dd className="text-gray-900 dark:text-gray-100 font-medium">
                      {client.phone || "—"}
                    </dd>
                  </div>
                  {client.clientProfile?.sessionRate && (
                    <div className="flex justify-between items-center text-sm">
                      <dt className="text-gray-500 dark:text-gray-400">Rate</dt>
                      <dd className="text-gray-900 dark:text-gray-100 font-medium">
                        ${String(client.clientProfile.sessionRate)}
                      </dd>
                    </div>
                  )}
                </dl>

                {/* Card Actions */}
                <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex gap-2">
                    <Link
                      href={`/trainer/clients/${client.id}`}
                      className="flex-1 px-3 py-2 text-sm font-medium text-center rounded-md bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 min-h-[44px] flex items-center justify-center"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleEditClick(client)}
                      className="flex-1 px-3 py-2 text-sm font-medium text-center rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 min-h-[44px] flex items-center justify-center"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block bg-white dark:bg-gray-900 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Billing
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {activeClients.map((client: ClientWithProfile) => (
                  <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{client.fullName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 dark:text-gray-400">{client.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 dark:text-gray-400">{client.phone || "—"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        client.clientProfile?.billingFrequency === "PREPAID"
                          ? "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300"
                          : "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300"
                      }`}>
                        {client.clientProfile?.billingFrequency === "PER_SESSION"
                          ? "Per Session"
                          : client.clientProfile?.billingFrequency === "PREPAID"
                            ? "Prepaid"
                            : "Monthly"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/trainer/clients/${client.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-4"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleEditClick(client)}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Inactive Clients Section */}
          {inactiveClients.length > 0 && (
            <div className="mt-8">
              <button
                onClick={() => setShowInactive(!showInactive)}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${showInactive ? "rotate-90" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="font-medium">Inactive Clients ({inactiveClients.length})</span>
              </button>

              {showInactive && (
                <>
                  {/* Mobile Card View - Inactive */}
                  <div className="md:hidden space-y-4">
                    {inactiveClients.map((client: ClientWithProfile) => (
                      <div
                        key={client.id}
                        className="bg-gray-50 dark:bg-gray-800/50 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden opacity-75"
                      >
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-600 dark:text-gray-400">
                                {client.fullName}
                              </h3>
                              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                Inactive
                              </span>
                            </div>
                          </div>
                        </div>
                        <dl className="px-4 py-3 space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <dt className="text-gray-500 dark:text-gray-500">Email</dt>
                            <dd className="text-gray-600 dark:text-gray-400 font-medium text-right truncate ml-2 max-w-[60%]">
                              {client.email}
                            </dd>
                          </div>
                        </dl>
                        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                          <button
                            onClick={() => handleReactivateClick(client)}
                            className="text-sm text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                          >
                            Reactivate
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View - Inactive */}
                  <div className="hidden md:block bg-gray-50 dark:bg-gray-800/50 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Phone
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-gray-50 dark:bg-gray-800/30 divide-y divide-gray-200 dark:divide-gray-700">
                        {inactiveClients.map((client: ClientWithProfile) => (
                          <tr key={client.id} className="opacity-75">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">{client.fullName}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500 dark:text-gray-500">{client.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500 dark:text-gray-500">{client.phone || "—"}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                Inactive
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleReactivateClick(client)}
                                className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                              >
                                Reactivate
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingClient && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl dark:shadow-2xl dark:shadow-black/40 border border-gray-200 dark:border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Edit Client</h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4">
              {error && (
                <div className="mb-4 rounded-md bg-red-50 dark:bg-red-950/30 p-4 border border-red-200 dark:border-red-800">
                  <div className="text-sm text-red-800 dark:text-red-300">{error}</div>
                </div>
              )}

              <div className="space-y-4">
                {/* Client Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Client Information</h3>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Full Name *
                      </label>
                      <input
                        id="fullName"
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 sm:text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email Address *
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 sm:text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Phone Number
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Billing Information */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Billing Information</h3>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="billingFrequency" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Billing Frequency *
                      </label>
                      <select
                        id="billingFrequency"
                        value={formData.billingFrequency}
                        onChange={(e) => setFormData({ ...formData, billingFrequency: e.target.value as "PER_SESSION" | "MONTHLY" | "PREPAID" })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 sm:text-sm"
                      >
                        <option value="PER_SESSION">Per Session</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="PREPAID">Prepaid</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="sessionRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Session Rate (USD) *
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
                        </div>
                        <input
                          id="sessionRate"
                          type="number"
                          step="0.01"
                          value={formData.sessionRate}
                          onChange={(e) => setFormData({ ...formData, sessionRate: e.target.value })}
                          className="block w-full pl-7 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 sm:text-sm"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Notes
                      </label>
                      <textarea
                        id="notes"
                        rows={3}
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 sm:text-sm"
                      />
                    </div>

                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        id="autoInvoiceEnabled"
                        checked={formData.autoInvoiceEnabled}
                        onChange={(e) => setFormData({ ...formData, autoInvoiceEnabled: e.target.checked })}
                        className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 rounded mt-1"
                      />
                      <label htmlFor="autoInvoiceEnabled" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                        Enable automatic invoicing for this client
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          When enabled, invoices will be automatically generated and sent based on billing frequency.
                        </p>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="mt-6 flex justify-end space-x-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reactivate Confirmation Modal */}
      {clientToReactivate && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl dark:shadow-2xl dark:shadow-black/40 border border-gray-200 dark:border-gray-700 max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Reactivate Client</h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-600 dark:text-gray-400">
                Are you sure you want to reactivate <span className="font-semibold text-gray-900 dark:text-gray-100">{clientToReactivate.fullName}</span>?
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                This client will be moved back to your active clients list.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setClientToReactivate(null)}
                disabled={reactivatingId === clientToReactivate.id}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReactivateConfirm}
                disabled={reactivatingId === clientToReactivate.id}
                className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reactivatingId === clientToReactivate.id ? "Reactivating..." : "Reactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
