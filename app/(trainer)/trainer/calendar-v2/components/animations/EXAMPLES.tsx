/**
 * Example Usage for Animation Components and Custom Hooks
 *
 * This file demonstrates how to use the premium calendar animations
 * and hooks together for a delightful user experience.
 */

'use client'

import { useState } from 'react'
import { ConfettiEffect, CheckmarkAnimation, SkeletonCalendar, LoadingSpinner } from './index'
import {
  useCalendarView,
  useCalendarData,
  useOptimistic,
  useMediaQuery,
  useCalendarKeyboard,
} from '../../hooks'

// ============================================================================
// Example 1: Complete Event with Confetti and Checkmark
// ============================================================================

export function CompleteEventExample() {
  const [isCompleting, setIsCompleting] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showCheckmark, setShowCheckmark] = useState(false)

  const handleComplete = async () => {
    setIsCompleting(true)
    setShowCheckmark(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 400))

    // Show confetti after checkmark
    setShowCheckmark(false)
    setShowConfetti(true)

    // Clean up
    setTimeout(() => {
      setIsCompleting(false)
    }, 1200)
  }

  return (
    <div className="relative p-6 border border-gray-200 rounded-lg">
      <button
        onClick={handleComplete}
        disabled={isCompleting}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
      >
        {isCompleting ? 'Completing...' : 'Mark Complete'}
      </button>

      {showConfetti && (
        <ConfettiEffect
          intensity="subtle"
          onComplete={() => setShowConfetti(false)}
        />
      )}

      {showCheckmark && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-lg">
          <CheckmarkAnimation
            size={64}
            color="#10b981"
            onComplete={() => setShowCheckmark(false)}
          />
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Example 2: Calendar with Loading State
// ============================================================================

export function CalendarWithLoadingExample() {
  const { events, isLoading, isError } = useCalendarData()
  const { view } = useCalendarView('week')

  if (isLoading) {
    return <SkeletonCalendar view={view} rows={10} />
  }

  if (isError) {
    return <div className="text-red-500">Failed to load calendar</div>
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">
        {events.length} events loaded
      </div>
      {/* Your calendar grid would go here */}
    </div>
  )
}

// ============================================================================
// Example 3: Save Button with Spinner
// ============================================================================

export function SaveButtonExample() {
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsSaving(false)
  }

  return (
    <button
      onClick={handleSave}
      disabled={isSaving}
      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
    >
      {isSaving && <LoadingSpinner size={16} color="currentColor" />}
      {isSaving ? 'Saving...' : 'Save Changes'}
    </button>
  )
}

// ============================================================================
// Example 4: Full Calendar with All Hooks
// ============================================================================

export function FullCalendarExample() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  // View management
  const {
    view,
    setView,
    currentDate,
    goToToday,
    goToPrevious,
    goToNext,
  } = useCalendarView('week')

  // Data fetching
  const { events, isLoading, refetch } = useCalendarData()

  // Optimistic updates
  const { pendingEvents, addOptimistic, resolveOptimistic } = useOptimistic()

  // Responsive
  const { isMobile, isTablet, isDesktop } = useMediaQuery()

  // Keyboard shortcuts
  useCalendarKeyboard({
    onCreateAppointment: () => setShowCreateModal(true),
    onBlockTime: () => setShowBlockModal(true),
    onGoToToday: goToToday,
    onViewChange: setView,
    onNavigate: (dir) => dir === 'prev' ? goToPrevious() : goToNext(),
  })

  // Handle event creation with optimistic update
  const handleCreateEvent = async (eventData: any) => {
    const tempId = addOptimistic({
      id: 'temp',
      title: eventData.title,
      startTime: eventData.startTime,
      endTime: eventData.endTime,
      status: 'SCHEDULED',
      clientId: eventData.clientId,
      clientName: eventData.clientName,
      type: 'appointment',
    })

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      })

      if (!response.ok) throw new Error('Failed to create event')

      const { appointment } = await response.json()
      resolveOptimistic(tempId)
      refetch()
      setShowConfetti(true)
      setShowCreateModal(false)
    } catch (error) {
      resolveOptimistic(tempId)
      alert('Failed to create event')
    }
  }

  // Combine real and pending events
  const allEvents = [...events, ...pendingEvents]

  // Loading state
  if (isLoading) {
    return <SkeletonCalendar view={view} rows={12} />
  }

  return (
    <div className="relative space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevious}
            className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            ←
          </button>
          <button
            onClick={goToNext}
            className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            →
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Today
          </button>
        </div>

        <div className="text-lg font-semibold">
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>

        <div className="flex items-center gap-2">
          {['day', 'week', 'month', 'agenda'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v as any)}
              className={`px-3 py-2 rounded-lg capitalize ${
                view === v
                  ? 'bg-blue-500 text-white'
                  : 'border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Device Info */}
      <div className="text-sm text-gray-600">
        Device: {isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'} |
        Events: {allEvents.length} ({pendingEvents.length} pending)
      </div>

      {/* Calendar Grid Placeholder */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <p className="text-gray-600">Calendar Grid Component</p>
        <p className="text-sm text-gray-500 mt-2">
          Press C to create, B to block time, T for today
        </p>
        <p className="text-sm text-gray-500">
          Press M/W/D/A to switch views, ←/→ to navigate
        </p>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Create Appointment</h2>
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Close (Press ESC)
            </button>
          </div>
        </div>
      )}

      {showBlockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Block Time</h2>
            <button
              onClick={() => setShowBlockModal(false)}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Confetti */}
      {showConfetti && (
        <ConfettiEffect
          intensity="full"
          onComplete={() => setShowConfetti(false)}
        />
      )}
    </div>
  )
}

// ============================================================================
// Example 5: Responsive Calendar View Switcher
// ============================================================================

export function ResponsiveViewExample() {
  const { isMobile, isTablet, isDesktop } = useMediaQuery()
  const { view, setView } = useCalendarView('week')

  // Auto-switch to appropriate view based on device
  if (isMobile && view === 'month') {
    return (
      <div className="p-4 border border-amber-500 bg-amber-50 rounded-lg">
        <p className="text-amber-800">
          Month view is not optimal on mobile. Would you like to switch to day view?
        </p>
        <button
          onClick={() => setView('day')}
          className="mt-2 px-4 py-2 bg-amber-500 text-white rounded-lg"
        >
          Switch to Day View
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-gray-600">
        Device: {isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}
      </div>
      <div className="text-sm text-gray-600">
        Current View: {view}
      </div>
      <div className="text-sm text-gray-600">
        Recommended: {isMobile ? 'day or agenda' : isTablet ? 'week or day' : 'any view'}
      </div>
    </div>
  )
}
