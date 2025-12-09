import { useMemo, useEffect, useState } from 'react'
import { ClientSuggestion, SmartDefaults } from '../components/EventCreation/types'

interface AppointmentHistory {
  id: string
  clientId: string
  startTime: Date
  endTime: Date
  status: string
}

interface UseSmartDefaultsProps {
  date: Date
  time?: string
  clientId?: string
}

export function useSmartDefaults({ date, time, clientId }: UseSmartDefaultsProps): SmartDefaults & { isLoading: boolean } {
  const [appointments, setAppointments] = useState<AppointmentHistory[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch appointments and clients on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [appointmentsRes, clientsRes] = await Promise.all([
          fetch('/api/appointments'),
          fetch('/api/clients')
        ])

        const appointmentsData = await appointmentsRes.json()
        const clientsData = await clientsRes.json()

        setAppointments(
          (appointmentsData.appointments || []).map((apt: any) => ({
            ...apt,
            startTime: new Date(apt.startTime),
            endTime: new Date(apt.endTime)
          }))
        )
        setClients(clientsData.clients || [])
      } catch (error) {
        console.error('Failed to fetch smart defaults data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const suggestions = useMemo(() => {
    if (isLoading || !clients.length) {
      return {
        suggestedClients: [],
        suggestedDuration: 60, // Default 60 minutes
        suggestedType: 'appointment' as const
      }
    }

    const dayOfWeek = date.getDay()
    const timeSlot = time || `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
    const now = new Date()

    // Helper: Calculate days since last session
    const getDaysSinceLastSession = (clientId: string): number | null => {
      const clientAppointments = appointments
        .filter(apt => apt.clientId === clientId && apt.status === 'COMPLETED')
        .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())

      if (clientAppointments.length === 0) return null

      const lastSession = clientAppointments[0]
      const daysDiff = Math.floor((now.getTime() - lastSession.startTime.getTime()) / (1000 * 60 * 60 * 24))
      return daysDiff
    }

    // Helper: Get typical frequency for a client (median days between sessions)
    const getTypicalFrequency = (clientId: string): number | null => {
      const clientAppointments = appointments
        .filter(apt => apt.clientId === clientId && apt.status === 'COMPLETED')
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

      if (clientAppointments.length < 2) return null

      const intervals: number[] = []
      for (let i = 1; i < clientAppointments.length; i++) {
        const days = Math.floor(
          (clientAppointments[i].startTime.getTime() - clientAppointments[i - 1].startTime.getTime()) /
          (1000 * 60 * 60 * 24)
        )
        intervals.push(days)
      }

      // Calculate median
      intervals.sort((a, b) => a - b)
      const mid = Math.floor(intervals.length / 2)
      return intervals.length % 2 === 0
        ? Math.round((intervals[mid - 1] + intervals[mid]) / 2)
        : intervals[mid]
    }

    // Helper: Check if client typically books at this day/time
    const bookersAtThisTime = (clientId: string): boolean => {
      const clientAppointments = appointments.filter(apt => apt.clientId === clientId)
      const matchingSlots = clientAppointments.filter(apt => {
        const aptDay = apt.startTime.getDay()
        const aptHour = apt.startTime.getHours()
        const slotHour = parseInt(timeSlot.split(':')[0])

        return aptDay === dayOfWeek && Math.abs(aptHour - slotHour) <= 1 // Within 1 hour
      })

      return matchingSlots.length >= 2 // Has booked this slot at least twice
    }

    const suggestedClients: ClientSuggestion[] = []
    const patternMatchers: ClientSuggestion[] = []
    const overdueClients: ClientSuggestion[] = []
    const recentClients: ClientSuggestion[] = []

    // Categorize clients
    clients.forEach(client => {
      const daysSince = getDaysSinceLastSession(client.id)
      const typicalFreq = getTypicalFrequency(client.id)
      const hasPattern = bookersAtThisTime(client.id)

      // Pattern matching
      if (hasPattern) {
        patternMatchers.push({
          ...client,
          suggestionReason: 'pattern',
          suggestionDetails: `Usually books ${date.toLocaleDateString('en-US', { weekday: 'short' })} around ${timeSlot}`,
          daysSinceLastSession: daysSince || undefined,
          lastSessionDate: daysSince !== null ? new Date(now.getTime() - daysSince * 24 * 60 * 60 * 1000) : undefined
        })
      }

      // Overdue detection
      if (daysSince !== null && typicalFreq !== null && daysSince > typicalFreq + 2) {
        overdueClients.push({
          ...client,
          suggestionReason: 'overdue',
          suggestionDetails: `Overdue by ${daysSince - typicalFreq} days`,
          daysSinceLastSession: daysSince,
          isOverdue: true,
          lastSessionDate: new Date(now.getTime() - daysSince * 24 * 60 * 60 * 1000)
        })
      }

      // Recent clients (added in last 30 days, no appointments yet)
      if (client.createdAt) {
        const createdDate = new Date(client.createdAt)
        const daysSinceCreated = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))

        if (daysSinceCreated <= 30 && daysSince === null) {
          recentClients.push({
            ...client,
            suggestionReason: 'recent',
            suggestionDetails: `New client (${daysSinceCreated}d ago)`,
          })
        }
      }
    })

    // Combine suggestions (pattern matchers first, then overdue, then recent)
    suggestedClients.push(...patternMatchers, ...overdueClients, ...recentClients)

    // Determine suggested duration
    let suggestedDuration = 60 // Default
    if (clientId) {
      // If specific client selected, use their typical duration
      const clientAppointments = appointments.filter(apt => apt.clientId === clientId)
      if (clientAppointments.length > 0) {
        const durations = clientAppointments.map(apt =>
          (apt.endTime.getTime() - apt.startTime.getTime()) / (1000 * 60)
        )
        // Use most common duration
        const durationCounts: Record<number, number> = {}
        durations.forEach(d => {
          durationCounts[d] = (durationCounts[d] || 0) + 1
        })
        const mostCommon = Object.entries(durationCounts)
          .sort(([, a], [, b]) => b - a)[0]
        if (mostCommon) {
          suggestedDuration = parseInt(mostCommon[0])
        }
      }
    } else {
      // General most common duration across all appointments
      const allDurations = appointments.map(apt =>
        (apt.endTime.getTime() - apt.startTime.getTime()) / (1000 * 60)
      )
      if (allDurations.length > 0) {
        const durationCounts: Record<number, number> = {}
        allDurations.forEach(d => {
          durationCounts[d] = (durationCounts[d] || 0) + 1
        })
        const mostCommon = Object.entries(durationCounts)
          .sort(([, a], [, b]) => b - a)[0]
        if (mostCommon) {
          suggestedDuration = parseInt(mostCommon[0])
        }
      }
    }

    return {
      suggestedClients,
      suggestedDuration,
      suggestedType: 'appointment' as const
    }
  }, [date, time, clientId, appointments, clients, isLoading])

  return {
    ...suggestions,
    isLoading
  }
}
