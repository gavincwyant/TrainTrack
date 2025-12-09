"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BlockTimeTemplate } from '../../types/calendar'
import { TIMING } from '../../types/calendar'

interface TemplateManagerProps {
  template?: BlockTimeTemplate
  onSave: (template: Omit<BlockTimeTemplate, 'id' | 'createdAt' | 'updatedAt'> | BlockTimeTemplate) => Promise<void>
  onCancel: () => void
  mode: 'create' | 'edit'
}

const DAY_LABELS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

const EMOJI_PRESETS = [
  '💼', '🏃', '📋', '🏖️', '🍽️', '☕', '🏠', '👥',
  '🏋️', '🧘', '🚗', '✈️', '🏥', '🎓', '📞', '💻',
]

export function TemplateManager({ template, onSave, onCancel, mode }: TemplateManagerProps) {
  const [name, setName] = useState(template?.name || '')
  const [icon, setIcon] = useState(template?.icon || '💼')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [days, setDays] = useState<number[]>(template?.days || [1, 2, 3, 4, 5])
  const [startTime, setStartTime] = useState(template?.startTime || '12:00')
  const [endTime, setEndTime] = useState(template?.endTime || '13:00')
  const [recurrence, setRecurrence] = useState<'one-time' | 'weekly' | 'custom'>(
    template?.recurrence || 'weekly'
  )
  const [reason, setReason] = useState(template?.reason || '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleDay = (day: number) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    )
  }

  const selectAllDays = () => {
    setDays([0, 1, 2, 3, 4, 5, 6])
  }

  const selectWeekdays = () => {
    setDays([1, 2, 3, 4, 5])
  }

  const selectWeekends = () => {
    setDays([0, 6])
  }

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setError('Template name is required')
      return false
    }

    if (days.length === 0) {
      setError('Select at least one day')
      return false
    }

    if (!startTime || !endTime) {
      setError('Start and end times are required')
      return false
    }

    // Validate time range
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin

    if (endMinutes <= startMinutes) {
      setError('End time must be after start time')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) return

    setIsSaving(true)

    try {
      const templateData = {
        ...(mode === 'edit' && template?.id ? { id: template.id } : {}),
        name: name.trim(),
        icon,
        days,
        startTime,
        endTime,
        recurrence,
        reason: reason.trim() || undefined,
      }

      await onSave(templateData as any)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: TIMING.normal / 1000 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {mode === 'create' ? 'Create Template' : 'Edit Template'}
              </h2>
              <button
                type="button"
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            {/* Template Name & Icon */}
            <div className="grid grid-cols-[auto,1fr] gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="w-16 h-16 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center text-3xl"
                  >
                    {icon}
                  </button>

                  {showEmojiPicker && (
                    <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-10 grid grid-cols-4 gap-2">
                      {EMOJI_PRESETS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setIcon(emoji)
                            setShowEmojiPicker(false)
                          }}
                          className="w-10 h-10 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center text-2xl"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name *
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Lunch Break"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Days of Week */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Days *</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectWeekdays}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Weekdays
                  </button>
                  <button
                    type="button"
                    onClick={selectWeekends}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Weekends
                  </button>
                  <button
                    type="button"
                    onClick={selectAllDays}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    All
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                {DAY_LABELS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleDay(value)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      days.includes(value)
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time *
                </label>
                <input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  step={900} // 15-minute intervals
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-2">
                  End Time *
                </label>
                <input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  step={900} // 15-minute intervals
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Recurrence */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recurrence</label>
              <div className="flex gap-2">
                {['one-time', 'weekly', 'custom'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setRecurrence(type as any)}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      recurrence === type
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                Description (optional)
              </label>
              <input
                id="reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Daily lunch break"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 min-w-[100px]"
            >
              {isSaving ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
