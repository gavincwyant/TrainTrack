# Calendar Custom Hooks

Powerful hooks for managing calendar state, data, and interactions.

## Hooks

### useCalendarView

Manage calendar view state and navigation.

```tsx
import { useCalendarView } from '../hooks'

function Calendar() {
  const {
    view,
    setView,
    currentDate,
    goToToday,
    goToPrevious,
    goToNext,
    goToDate,
  } = useCalendarView('week') // Initial view

  return (
    <div>
      <div className="controls">
        <button onClick={goToPrevious}>←</button>
        <button onClick={goToToday}>Today</button>
        <button onClick={goToNext}>→</button>
      </div>

      <div className="view-switcher">
        <button onClick={() => setView('day')}>Day</button>
        <button onClick={() => setView('week')}>Week</button>
        <button onClick={() => setView('month')}>Month</button>
        <button onClick={() => setView('agenda')}>Agenda</button>
      </div>

      <CalendarGrid view={view} currentDate={currentDate} />
    </div>
  )
}
```

**Navigation Logic:**
- Day: ±1 day
- Week: ±7 days
- Month: ±1 month
- Agenda: ±7 days (same as week)

---

### useCalendarData

Data fetching with SWR for real-time updates.

```tsx
import { useCalendarData } from '../hooks'

function Calendar() {
  const { events, isLoading, isError, refetch } = useCalendarData()

  if (isLoading) return <SkeletonCalendar view="week" />
  if (isError) return <div>Error loading calendar</div>

  return (
    <div>
      <button onClick={refetch}>Refresh</button>
      <CalendarGrid events={events} />
    </div>
  )
}
```

**Features:**
- Auto-refresh every 60 seconds
- Revalidates on focus
- Revalidates on reconnection
- Combines appointments and blocked times
- Transforms API data to CalendarEvent format

**Data Structure:**
```typescript
{
  events: CalendarEvent[]     // Combined appointments + blocked times
  isLoading: boolean          // True while fetching initial data
  isError: boolean            // True if fetch failed
  refetch: () => void         // Manual refetch function
}
```

---

### useOptimistic

Optimistic UI updates for instant feedback.

```tsx
import { useOptimistic } from '../hooks'
import { useCalendarData } from '../hooks'

function CreateEventForm() {
  const { refetch } = useCalendarData()
  const { pendingEvents, addOptimistic, resolveOptimistic } = useOptimistic()

  const handleCreate = async (eventData) => {
    // Add optimistic event immediately
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
      // Create event on server
      const response = await fetch('/api/appointments', {
        method: 'POST',
        body: JSON.stringify(eventData),
      })
      const { appointment } = await response.json()

      // Resolve optimistic update with real data
      resolveOptimistic(tempId, appointment)
      refetch() // Refresh calendar data
    } catch (error) {
      // Remove optimistic event on error
      resolveOptimistic(tempId)
      alert('Failed to create event')
    }
  }

  return <EventForm onSubmit={handleCreate} />
}

// In your calendar component
function CalendarGrid() {
  const { events } = useCalendarData()
  const { pendingEvents } = useOptimistic()

  // Combine real and pending events
  const allEvents = [...events, ...pendingEvents]

  return (
    <div>
      {allEvents.map(event => (
        <EventCard
          key={event.id}
          event={event}
          isPending={event._pending}
          style={{ opacity: event._pending ? 0.6 : 1 }}
        />
      ))}
    </div>
  )
}
```

**Benefits:**
- Instant UI feedback
- Automatic rollback on error
- Unique temp IDs for tracking
- Clean API with add/resolve pattern

---

### useMediaQuery

Responsive breakpoint detection.

```tsx
import { useMediaQuery } from '../hooks'

function Calendar() {
  const { isMobile, isTablet, isDesktop } = useMediaQuery()

  if (isMobile) {
    return <MobileCalendar />
  }

  if (isTablet) {
    return <TabletCalendar />
  }

  return <DesktopCalendar />
}
```

**Breakpoints:**
- Mobile: ≤768px
- Tablet: 769px - 1024px
- Desktop: >1024px

**Features:**
- SSR-safe (checks for window)
- Uses native matchMedia API
- Auto-updates on resize
- Proper cleanup

---

### useCalendarKeyboard

Keyboard shortcuts for power users.

```tsx
import { useCalendarKeyboard } from '../hooks'
import { useCalendarView } from '../hooks'

function Calendar() {
  const { setView, goToToday, goToPrevious, goToNext } = useCalendarView()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)

  useCalendarKeyboard({
    onCreateAppointment: () => setShowCreateModal(true),
    onBlockTime: () => setShowBlockModal(true),
    onGoToToday: goToToday,
    onViewChange: setView,
    onNavigate: (dir) => dir === 'prev' ? goToPrevious() : goToNext(),
  })

  return (
    <div>
      <CalendarGrid />
      {showCreateModal && <CreateModal />}
      {showBlockModal && <BlockTimeModal />}
    </div>
  )
}
```

**Keyboard Shortcuts:**
- `C` - Create appointment
- `B` - Block time
- `T` - Go to today
- `M` - Month view
- `W` - Week view
- `D` - Day view
- `A` - Agenda view
- `←` - Previous period
- `→` - Next period

**Features:**
- Ignores shortcuts when typing in inputs
- Prevents default browser behavior
- All handlers are optional
- Proper cleanup on unmount

---

## Complete Example

Combining all hooks for a full calendar:

```tsx
'use client'

import { useState } from 'react'
import {
  useCalendarView,
  useCalendarData,
  useOptimistic,
  useMediaQuery,
  useCalendarKeyboard,
} from '../hooks'
import {
  SkeletonCalendar,
  ConfettiEffect,
} from '../components/animations'

export function PremiumCalendar() {
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
  const { isMobile } = useMediaQuery()

  // Keyboard shortcuts
  useCalendarKeyboard({
    onCreateAppointment: () => setShowCreateModal(true),
    onBlockTime: () => setShowBlockModal(true),
    onGoToToday: goToToday,
    onViewChange: setView,
    onNavigate: (dir) => dir === 'prev' ? goToPrevious() : goToNext(),
  })

  // Combine real and pending events
  const allEvents = [...events, ...pendingEvents]

  // Handle event creation
  const handleCreate = async (eventData) => {
    const tempId = addOptimistic({
      id: 'temp',
      ...eventData,
      status: 'SCHEDULED',
      type: 'appointment',
    })

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        body: JSON.stringify(eventData),
      })
      const { appointment } = await response.json()

      resolveOptimistic(tempId)
      refetch()
      setShowConfetti(true)
    } catch (error) {
      resolveOptimistic(tempId)
      alert('Failed to create event')
    }
  }

  // Loading state
  if (isLoading) {
    return <SkeletonCalendar view={view} />
  }

  return (
    <div className="relative">
      <CalendarHeader
        view={view}
        onViewChange={setView}
        currentDate={currentDate}
        onPrevious={goToPrevious}
        onNext={goToNext}
        onToday={goToToday}
      />

      <CalendarGrid
        view={view}
        events={allEvents}
        currentDate={currentDate}
        isMobile={isMobile}
      />

      {showCreateModal && (
        <CreateEventModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}

      {showConfetti && (
        <ConfettiEffect
          intensity="subtle"
          onComplete={() => setShowConfetti(false)}
        />
      )}
    </div>
  )
}
```

---

## Best Practices

1. **Combine hooks strategically**: Use multiple hooks together for complete functionality
2. **Handle loading states**: Always show skeleton while data loads
3. **Optimistic updates**: For instant feedback on user actions
4. **Keyboard shortcuts**: Enable power users with shortcuts
5. **Responsive design**: Adapt UI based on device size
6. **Error handling**: Always handle fetch errors gracefully
7. **Cleanup**: All hooks handle cleanup automatically

---

## Performance Tips

- `useCalendarData` dedupes requests within 5 seconds
- `useMediaQuery` uses native matchMedia (no resize listener overhead)
- `useCalendarKeyboard` ignores shortcuts when typing in inputs
- All hooks use `useCallback` to prevent unnecessary re-renders
- SWR caches data and shares across components
