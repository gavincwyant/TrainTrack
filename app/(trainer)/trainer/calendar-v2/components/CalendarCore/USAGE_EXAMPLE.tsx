/**
 * USAGE EXAMPLE: Premium Calendar Components
 *
 * This file demonstrates how to use the CalendarCore components
 * to build a complete calendar interface.
 */

'use client'

import { useState } from 'react'
import {
  CalendarHeader,
  CalendarGrid,
  CalendarTimeline,
} from './index'
import {
  CalendarView,
  CalendarEvent,
  CalendarSettings,
  FilterState,
} from '../../types/calendar'

// Example component showing full integration
export default function CalendarExample() {
  // State management
  const [view, setView] = useState<CalendarView>('month')
  const [currentDate, setCurrentDate] = useState(new Date())

  // Calendar settings
  const settings: CalendarSettings = {
    dayStartTime: '06:00',
    dayEndTime: '22:00',
    timezone: 'America/Los_Angeles',
    workingDays: [1, 2, 3, 4, 5], // Monday to Friday
  }

  // Filters
  const [filters, setFilters] = useState<FilterState>({
    scheduled: true,
    completed: true,
    cancelled: false,
    rescheduled: true,
    blocked: true,
  })

  // Sample events
  const [events, setEvents] = useState<CalendarEvent[]>([
    {
      id: '1',
      title: 'Personal Training Session',
      startTime: new Date(2025, 11, 10, 9, 0),
      endTime: new Date(2025, 11, 10, 10, 0),
      status: 'SCHEDULED',
      clientId: 'client-1',
      clientName: 'John Smith',
      clientAvatar: 'https://ui-avatars.com/api/?name=John+Smith',
      clientEmail: 'john@example.com',
      type: 'appointment',
    },
    {
      id: '2',
      title: 'Yoga Class',
      startTime: new Date(2025, 11, 10, 14, 30),
      endTime: new Date(2025, 11, 10, 15, 30),
      status: 'COMPLETED',
      clientId: 'client-2',
      clientName: 'Jane Doe',
      clientAvatar: 'https://ui-avatars.com/api/?name=Jane+Doe',
      clientEmail: 'jane@example.com',
      type: 'appointment',
    },
    {
      id: '3',
      title: 'Lunch Break',
      startTime: new Date(2025, 11, 10, 12, 0),
      endTime: new Date(2025, 11, 10, 13, 0),
      status: 'SCHEDULED',
      clientId: 'blocked-1',
      clientName: 'Blocked Time',
      type: 'blocked',
      reason: 'Personal time',
    },
  ])

  // Stats calculation
  const stats = {
    total: events.filter(e => e.type === 'appointment').length,
    completed: events.filter(e => e.status === 'COMPLETED').length,
    upcoming: events.filter(
      e => e.status === 'SCHEDULED' && e.startTime > new Date()
    ).length,
  }

  // Event handlers
  const handleViewChange = (newView: CalendarView) => {
    setView(newView)
  }

  const handleDateChange = (newDate: Date) => {
    setCurrentDate(newDate)
  }

  const handleSync = async () => {
    // Simulate API call
    console.log('Syncing calendar...')
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log('Calendar synced!')
  }

  const handleSlotClick = (date: Date, time?: string) => {
    console.log('Create appointment at:', date, time)
    // Open appointment creation dialog
  }

  const handleEventClick = (event: CalendarEvent) => {
    console.log('View event:', event)
    // Open event detail view
  }

  const handleQuickAction = (
    action: 'complete' | 'cancel' | 'edit',
    event: CalendarEvent
  ) => {
    console.log(`Quick action: ${action} for event:`, event.id)

    switch (action) {
      case 'complete':
        // Mark event as completed
        setEvents(prev =>
          prev.map(e =>
            e.id === event.id ? { ...e, status: 'COMPLETED' as const } : e
          )
        )
        break
      case 'cancel':
        // Cancel event
        setEvents(prev =>
          prev.map(e =>
            e.id === event.id ? { ...e, status: 'CANCELLED' as const } : e
          )
        )
        break
      case 'edit':
        // Open edit dialog
        console.log('Open edit dialog for:', event.id)
        break
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <div className="flex-1 flex flex-col max-w-[1800px] mx-auto w-full p-6 gap-6">
        {/* Header */}
        <CalendarHeader
          view={view}
          onViewChange={handleViewChange}
          currentDate={currentDate}
          onDateChange={handleDateChange}
          onSync={handleSync}
          stats={stats}
        />

        {/* Main Calendar */}
        <div className="flex-1 min-h-0">
          {(view === 'month' || view === 'week') && (
            <CalendarGrid
              view={view}
              currentDate={currentDate}
              events={events}
              onSlotClick={handleSlotClick}
              onEventClick={handleEventClick}
              settings={settings}
              filters={filters}
            />
          )}

          {(view === 'day' || view === 'agenda') && (
            <CalendarTimeline
              view={view}
              currentDate={currentDate}
              events={events}
              onSlotClick={handleSlotClick}
              onEventClick={handleEventClick}
              onQuickAction={handleQuickAction}
              settings={settings}
            />
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * INTEGRATION TIPS:
 *
 * 1. State Management:
 *    - Use useState for simple cases
 *    - Use Zustand/Redux for complex state
 *    - Consider React Query for server state
 *
 * 2. Event Handling:
 *    - Connect handlers to your API
 *    - Use optimistic updates for better UX
 *    - Show loading states during mutations
 *
 * 3. Performance:
 *    - Memoize expensive calculations
 *    - Use React.memo for child components
 *    - Implement virtual scrolling for large datasets
 *
 * 4. Accessibility:
 *    - Ensure keyboard navigation works
 *    - Add proper ARIA labels
 *    - Test with screen readers
 *
 * 5. Mobile:
 *    - Test touch interactions
 *    - Consider different layout for small screens
 *    - Optimize for mobile performance
 *
 * 6. Animations:
 *    - Framer Motion handles most animations
 *    - Use CSS animations for simple cases
 *    - Respect user's motion preferences
 *
 * 7. Dark Mode:
 *    - All components support dark mode
 *    - Uses CSS variables from globals.css
 *    - Automatically adapts to system preference
 */
