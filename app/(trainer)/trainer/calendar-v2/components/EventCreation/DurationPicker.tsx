'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, Clock } from 'lucide-react'

interface DurationPickerProps {
  value: number // in minutes
  onChange: (duration: number) => void
  clientId?: string
  presets?: number[] // custom presets in minutes
}

const DEFAULT_PRESETS = [30, 60, 90]
const CUSTOM_DURATIONS = [15, 45, 75, 120, 150, 180]

export function DurationPicker({
  value,
  onChange,
  clientId,
  presets = DEFAULT_PRESETS
}: DurationPickerProps) {
  const [showCustom, setShowCustom] = useState(false)
  const [lastUsedDuration, setLastUsedDuration] = useState<number | null>(null)

  // Fetch last used duration for this client
  useEffect(() => {
    if (!clientId) {
      setLastUsedDuration(null)
      return
    }

    const fetchLastDuration = async () => {
      try {
        const response = await fetch('/api/appointments')
        const data = await response.json()
        const appointments = data.appointments || []

        const clientAppointments = appointments
          .filter((apt: any) => apt.clientId === clientId)
          .sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())

        if (clientAppointments.length > 0) {
          const lastApt = clientAppointments[0]
          const duration = Math.round(
            (new Date(lastApt.endTime).getTime() - new Date(lastApt.startTime).getTime()) / (1000 * 60)
          )
          setLastUsedDuration(duration)

          // Auto-select if not already set
          if (value === 60 && duration !== 60) {
            onChange(duration)
          }
        }
      } catch (error) {
        console.error('Failed to fetch last duration:', error)
      }
    }

    fetchLastDuration()
  }, [clientId, value, onChange])

  // Check if current value is in presets
  const isCustomValue = !presets.includes(value)

  // Format duration for display
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return // Don't interfere with input fields

      if (e.key === '1' && presets[0]) {
        onChange(presets[0])
      } else if (e.key === '2' && presets[1]) {
        onChange(presets[1])
      } else if (e.key === '3' && presets[2]) {
        onChange(presets[2])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [presets, onChange])

  return (
    <div className="space-y-2">
      {/* Label */}
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Clock className="w-4 h-4" />
        <span>Duration</span>
        {lastUsedDuration && lastUsedDuration === value && (
          <span className="text-xs text-gray-500 font-normal">
            (Last used for this client)
          </span>
        )}
      </div>

      {/* Preset buttons */}
      <div className="flex items-center gap-2">
        {presets.map((duration, index) => (
          <motion.button
            key={duration}
            type="button"
            onClick={() => onChange(duration)}
            className={`
              flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all
              ${value === duration
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {formatDuration(duration)}
            {index < 3 && (
              <span className="ml-1.5 text-xs opacity-60">
                ({index + 1})
              </span>
            )}
          </motion.button>
        ))}

        {/* Custom dropdown button */}
        <motion.button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className={`
            px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-1.5
            ${isCustomValue
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isCustomValue ? formatDuration(value) : 'Custom'}
          <ChevronDown className={`w-4 h-4 transition-transform ${showCustom ? 'rotate-180' : ''}`} />
        </motion.button>
      </div>

      {/* Custom duration dropdown */}
      {showCustom && (
        <motion.div
          className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 space-y-1"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
        >
          <div className="text-xs font-medium text-gray-500 px-2 py-1">
            Select duration
          </div>
          <div className="grid grid-cols-3 gap-1">
            {CUSTOM_DURATIONS.map(duration => (
              <button
                key={duration}
                type="button"
                onClick={() => {
                  onChange(duration)
                  setShowCustom(false)
                }}
                className={`
                  px-3 py-2 rounded text-sm font-medium transition-colors
                  ${value === duration
                    ? 'bg-blue-100 text-blue-700'
                    : 'hover:bg-gray-100 text-gray-700'
                  }
                `}
              >
                {formatDuration(duration)}
              </button>
            ))}
          </div>

          {/* Manual input */}
          <div className="pt-2 border-t border-gray-200">
            <div className="text-xs font-medium text-gray-500 px-2 py-1 mb-1">
              Or enter custom
            </div>
            <div className="flex items-center gap-2 px-2">
              <input
                type="number"
                min="15"
                max="480"
                step="15"
                value={value}
                onChange={(e) => {
                  const val = parseInt(e.target.value)
                  if (!isNaN(val) && val >= 15 && val <= 480) {
                    onChange(val)
                  }
                }}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Minutes"
              />
              <span className="text-sm text-gray-500">min</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Keyboard shortcuts hint */}
      <div className="text-xs text-gray-500">
        <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">1</kbd>
        <span className="mx-1">/</span>
        <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">2</kbd>
        <span className="mx-1">/</span>
        <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">3</kbd>
        <span className="ml-1">for quick select</span>
      </div>
    </div>
  )
}
