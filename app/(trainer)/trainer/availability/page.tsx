"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"

const availabilitySchema = z.object({
  dayOfWeek: z.string(),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
}).refine((data) => data.startTime < data.endTime, {
  message: "End time must be after start time",
  path: ["endTime"],
})

type AvailabilityFormData = z.infer<typeof availabilitySchema>

type AvailabilityBlock = {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isRecurring: boolean
}

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]

export default function AvailabilityPage() {
  const [availability, setAvailability] = useState<AvailabilityBlock[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AvailabilityFormData>({
    resolver: zodResolver(availabilitySchema),
    defaultValues: {
      dayOfWeek: "1", // Monday
    },
  })

  useEffect(() => {
    fetchAvailability()
  }, [])

  const fetchAvailability = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/availability")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch availability")
      }

      setAvailability(data.availability)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: AvailabilityFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayOfWeek: parseInt(data.dayOfWeek),
          startTime: data.startTime,
          endTime: data.endTime,
          isRecurring: true,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to add availability")
      }

      reset()
      fetchAvailability()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this availability block?")) {
      return
    }

    try {
      const response = await fetch(`/api/availability/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete availability")
      }

      fetchAvailability()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const groupedAvailability = availability.reduce((acc, block) => {
    if (!acc[block.dayOfWeek]) {
      acc[block.dayOfWeek] = []
    }
    acc[block.dayOfWeek].push(block)
    return acc
  }, {} as Record<number, AvailabilityBlock[]>)

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Availability</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Set your recurring weekly availability for client bookings
          </p>
        </div>
        <Link
          href="/trainer/calendar"
          className="px-4 py-2 min-h-[44px] flex items-center justify-center bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
        >
          View Calendar
        </Link>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-4 border border-red-200 dark:border-red-800">
          <div className="text-sm text-red-800 dark:text-red-300">{error}</div>
        </div>
      )}

      {/* Add Availability Form */}
      <div className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Add Availability Block
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="dayOfWeek"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Day of Week
              </label>
              <select
                {...register("dayOfWeek")}
                className="mt-1 block w-full px-3 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-base sm:text-sm"
              >
                {DAYS_OF_WEEK.map((day, index) => (
                  <option key={index} value={index}>
                    {day}
                  </option>
                ))}
              </select>
              {errors.dayOfWeek && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.dayOfWeek.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="startTime"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Start Time
              </label>
              <input
                {...register("startTime")}
                type="time"
                className="mt-1 block w-full px-3 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-base sm:text-sm"
              />
              {errors.startTime && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.startTime.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="endTime"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                End Time
              </label>
              <input
                {...register("endTime")}
                type="time"
                className="mt-1 block w-full px-3 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-base sm:text-sm"
              />
              {errors.endTime && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.endTime.message}
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 min-h-[44px] bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Adding..." : "Add Availability"}
          </button>
        </form>
      </div>

      {/* Current Availability */}
      <div className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Current Availability
        </h2>

        {isLoading ? (
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        ) : availability.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">
            No availability set. Add your first availability block above.
          </p>
        ) : (
          <div className="space-y-4">
            {DAYS_OF_WEEK.map((day, dayIndex) => {
              const dayBlocks = groupedAvailability[dayIndex] || []
              if (dayBlocks.length === 0) return null

              return (
                <div key={dayIndex} className="border-b border-gray-200 dark:border-gray-700 pb-4">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">{day}</h3>
                  <div className="space-y-2">
                    {dayBlocks.map((block) => (
                      <div
                        key={block.id}
                        className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {block.startTime} - {block.endTime}
                        </span>
                        <button
                          onClick={() => handleDelete(block.id)}
                          className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 min-h-[44px] px-2"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
