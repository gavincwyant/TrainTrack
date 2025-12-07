"use client"

import { useState, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"

const exerciseSchema = z.object({
  name: z.string().min(1, "Exercise name is required"),
  sets: z.number().int().min(1, "Must be at least 1 set"),
  reps: z.number().int().min(1, "Must be at least 1 rep"),
  weight: z.number().min(0).optional(),
  notes: z.string().optional(),
})

const workoutSessionSchema = z.object({
  appointmentId: z.string().min(1, "Please select an appointment"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  exercises: z.array(exerciseSchema).optional(),
  customMetrics: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
})

type WorkoutSessionFormData = z.infer<typeof workoutSessionSchema>

type Appointment = {
  id: string
  startTime: string
  client: {
    fullName: string
  }
}

type CustomMetric = {
  id: string
  name: string
  unit: string | null
  dataType: string
}

export default function LogWorkoutPage() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [customMetrics, setCustomMetrics] = useState<CustomMetric[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<WorkoutSessionFormData>({
    resolver: zodResolver(workoutSessionSchema),
    defaultValues: {
      appointmentId: "",
      date: new Date().toISOString().split("T")[0],
      exercises: [{ name: "", sets: 3, reps: 10, weight: 0, notes: "" }],
      customMetrics: {},
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "exercises",
  })

  const selectedAppointmentId = watch("appointmentId")

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    // Auto-populate date when appointment is selected
    if (selectedAppointmentId) {
      const appointment = appointments.find((a) => a.id === selectedAppointmentId)
      if (appointment) {
        const appointmentDate = new Date(appointment.startTime).toISOString().split("T")[0]
        // This will update the form value
        const dateInput = document.getElementById("date") as HTMLInputElement
        if (dateInput) {
          dateInput.value = appointmentDate
        }
      }
    }
  }, [selectedAppointmentId, appointments])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Fetch completed appointments
      const appointmentsRes = await fetch("/api/appointments?status=COMPLETED")
      const appointmentsData = await appointmentsRes.json()

      if (!appointmentsRes.ok) {
        throw new Error(appointmentsData.error || "Failed to fetch appointments")
      }

      setAppointments(appointmentsData.appointments || [])

      // Fetch custom metrics
      const metricsRes = await fetch("/api/custom-metrics")
      const metricsData = await metricsRes.json()

      if (!metricsRes.ok) {
        throw new Error(metricsData.error || "Failed to fetch metrics")
      }

      setCustomMetrics(metricsData.metrics || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: WorkoutSessionFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Process custom metrics based on data type
      const processedMetrics: Record<string, string | number | boolean> = {}

      if (data.customMetrics) {
        Object.entries(data.customMetrics).forEach(([key, value]) => {
          const metric = customMetrics.find((m) => m.id === key)
          if (metric) {
            if (metric.dataType === "NUMBER") {
              processedMetrics[metric.name] = Number(value)
            } else if (metric.dataType === "BOOLEAN") {
              processedMetrics[metric.name] = value === "true" || value === true
            } else {
              processedMetrics[metric.name] = String(value)
            }
          }
        })
      }

      const payload = {
        appointmentId: data.appointmentId,
        date: data.date,
        notes: data.notes,
        exercises: data.exercises?.filter((e) => e.name.trim() !== ""),
        customMetrics: processedMetrics,
      }

      const response = await fetch("/api/workout-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to log workout session")
      }

      router.push("/trainer/workouts")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Log Workout Session</h1>
        <p className="mt-2 text-gray-600">Record exercises and metrics from a completed session</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Appointment Selection */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Session Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="appointmentId" className="block text-sm font-medium text-gray-700">
                Select Completed Appointment *
              </label>
              <select
                {...register("appointmentId")}
                id="appointmentId"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">-- Select an appointment --</option>
                {appointments.map((apt) => (
                  <option key={apt.id} value={apt.id}>
                    {apt.client.fullName} - {new Date(apt.startTime).toLocaleDateString()} at{" "}
                    {new Date(apt.startTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </option>
                ))}
              </select>
              {errors.appointmentId && (
                <p className="mt-1 text-sm text-red-600">{errors.appointmentId.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                Session Date *
              </label>
              <input
                {...register("date")}
                type="date"
                id="date"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>}
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Session Notes
            </label>
            <textarea
              {...register("notes")}
              id="notes"
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Overall session observations, client feedback, etc."
            />
          </div>
        </div>

        {/* Exercises */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Exercises</h2>
            <button
              type="button"
              onClick={() => append({ name: "", sets: 3, reps: 10, weight: 0, notes: "" })}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              + Add Exercise
            </button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="border border-gray-200 rounded-md p-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Exercise {index + 1}</h3>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="md:col-span-2 lg:col-span-1">
                    <label className="block text-xs font-medium text-gray-700">Exercise Name *</label>
                    <input
                      {...register(`exercises.${index}.name`)}
                      type="text"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="e.g., Bench Press"
                    />
                    {errors.exercises?.[index]?.name && (
                      <p className="mt-1 text-xs text-red-600">{errors.exercises[index]?.name?.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700">Sets *</label>
                    <input
                      {...register(`exercises.${index}.sets`, { valueAsNumber: true })}
                      type="number"
                      min="1"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    {errors.exercises?.[index]?.sets && (
                      <p className="mt-1 text-xs text-red-600">{errors.exercises[index]?.sets?.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700">Reps *</label>
                    <input
                      {...register(`exercises.${index}.reps`, { valueAsNumber: true })}
                      type="number"
                      min="1"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    {errors.exercises?.[index]?.reps && (
                      <p className="mt-1 text-xs text-red-600">{errors.exercises[index]?.reps?.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700">Weight (lbs)</label>
                    <input
                      {...register(`exercises.${index}.weight`, { valueAsNumber: true })}
                      type="number"
                      min="0"
                      step="0.5"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-700">Exercise Notes</label>
                  <input
                    {...register(`exercises.${index}.notes`)}
                    type="text"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Form observations, difficulty, etc."
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Metrics */}
        {customMetrics.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Custom Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customMetrics.map((metric) => (
                <div key={metric.id}>
                  <label className="block text-sm font-medium text-gray-700">
                    {metric.name}
                    {metric.unit && <span className="text-gray-500 text-xs ml-1">({metric.unit})</span>}
                  </label>
                  {metric.dataType === "NUMBER" && (
                    <input
                      {...register(`customMetrics.${metric.id}`)}
                      type="number"
                      step="any"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  )}
                  {metric.dataType === "TEXT" && (
                    <input
                      {...register(`customMetrics.${metric.id}`)}
                      type="text"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  )}
                  {metric.dataType === "BOOLEAN" && (
                    <select
                      {...register(`customMetrics.${metric.id}`)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">-- Select --</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Logging Session..." : "Log Workout Session"}
          </button>
        </div>
      </form>
    </div>
  )
}
