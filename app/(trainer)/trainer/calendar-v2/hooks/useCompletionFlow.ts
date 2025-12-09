'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'

interface UseCompletionFlowReturn {
  completeAppointment: (appointmentId: string) => Promise<void>
  completingId: string | null
  showCelebration: boolean
  setShowCelebration: (show: boolean) => void
  celebrationCount: number
}

export function useCompletionFlow(
  onDataRefresh?: () => Promise<void>
): UseCompletionFlowReturn {
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationCount, setCelebrationCount] = useState(0)

  const checkRemainingAppointments = useCallback(async (): Promise<number> => {
    try {
      const response = await fetch('/api/appointments')
      if (!response.ok) return -1

      const data = await response.json()
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // Count scheduled appointments for today
      const todayScheduled = data.appointments.filter((apt: { status: string; startTime: string }) => {
        const aptDate = new Date(apt.startTime)
        return (
          apt.status === 'SCHEDULED' &&
          aptDate >= today &&
          aptDate < tomorrow
        )
      })

      return todayScheduled.length
    } catch (error) {
      console.error('Failed to check remaining appointments:', error)
      return -1
    }
  }, [])

  const completeAppointment = useCallback(
    async (appointmentId: string) => {
      setCompletingId(appointmentId)

      try {
        // 1. Show animation immediately (handled by component)
        // Animation plays for 1500ms

        // 2. API call in background
        const response = await fetch(`/api/appointments/${appointmentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'COMPLETED' }),
        })

        if (!response.ok) {
          throw new Error('Failed to complete appointment')
        }

        // 3. Check if all done
        const remaining = await checkRemainingAppointments()

        if (remaining === 0) {
          // Get the count of completed appointments today for the celebration
          const completedResponse = await fetch('/api/appointments')
          if (completedResponse.ok) {
            const data = await completedResponse.json()
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const tomorrow = new Date(today)
            tomorrow.setDate(tomorrow.getDate() + 1)

            const completedToday = data.appointments.filter((apt: { status: string; startTime: string }) => {
              const aptDate = new Date(apt.startTime)
              return (
                apt.status === 'COMPLETED' &&
                aptDate >= today &&
                aptDate < tomorrow
              )
            })

            setCelebrationCount(completedToday.length)
          }

          // Small delay to let the completion animation finish
          setTimeout(() => {
            setShowCelebration(true)
          }, 1500)
        }

        // 4. Success feedback
        if (remaining === -1) {
          toast.success('Appointment completed!')
        } else if (remaining === 0) {
          // Don't show toast here, the celebration modal will handle it
        } else {
          // Show milestone messages
          const response = await fetch('/api/appointments')
          const data = await response.json()
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const tomorrow = new Date(today)
          tomorrow.setDate(tomorrow.getDate() + 1)

          const totalToday = data.appointments.filter((apt: { startTime: string }) => {
            const aptDate = new Date(apt.startTime)
            return aptDate >= today && aptDate < tomorrow
          }).length

          const completedCount = totalToday - remaining
          const progressPercent = (completedCount / totalToday) * 100

          if (progressPercent === 75) {
            toast.success(`${completedCount} of ${totalToday} completed - Almost there!`)
          } else if (progressPercent === 50) {
            toast.success(`${completedCount} of ${totalToday} completed - Keep going!`)
          } else {
            toast.success('Appointment completed!')
          }
        }

        // 5. Refresh data
        if (onDataRefresh) {
          await onDataRefresh()
        }
      } catch (err) {
        // 6. Rollback animation (handled by optimistic UI)
        console.error('Failed to complete appointment:', err)
        toast.error('Failed to complete appointment. Please try again.')
      } finally {
        setCompletingId(null)
      }
    },
    [checkRemainingAppointments, onDataRefresh]
  )

  return {
    completeAppointment,
    completingId,
    showCelebration,
    setShowCelebration,
    celebrationCount,
  }
}
