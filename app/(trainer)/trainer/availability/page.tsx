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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Availability</h1>
          <p className="mt-2 text-gray-600">
            Set your recurring weekly availability for client bookings
          </p>
        </div>
        <Link
          href="/trainer/calendar"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          View Calendar
        </Link>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {/* Add Availability Form */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Add Availability Block
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="dayOfWeek"
                className="block text-sm font-medium text-gray-700"
              >
                Day of Week
              </label>
              <select
                {...register("dayOfWeek")}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {DAYS_OF_WEEK.map((day, index) => (
                  <option key={index} value={index}>
                    {day}
                  </option>
                ))}
              </select>
              {errors.dayOfWeek && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.dayOfWeek.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="startTime"
                className="block text-sm font-medium text-gray-700"
              >
                Start Time
              </label>
              <input
                {...register("startTime")}
                type="time"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {errors.startTime && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.startTime.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="endTime"
                className="block text-sm font-medium text-gray-700"
              >
                End Time
              </label>
              <input
                {...register("endTime")}
                type="time"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {errors.endTime && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.endTime.message}
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Adding..." : "Add Availability"}
          </button>
        </form>
      </div>

      {/* Current Availability */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Current Availability
        </h2>

        {isLoading ? (
          <p className="text-gray-600">Loading...</p>
        ) : availability.length === 0 ? (
          <p className="text-gray-600">
            No availability set. Add your first availability block above.
          </p>
        ) : (
          <div className="space-y-4">
            {DAYS_OF_WEEK.map((day, dayIndex) => {
              const dayBlocks = groupedAvailability[dayIndex] || []
              if (dayBlocks.length === 0) return null

              return (
                <div key={dayIndex} className="border-b border-gray-200 pb-4">
                  <h3 className="font-medium text-gray-900 mb-2">{day}</h3>
                  <div className="space-y-2">
                    {dayBlocks.map((block) => (
                      <div
                        key={block.id}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-md"
                      >
                        <span className="text-sm text-gray-700">
                          {block.startTime} - {block.endTime}
                        </span>
                        <button
                          onClick={() => handleDelete(block.id)}
                          className="text-sm text-red-600 hover:text-red-700"
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
