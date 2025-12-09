'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Loader2 } from 'lucide-react'
import { TimeSlot } from '../../types/calendar'
import { Client, AppointmentCreateData } from './types'
import { TIMING } from '../../types/calendar'

interface QuickCreateInlineFormProps {
  slot: TimeSlot
  onSubmit: (data: AppointmentCreateData) => Promise<void>
  onCancel: () => void
  clients: Client[]
}

export function QuickCreateInlineForm({
  slot,
  onSubmit,
  onCancel,
  clients
}: QuickCreateInlineFormProps) {
  const [selectedClientId, setSelectedClientId] = useState('')
  const [duration, setDuration] = useState(60)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(clients.length === 0)
  const [clientList, setClientList] = useState<Client[]>(clients)
  const clientSelectRef = useRef<HTMLSelectElement>(null)

  // Fetch clients if not provided
  useEffect(() => {
    if (clients.length === 0) {
      const fetchClients = async () => {
        try {
          const response = await fetch('/api/clients')
          const data = await response.json()
          setClientList(data.clients || [])
        } catch (err) {
          console.error('Failed to fetch clients:', err)
          setError('Failed to load clients')
        } finally {
          setIsLoading(false)
        }
      }
      fetchClients()
    } else {
      setClientList(clients)
      setIsLoading(false)
    }
  }, [clients])

  // Auto-focus client select
  useEffect(() => {
    if (clientSelectRef.current && !isLoading) {
      clientSelectRef.current.focus()
    }
  }, [isLoading])

  // Handle escape to cancel
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onCancel])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedClientId) {
      setError('Please select a client')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const endTime = new Date(slot.start.getTime() + duration * 60 * 1000)

      await onSubmit({
        clientId: selectedClientId,
        startTime: slot.start,
        endTime
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create appointment')
      setIsSubmitting(false)
    }
  }

  // Format time for display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  if (isLoading) {
    return (
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center z-20"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ boxShadow: 'var(--shadow-lg)' }}
      >
        <Loader2 className="w-6 h-6 text-white animate-spin" />
      </motion.div>
    )
  }

  return (
    <motion.div
      className="absolute inset-0 z-20"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: TIMING.fast / 1000, ease: [0.175, 0.885, 0.32, 1.275] }}
    >
      <div
        className="h-full bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 flex flex-col"
        style={{ boxShadow: 'var(--shadow-lg), var(--shadow-glow-blue)' }}
      >
        {/* Time display */}
        <div className="text-white text-xs font-semibold mb-2 flex items-center justify-between">
          <span>{formatTime(slot.start)}</span>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            type="button"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-2">
          {/* Client selector */}
          <select
            ref={clientSelectRef}
            value={selectedClientId}
            onChange={(e) => {
              setSelectedClientId(e.target.value)
              setError(null)
            }}
            className="w-full px-2 py-1.5 text-sm bg-white/95 backdrop-blur-sm border-2 border-transparent rounded focus:outline-none focus:border-white transition-colors"
            disabled={isSubmitting}
          >
            <option value="">Select client...</option>
            {clientList.map(client => (
              <option key={client.id} value={client.id}>
                {client.fullName}
              </option>
            ))}
          </select>

          {/* Duration quick buttons */}
          <div className="flex gap-1.5">
            {[30, 60, 90].map(mins => (
              <button
                key={mins}
                type="button"
                onClick={() => setDuration(mins)}
                className={`
                  flex-1 px-2 py-1 text-xs font-semibold rounded transition-all
                  ${duration === mins
                    ? 'bg-white text-blue-600 shadow-md'
                    : 'bg-white/20 text-white hover:bg-white/30'
                  }
                `}
                disabled={isSubmitting}
              >
                {mins}min
              </button>
            ))}
          </div>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="text-xs text-red-100 bg-red-500/30 px-2 py-1 rounded"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action buttons */}
          <div className="flex gap-1.5 mt-auto">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-3 py-1.5 text-xs font-semibold bg-white/20 text-white rounded hover:bg-white/30 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedClientId}
              className="flex-1 px-3 py-1.5 text-xs font-semibold bg-white text-blue-600 rounded hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-3 h-3" />
                  Create
                </>
              )}
            </button>
          </div>

          {/* Keyboard hints */}
          <div className="text-[10px] text-white/70 text-center">
            <kbd className="px-1 py-0.5 bg-white/20 rounded">Tab</kbd> to navigate •{' '}
            <kbd className="px-1 py-0.5 bg-white/20 rounded">Enter</kbd> to create •{' '}
            <kbd className="px-1 py-0.5 bg-white/20 rounded">Esc</kbd> to cancel
          </div>
        </form>
      </div>
    </motion.div>
  )
}
