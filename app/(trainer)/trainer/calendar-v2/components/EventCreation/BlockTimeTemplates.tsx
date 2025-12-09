"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BlockTimeTemplate } from '../../types/calendar'
import { TIMING } from '../../types/calendar'

interface BlockTimeTemplatesProps {
  templates: BlockTimeTemplate[]
  onApply: (templateId: string, weeks: number) => Promise<void>
  onEdit: (template: BlockTimeTemplate) => void
  onDelete: (templateId: string) => Promise<void>
  onCreate: () => void
  isLoading?: boolean
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function BlockTimeTemplates({
  templates,
  onApply,
  onEdit,
  onDelete,
  onCreate,
  isLoading = false,
}: BlockTimeTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [applyWeeks, setApplyWeeks] = useState(4)
  const [isApplying, setIsApplying] = useState(false)

  const formatDays = (days: number[]): string => {
    if (days.length === 7) return 'Every day'
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Mon-Fri'
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends'

    return days
      .sort((a, b) => a - b)
      .map((d) => DAY_NAMES[d])
      .join(', ')
  }

  const formatRecurrence = (recurrence: string): string => {
    switch (recurrence) {
      case 'weekly':
        return 'Weekly'
      case 'one-time':
        return 'One-time'
      case 'custom':
        return 'Custom'
      default:
        return ''
    }
  }

  const handleApplyClick = (templateId: string) => {
    setSelectedTemplate(templateId)
    setShowConfirm(true)
  }

  const handleConfirmApply = async () => {
    if (!selectedTemplate) return

    setIsApplying(true)
    try {
      await onApply(selectedTemplate, applyWeeks)
      setShowConfirm(false)
      setSelectedTemplate(null)
    } catch (error) {
      console.error('Failed to apply template:', error)
    } finally {
      setIsApplying(false)
    }
  }

  const handleCancelApply = () => {
    setShowConfirm(false)
    setSelectedTemplate(null)
    setApplyWeeks(4)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Quick Templates</h3>
        <button
          onClick={onCreate}
          disabled={isLoading}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
        >
          + Create Template
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {templates.map((template) => (
            <motion.div
              key={template.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: TIMING.normal / 1000 }}
              className="relative group"
            >
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                {/* Icon and Name */}
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl">{template.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {template.name}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatRecurrence(template.recurrence)}
                    </p>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span>{formatDays(template.days)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>
                      {template.startTime} - {template.endTime}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApplyClick(template.id)}
                    disabled={isLoading}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply
                  </button>

                  {/* Edit/Delete - Hidden until hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <button
                      onClick={() => onEdit(template)}
                      disabled={isLoading}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                      title="Edit template"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>

                    <button
                      onClick={() => onDelete(template.id)}
                      disabled={isLoading}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                      title="Delete template"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Create New Template Card */}
          <motion.button
            layout
            onClick={onCreate}
            disabled={isLoading}
            className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300 p-6 hover:border-blue-400 hover:from-blue-50 hover:to-blue-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex flex-col items-center justify-center gap-3 text-gray-500 hover:text-blue-600">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="text-sm font-medium">Create New Template</span>
            </div>
          </motion.button>
        </AnimatePresence>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={handleCancelApply}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Apply Template
              </h3>

              <p className="text-sm text-gray-600 mb-4">
                This will create blocked time entries for the next several weeks based on
                this template.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Apply for how many weeks?
                </label>
                <input
                  type="number"
                  min="1"
                  max="52"
                  value={applyWeeks}
                  onChange={(e) => setApplyWeeks(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleCancelApply}
                  disabled={isApplying}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmApply}
                  disabled={isApplying}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isApplying ? 'Applying...' : 'Apply Template'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
