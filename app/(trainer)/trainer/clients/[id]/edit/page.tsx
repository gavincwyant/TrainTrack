"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"

const clientSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  billingFrequency: z.enum(["PER_SESSION", "MONTHLY", "PREPAID"]),
  sessionRate: z.string().min(1, "Session rate is required"),
  groupSessionRate: z.string().optional(),
  prepaidTargetBalance: z.string().optional(),
  notes: z.string().optional(),
  autoInvoiceEnabled: z.boolean(),
})

type ClientFormData = z.infer<typeof clientSchema>

type TrainerDefaults = {
  defaultIndividualSessionRate: number | null
  defaultGroupSessionRate: number | null
}

export default function EditClientPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [trainerDefaults, setTrainerDefaults] = useState<TrainerDefaults | null>(null)
  const [showStatusConfirm, setShowStatusConfirm] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [clientName, setClientName] = useState("")
  const [isClientActive, setIsClientActive] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      billingFrequency: "PER_SESSION",
      autoInvoiceEnabled: true,
    },
  })

  const billingFrequency = watch("billingFrequency")

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const response = await fetch(`/api/clients/${id}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch client")
        }

        const client = data.client
        setClientName(client.fullName)
        setIsClientActive(client.isActive ?? true)
        reset({
          fullName: client.fullName,
          email: client.email,
          phone: client.phone || "",
          billingFrequency: client.clientProfile?.billingFrequency || "PER_SESSION",
          sessionRate: client.clientProfile?.sessionRate?.toString() || "",
          groupSessionRate: client.clientProfile?.groupSessionRate?.toString() || "",
          prepaidTargetBalance: client.clientProfile?.prepaidTargetBalance?.toString() || "",
          notes: client.clientProfile?.notes || "",
          autoInvoiceEnabled: client.clientProfile?.autoInvoiceEnabled ?? true,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load client")
      } finally {
        setIsFetching(false)
      }
    }

    const fetchDefaults = async () => {
      try {
        const response = await fetch("/api/trainer-settings")
        if (response.ok) {
          const data = await response.json()
          const settings = data.settings
          setTrainerDefaults({
            defaultIndividualSessionRate: settings.defaultIndividualSessionRate,
            defaultGroupSessionRate: settings.defaultGroupSessionRate,
          })
        }
      } catch (err) {
        // Silently fail - defaults are optional
        console.error("Failed to fetch trainer defaults:", err)
      }
    }

    fetchClient()
    fetchDefaults()
  }, [id, reset])

  const onSubmit = async (data: ClientFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to update client")
      }

      router.push(`/trainer/clients/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleActive = async () => {
    setIsUpdatingStatus(true)
    setError(null)

    try {
      const response = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isClientActive }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to update client status")
      }

      setIsClientActive(!isClientActive)
      setShowStatusConfirm(false)
      router.push("/trainer/clients")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setShowStatusConfirm(false)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  if (isFetching) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <p className="text-gray-600 dark:text-gray-400">Loading client...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href={`/trainer/clients/${id}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
          ← Back to client
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Edit Client</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-4 border border-red-200 dark:border-red-800">
              <div className="text-sm text-red-800 dark:text-red-300">{error}</div>
            </div>
          )}

          {/* Client Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Client Information</h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Full Name *
                </label>
                <input
                  {...register("fullName")}
                  type="text"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 sm:text-sm"
                  placeholder="John Doe"
                />
                {errors.fullName && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.fullName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email Address *
                </label>
                <input
                  {...register("email")}
                  type="email"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 sm:text-sm"
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Phone Number
                </label>
                <input
                  {...register("phone")}
                  type="tel"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 sm:text-sm"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Billing Information */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Billing Information</h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="billingFrequency" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Billing Frequency *
                </label>
                <select
                  {...register("billingFrequency")}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 sm:text-sm"
                >
                  <option value="PER_SESSION">Per Session</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="PREPAID">Prepaid</option>
                </select>
                {errors.billingFrequency && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.billingFrequency.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="sessionRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Individual Session Rate (USD) *
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
                  </div>
                  <input
                    {...register("sessionRate")}
                    type="number"
                    step="0.01"
                    className="block w-full pl-7 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 sm:text-sm"
                    placeholder="75.00"
                  />
                </div>
                {errors.sessionRate && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.sessionRate.message}</p>
                )}
                {trainerDefaults?.defaultIndividualSessionRate && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Your default: ${Number(trainerDefaults.defaultIndividualSessionRate).toFixed(2)}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="groupSessionRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Group Session Rate (USD)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
                  </div>
                  <input
                    {...register("groupSessionRate")}
                    type="number"
                    step="0.01"
                    className="block w-full pl-7 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 sm:text-sm"
                    placeholder="Leave blank to use trainer's default"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Rate for group training sessions. If blank, uses your default group rate, then falls back to individual rate.
                </p>
                {trainerDefaults?.defaultGroupSessionRate && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Your default: ${Number(trainerDefaults.defaultGroupSessionRate).toFixed(2)}
                  </p>
                )}
              </div>

              {billingFrequency === "PREPAID" && (
                <div>
                  <label htmlFor="prepaidTargetBalance" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Prepaid Target Balance (USD)
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
                    </div>
                    <input
                      {...register("prepaidTargetBalance")}
                      type="number"
                      step="0.01"
                      className="block w-full pl-7 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 sm:text-sm"
                      placeholder="400.00"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    The target balance to invoice back to when balance runs low.
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notes
                </label>
                <textarea
                  {...register("notes")}
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 sm:text-sm"
                  placeholder="Goals, preferences, special requirements..."
                />
              </div>

              <div className="flex items-start">
                <input
                  {...register("autoInvoiceEnabled")}
                  type="checkbox"
                  id="autoInvoiceEnabled"
                  className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 rounded mt-1"
                />
                <label htmlFor="autoInvoiceEnabled" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Enable automatic invoicing for this client
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    When enabled, invoices will be automatically generated and sent based on billing frequency. Disable if you prefer to create invoices manually for this client.
                  </p>
                </label>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Link
              href={`/trainer/clients/${id}`}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>

        {/* Client Status */}
        <div className={`mt-8 border-t pt-6 ${isClientActive ? "border-yellow-200 dark:border-yellow-800" : "border-green-200 dark:border-green-800"}`}>
          <h3 className={`text-lg font-medium mb-4 ${isClientActive ? "text-yellow-600 dark:text-yellow-400" : "text-green-600 dark:text-green-400"}`}>
            Client Status
          </h3>
          <div className={`rounded-lg p-4 ${isClientActive ? "bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800" : "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"}`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className={`text-sm font-medium ${isClientActive ? "text-yellow-800 dark:text-yellow-300" : "text-green-800 dark:text-green-300"}`}>
                  {isClientActive ? "Mark client as inactive" : "Reactivate client"}
                </p>
                <p className={`text-sm mt-1 ${isClientActive ? "text-yellow-600 dark:text-yellow-400" : "text-green-600 dark:text-green-400"}`}>
                  {isClientActive
                    ? "Inactive clients are moved to a separate section and won't appear in scheduling or billing. All data is preserved."
                    : "Reactivating will move this client back to your active clients list."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowStatusConfirm(true)}
                className={`px-4 py-2 text-white rounded-md whitespace-nowrap ${isClientActive ? "bg-yellow-600 dark:bg-yellow-500 hover:bg-yellow-700 dark:hover:bg-yellow-600" : "bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600"}`}
              >
                {isClientActive ? "Mark Inactive" : "Reactivate"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Status Change Confirmation Modal */}
      {showStatusConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl dark:shadow-2xl dark:shadow-black/40 border border-gray-200 dark:border-gray-700 max-w-md w-full">
            <div className={`px-6 py-4 border-b ${isClientActive ? "border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/30" : "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30"} rounded-t-lg`}>
              <h2 className={`text-xl font-semibold ${isClientActive ? "text-yellow-800 dark:text-yellow-200" : "text-green-800 dark:text-green-200"}`}>
                {isClientActive ? "Mark Client Inactive" : "Reactivate Client"}
              </h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-600 dark:text-gray-400">
                Are you sure you want to {isClientActive ? "mark" : "reactivate"} <span className="font-semibold text-gray-900 dark:text-gray-100">{clientName}</span> as {isClientActive ? "inactive" : "active"}?
              </p>
              <p className={`text-sm mt-3 ${isClientActive ? "text-yellow-600 dark:text-yellow-400" : "text-green-600 dark:text-green-400"}`}>
                {isClientActive
                  ? "The client will be moved to the Inactive Clients section. All historical data including appointments, invoices, and workout sessions will be preserved."
                  : "The client will be moved back to your active clients list and will appear in scheduling and billing."}
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowStatusConfirm(false)}
                disabled={isUpdatingStatus}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleActive}
                disabled={isUpdatingStatus}
                className={`px-4 py-2 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${isClientActive ? "bg-yellow-600 dark:bg-yellow-500 hover:bg-yellow-700 dark:hover:bg-yellow-600" : "bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600"}`}
              >
                {isUpdatingStatus ? "Updating..." : isClientActive ? "Mark Inactive" : "Reactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
