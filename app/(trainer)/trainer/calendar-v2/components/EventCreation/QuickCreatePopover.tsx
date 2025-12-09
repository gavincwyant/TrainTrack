'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Calendar } from 'lucide-react'
import { SmartClientSelector } from './SmartClientSelector'
import { DurationPicker } from './DurationPicker'
import { useSmartDefaults } from '../../hooks/useSmartDefaults'
import { Client, TimeSlotSelection, Position, AppointmentCreateData } from './types'
import { TIMING } from '../../types/calendar'

interface QuickCreatePopoverProps {
  isOpen: boolean
  position: Position
  slot: TimeSlotSelection
  onClose: () => void
  onSubmit: (data: AppointmentCreateData) => Promise<void>
}

export function QuickCreatePopover({
  isOpen,
  position,
  slot,
  onClose,
  onSubmit
}: QuickCreatePopoverProps) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [duration, setDuration] = useState(60)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'client' | 'duration'>('client')
  const popoverRef = useRef<HTMLDivElement>(null)

  // Calculate default duration from slot
  useEffect(() => {
    if (slot) {
      const slotDuration = Math.round((slot.end.getTime() - slot.start.getTime()) / (1000 * 60))
      setDuration(slotDuration)
    }
  }, [slot])

  // Smart defaults
  const { suggestedClients, suggestedDuration, isLoading: loadingDefaults } = useSmartDefaults({
    date: slot.start,
    time: `${slot.start.getHours()}:${slot.start.getMinutes().toString().padStart(2, '0')}`,
    clientId: selectedClient?.id
  })

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleEscape)
    }

    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 100)
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  // Handle client selection
  const handleClientSelect = (client: Client) => {
    setSelectedClient(client)
    setStep('duration')
    setError(null)
  }

  // Handle form submission
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()

    if (!selectedClient) {
      setError('Please select a client')
      setStep('client')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const endTime = new Date(slot.start.getTime() + duration * 60 * 1000)

      await onSubmit({
        clientId: selectedClient.id,
        startTime: slot.start,
        endTime
      })

      // Success - close popover
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create appointment')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Enter key
  useEffect(() => {
    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        if (step === 'duration' && selectedClient) {
          e.preventDefault()
          handleSubmit()
        }
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleEnter)
    }

    return () => window.removeEventListener('keydown', handleEnter)
  }, [isOpen, step, selectedClient])

  // Format date/time
  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  if (!isOpen) return null

  const content = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <motion.div
            ref={popoverRef}
            className="absolute bg-white rounded-xl shadow-2xl border border-gray-200 pointer-events-auto"
            style={{
              left: Math.min(position.x, window.innerWidth - 420),
              top: Math.min(position.y, window.innerHeight - 600),
              width: '400px',
              maxHeight: '580px'
            }}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: TIMING.fast / 1000, ease: [0.175, 0.885, 0.32, 1.275] }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Quick Schedule</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                type="button"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Time display */}
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
              <div className="text-sm text-blue-900 font-medium">
                {formatDateTime(slot.start)}
              </div>
              <div className="text-xs text-blue-700 mt-0.5">
                Duration: {duration} minutes
              </div>
            </div>

            {/* Error message */}
            {error && (
              <motion.div
                className="mx-4 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.div>
            )}

            {/* Form content */}
            <div className="p-4">
              {/* Step 1: Client Selection */}
              {step === 'client' && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <SmartClientSelector
                    onSelect={handleClientSelect}
                    currentDate={slot.start}
                    currentTime={`${slot.start.getHours()}:${slot.start.getMinutes().toString().padStart(2, '0')}`}
                    autoFocus={true}
                    suggestedClients={suggestedClients}
                  />
                </motion.div>
              )}

              {/* Step 2: Duration Selection */}
              {step === 'duration' && selectedClient && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  {/* Selected client */}
                  <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                        {selectedClient.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{selectedClient.fullName}</div>
                        <div className="text-xs text-gray-500">{selectedClient.email}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedClient(null)
                        setStep('client')
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      type="button"
                    >
                      Change
                    </button>
                  </div>

                  {/* Duration picker */}
                  <DurationPicker
                    value={duration}
                    onChange={setDuration}
                    clientId={selectedClient.id}
                  />

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={onClose}
                      className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                      type="button"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Appointment'
                      )}
                    </button>
                  </div>

                  {/* Keyboard hint */}
                  <div className="text-xs text-gray-500 text-center">
                    Press <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Enter</kbd> to create
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )

  return typeof window !== 'undefined' ? createPortal(content, document.body) : null
}
