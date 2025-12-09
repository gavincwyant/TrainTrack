/**
 * COMPLETION FLOW INTEGRATION EXAMPLE
 *
 * This file demonstrates how to integrate the new completion flow components
 * into your calendar page to replace confirm dialogs with delightful animations.
 */

'use client'

import { useState, useCallback } from 'react'
import { format } from 'date-fns'
import { UpcomingAppointmentCard } from './UpcomingAppointmentCard'
import { AllDoneCelebration } from './AllDoneCelebration'
import { ProgressIndicator } from './ProgressIndicator'
import { useCompletionFlow } from '../../hooks/useCompletionFlow'

// Example appointment type
type Appointment = {
  id: string
  startTime: string
  endTime: string
  status: string
  client: {
    id: string
    fullName: string
    email: string
  }
}

export function CalendarPageExample() {
  const [appointments, setAppointments] = useState<Appointment[]>([])

  // Fetch data function to refresh appointments
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/appointments')
      const data = await response.json()
      setAppointments(data.appointments)
    } catch (error) {
      console.error('Failed to fetch appointments:', error)
    }
  }, [])

  // Use the completion flow hook
  const {
    completeAppointment,
    completingId,
    showCelebration,
    setShowCelebration,
    celebrationCount,
  } = useCompletionFlow(fetchData)

  // Handle cancel action
  const handleCancel = async (id: string) => {
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })

      if (response.ok) {
        await fetchData()
      }
    } catch (error) {
      console.error('Failed to cancel appointment:', error)
    }
  }

  // Calculate progress for today's appointments
  const getTodayAppointments = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return appointments.filter((apt) => {
      const aptDate = new Date(apt.startTime)
      return aptDate >= today && aptDate < tomorrow
    })
  }

  const todayAppointments = getTodayAppointments()
  const completedToday = todayAppointments.filter(
    (apt) => apt.status === 'COMPLETED'
  ).length
  const totalToday = todayAppointments.length

  // Get upcoming scheduled appointments
  const upcomingAppointments = appointments.filter(
    (apt) => new Date(apt.startTime) > new Date() && apt.status === 'SCHEDULED'
  )

  return (
    <div className="space-y-8">
      {/* Header with Progress Indicator */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Calendar</h1>
          <p className="mt-3 text-lg text-gray-600">
            View and manage your appointments
          </p>
        </div>

        {/* Progress Indicator */}
        <ProgressIndicator
          completed={completedToday}
          total={totalToday}
          onClick={() => {
            // Optional: Scroll to appointments list or show details
            console.log('Progress clicked')
          }}
        />
      </div>

      {/* Upcoming Appointments with Swipe Actions */}
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Upcoming Appointments
        </h2>

        {upcomingAppointments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No upcoming appointments
          </p>
        ) : (
          <div className="space-y-4">
            {upcomingAppointments.slice(0, 5).map((apt) => (
              <UpcomingAppointmentCard
                key={apt.id}
                appointment={apt}
                onComplete={completeAppointment}
                onCancel={handleCancel}
                onClick={(id) => {
                  // Open appointment detail modal
                  console.log('Clicked appointment:', id)
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* All Done Celebration Modal */}
      <AllDoneCelebration
        isOpen={showCelebration}
        count={celebrationCount}
        onClose={() => setShowCelebration(false)}
        onViewTomorrow={() => {
          // Navigate to tomorrow's schedule
          console.log('View tomorrow clicked')
          setShowCelebration(false)
        }}
      />
    </div>
  )
}

/**
 * INTEGRATION STEPS:
 *
 * 1. Import the necessary components:
 *    - UpcomingAppointmentCard (replaces old appointment list items)
 *    - AllDoneCelebration (celebration modal)
 *    - ProgressIndicator (circular progress ring)
 *    - useCompletionFlow (orchestrates the completion flow)
 *
 * 2. Replace the old completion logic:
 *    OLD:
 *    ```
 *    const handleComplete = (id) => {
 *      if (confirm('Mark as complete?')) {
 *        // API call
 *      }
 *    }
 *    ```
 *
 *    NEW:
 *    ```
 *    const { completeAppointment } = useCompletionFlow(fetchData)
 *    // Just call completeAppointment(id) - no confirm dialog!
 *    ```
 *
 * 3. Replace old appointment list items with UpcomingAppointmentCard:
 *    - Automatic swipe-to-complete on mobile
 *    - Smooth animations
 *    - No confirm dialogs
 *
 * 4. Add ProgressIndicator to header:
 *    - Shows today's progress
 *    - Animates on milestone
 *    - Click to view details
 *
 * 5. Add AllDoneCelebration modal:
 *    - Automatically shows when all appointments complete
 *    - Large confetti animation
 *    - Suggest tomorrow's schedule
 *
 * FEATURES INCLUDED:
 * - No confirm dialogs (immediate feedback)
 * - Swipe-to-complete gesture
 * - Multi-stage completion animation
 * - Progress tracking with milestones
 * - Celebration when all done
 * - Haptic feedback on mobile
 * - Respects prefers-reduced-motion
 * - GPU-accelerated animations
 * - Toast notifications for feedback
 */
