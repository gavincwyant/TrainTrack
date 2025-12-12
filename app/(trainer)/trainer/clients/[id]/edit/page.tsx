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
  billingFrequency: z.enum(["PER_SESSION", "MONTHLY"]),
  sessionRate: z.string().min(1, "Session rate is required"),
  groupSessionRate: z.string().optional(),
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

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      billingFrequency: "PER_SESSION",
      autoInvoiceEnabled: true,
    },
  })

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const response = await fetch(`/api/clients/${id}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch client")
        }

        const client = data.client
        reset({
          fullName: client.fullName,
          email: client.email,
          phone: client.phone || "",
          billingFrequency: client.clientProfile?.billingFrequency || "PER_SESSION",
          sessionRate: client.clientProfile?.sessionRate?.toString() || "",
          groupSessionRate: client.clientProfile?.groupSessionRate?.toString() || "",
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
      </div>
    </div>
  )
}
