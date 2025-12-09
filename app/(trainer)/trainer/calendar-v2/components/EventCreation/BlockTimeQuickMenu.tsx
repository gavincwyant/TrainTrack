"use client"

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QUICK_MENU_PRESETS, TIMING } from '../../types/calendar'

interface BlockTimeQuickMenuProps {
  timeRange: { start: Date; end: Date }
  position?: { x: number; y: number }
  onConfirm: (reason: string) => Promise<void>
  onCancel: () => void
}

export function BlockTimeQuickMenu({
  timeRange,
  position,
  onConfirm,
  onCancel,
}: BlockTimeQuickMenuProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [customReason, setCustomReason] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Format time for display
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  // Auto-dismiss after 5 seconds of inactivity
  useEffect(() => {
    const resetTimeout = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        onCancel()
      }, 5000)
    }

    resetTimeout()

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [onCancel])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to cancel
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
        return
      }

      // Enter to confirm
      if (e.key === 'Enter' && !isCustom) {
        e.preventDefault()
        if (selectedPreset) {
          handleConfirm()
        }
        return
      }

      // Number keys 1-4 for presets
      const num = parseInt(e.key)
      if (num >= 1 && num <= QUICK_MENU_PRESETS.length && !isCustom) {
        e.preventDefault()
        const preset = QUICK_MENU_PRESETS[num - 1]
        setSelectedPreset(preset.id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedPreset, isCustom, onCancel])

  // Focus custom input when opened
  useEffect(() => {
    if (isCustom && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isCustom])

  const handlePresetClick = (presetId: string) => {
    setSelectedPreset(presetId)
    setIsCustom(false)
    setCustomReason('')
  }

  const handleCustomClick = () => {
    setIsCustom(true)
    setSelectedPreset(null)
  }

  const handleConfirm = async () => {
    let reason = ''

    if (isCustom) {
      if (!customReason.trim()) return
      reason = customReason.trim()
    } else if (selectedPreset) {
      const preset = QUICK_MENU_PRESETS.find((p) => p.id === selectedPreset)
      reason = preset?.reason || 'Blocked Time'
    } else {
      return
    }

    setIsSubmitting(true)
    try {
      await onConfirm(reason)
    } catch (error) {
      console.error('Failed to block time:', error)
      setIsSubmitting(false)
    }
  }

  // Calculate position (centered or at specific coordinates)
  const getMenuStyle = (): React.CSSProperties => {
    if (position) {
      return {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)',
      }
    }
    return {
      position: 'fixed',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-20 z-50 flex items-center justify-center"
        onClick={onCancel}
      >
        <motion.div
          ref={menuRef}
          initial={{ scale: 0.9, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 10 }}
          transition={{ duration: TIMING.fast / 1000 }}
          style={getMenuStyle()}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden min-w-[320px]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-white">
            <div className="text-sm font-medium">Block Time?</div>
            <div className="text-xs opacity-90 mt-0.5">
              {formatTime(timeRange.start)} - {formatTime(timeRange.end)}
            </div>
          </div>

          {/* Presets or Custom Input */}
          <div className="p-4">
            {isCustom ? (
              <div className="space-y-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customReason.trim()) {
                      handleConfirm()
                    }
                  }}
                  placeholder="Enter reason..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsCustom(false)
                      setCustomReason('')
                    }}
                    className="flex-1 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={!customReason.trim() || isSubmitting}
                    className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Blocking...' : 'Confirm'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Preset Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_MENU_PRESETS.map((preset, index) => (
                    <motion.button
                      key={preset.id}
                      onClick={() => handlePresetClick(preset.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        selectedPreset === preset.id
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{preset.icon}</span>
                        <span>{preset.label}</span>
                      </div>
                      <div className="text-xs opacity-75 mt-1">
                        Press {index + 1}
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Custom Button */}
                <button
                  onClick={handleCustomClick}
                  className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                    <span>Custom Reason</span>
                  </div>
                </button>

                {/* Confirm Button */}
                <button
                  onClick={handleConfirm}
                  disabled={!selectedPreset || isSubmitting}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>Blocking...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Confirm Block (Enter)</span>
                    </div>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="bg-gray-50 px-4 py-2 text-xs text-gray-500 text-center border-t border-gray-100">
            Press <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">Esc</kbd> to cancel
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
