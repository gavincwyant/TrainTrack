"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const metricSchema = z.object({
  name: z.string().min(1, "Name is required"),
  unit: z.string().optional(),
  dataType: z.enum(["NUMBER", "TEXT", "BOOLEAN"]),
})

type MetricFormData = z.infer<typeof metricSchema>

type CustomMetric = {
  id: string
  name: string
  unit: string | null
  dataType: string
}

export default function CustomMetricsPage() {
  const [metrics, setMetrics] = useState<CustomMetric[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<MetricFormData>({
    resolver: zodResolver(metricSchema),
    defaultValues: {
      dataType: "NUMBER",
    },
  })

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/custom-metrics")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch metrics")
      }

      setMetrics(data.metrics)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: MetricFormData) => {
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/custom-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create metric")
      }

      setSuccess("Custom metric created successfully!")
      reset()
      fetchMetrics()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this metric? This action cannot be undone.")) {
      return
    }

    try {
      const response = await fetch(`/api/custom-metrics/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete metric")
      }

      setSuccess("Metric deleted successfully!")
      fetchMetrics()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Custom Metrics</h1>
        <p className="mt-2 text-gray-600">
          Define custom metrics to track client progress beyond standard exercises
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="text-sm text-green-800">{success}</div>
        </div>
      )}

      {/* Add New Metric Form */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Metric</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Metric Name *
              </label>
              <input
                {...register("name")}
                type="text"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., Flexibility Score"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="md:col-span-1">
              <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
                Unit (optional)
              </label>
              <input
                {...register("unit")}
                type="text"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., inches, 1-10"
              />
            </div>

            <div className="md:col-span-1">
              <label htmlFor="dataType" className="block text-sm font-medium text-gray-700">
                Data Type *
              </label>
              <select
                {...register("dataType")}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="NUMBER">Number</option>
                <option value="TEXT">Text</option>
                <option value="BOOLEAN">Yes/No</option>
              </select>
              {errors.dataType && (
                <p className="mt-1 text-sm text-red-600">{errors.dataType.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Adding..." : "Add Metric"}
            </button>
          </div>
        </form>
      </div>

      {/* Existing Metrics List */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Custom Metrics</h2>
        {isLoading ? (
          <p className="text-gray-600">Loading metrics...</p>
        ) : metrics.length === 0 ? (
          <p className="text-gray-600">
            No custom metrics defined yet. Add your first metric above to start tracking additional client progress data.
          </p>
        ) : (
          <div className="space-y-2">
            {metrics.map((metric) => (
              <div
                key={metric.id}
                className="flex justify-between items-center p-4 border border-gray-200 rounded-md hover:bg-gray-50"
              >
                <div>
                  <div className="font-medium text-gray-900">{metric.name}</div>
                  <div className="text-sm text-gray-600">
                    Type: {metric.dataType.toLowerCase()}
                    {metric.unit && ` • Unit: ${metric.unit}`}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(metric.id)}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">About Custom Metrics:</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Use custom metrics to track client-specific progress indicators</li>
          <li>Examples: Body weight, body fat %, flexibility score, endurance rating</li>
          <li>Metrics can be logged for each workout session alongside exercises</li>
          <li>Historical data will be displayed in client progress charts</li>
        </ul>
      </div>
    </div>
  )
}
