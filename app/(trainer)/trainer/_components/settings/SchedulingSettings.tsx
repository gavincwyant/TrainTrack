import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useEffect } from "react"
import { Settings } from "../useTrainerSettings"

const settingsSchema = z.object({
  dayStartTime: z.string().min(1, "Start time is required"),
  dayEndTime: z.string().min(1, "End time is required"),
  timezone: z.string(),
}).refine((data) => data.dayStartTime < data.dayEndTime, {
  message: "End time must be after start time",
  path: ["dayEndTime"],
})

type SettingsFormData = z.infer<typeof settingsSchema>

type Props = {
  settings: Settings | null
  onUpdate: (data: Partial<Settings>) => Promise<boolean>
  isLoading: boolean
  isSaving: boolean
}

export function SchedulingSettings({ settings, onUpdate, isLoading, isSaving }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      dayStartTime: "06:00",
      dayEndTime: "22:00",
      timezone: "America/New_York",
    },
  })

  useEffect(() => {
    if (settings) {
      reset({
        dayStartTime: settings.dayStartTime,
        dayEndTime: settings.dayEndTime,
        timezone: settings.timezone,
      })
    }
  }, [settings, reset])

  const onSubmit = async (data: SettingsFormData) => {
    await onUpdate(data)
  }

  if (isLoading) {
    return <div className="text-gray-600 dark:text-gray-400">Loading settings...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Scheduling & Availability</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Configure your calendar hours and timezone preferences</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="dayStartTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Day Start Time
            </label>
            <input
              {...register("dayStartTime")}
              type="time"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            {errors.dayStartTime && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.dayStartTime.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              When does your workday typically start?
            </p>
          </div>

          <div>
            <label htmlFor="dayEndTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Day End Time
            </label>
            <input
              {...register("dayEndTime")}
              type="time"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            {errors.dayEndTime && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.dayEndTime.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              When does your workday typically end?
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Timezone
          </label>
          <select
            {...register("timezone")}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="America/Anchorage">Alaska Time (AKT)</option>
            <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
          </select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Your local timezone for scheduling
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">How this works:</h3>
          <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
            <li>Your calendar will only show hours between your start and end times</li>
            <li>Clients will see your availability within these hours</li>
            <li>You can still block specific times using the availability manager</li>
          </ul>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  )
}
