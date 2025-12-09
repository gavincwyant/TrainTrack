# Quick Start Guide

Get your premium calendar up and running in 5 minutes.

## 1. Import Components

```tsx
import {
  CalendarHeader,
  CalendarGrid,
  CalendarTimeline,
  EmptyState,
} from '@/app/(trainer)/trainer/calendar-v2/components/CalendarCore'

import type {
  CalendarView,
  CalendarEvent,
  CalendarSettings,
  FilterState,
} from '@/app/(trainer)/trainer/calendar-v2/types/calendar'
```

## 2. Set Up State

```tsx
const [view, setView] = useState<CalendarView>('month')
const [currentDate, setCurrentDate] = useState(new Date())
const [events, setEvents] = useState<CalendarEvent[]>([])

const settings: CalendarSettings = {
  dayStartTime: '06:00',
  dayEndTime: '22:00',
  timezone: 'America/Los_Angeles',
  workingDays: [1, 2, 3, 4, 5], // Mon-Fri
}

const filters: FilterState = {
  scheduled: true,
  completed: true,
  cancelled: false,
  rescheduled: true,
  blocked: true,
}
```

## 3. Calculate Stats (Optional)

```tsx
const stats = {
  total: events.filter(e => e.type === 'appointment').length,
  completed: events.filter(e => e.status === 'COMPLETED').length,
  upcoming: events.filter(
    e => e.status === 'SCHEDULED' && e.startTime > new Date()
  ).length,
}
```

## 4. Add the Header

```tsx
<CalendarHeader
  view={view}
  onViewChange={setView}
  currentDate={currentDate}
  onDateChange={setCurrentDate}
  stats={stats}
/>
```

## 5. Add the Grid/Timeline

```tsx
{/* Month and Week views */}
{(view === 'month' || view === 'week') && (
  <CalendarGrid
    view={view}
    currentDate={currentDate}
    events={events}
    settings={settings}
    filters={filters}
    onSlotClick={(date, time) => {
      console.log('Create appointment', date, time)
    }}
    onEventClick={(event) => {
      console.log('View event', event)
    }}
  />
)}

{/* Day and Agenda views */}
{(view === 'day' || view === 'agenda') && (
  <CalendarTimeline
    view={view}
    currentDate={currentDate}
    events={events}
    settings={settings}
    onSlotClick={(date) => {
      console.log('Create appointment', date)
    }}
    onEventClick={(event) => {
      console.log('View event', event)
    }}
  />
)}
```

## 6. Add Empty State (Optional)

```tsx
{events.length === 0 && (
  <EmptyState
    message="No appointments scheduled"
    actionLabel="Schedule First Session"
    onAction={() => {
      console.log('Open create modal')
    }}
  />
)}
```

## Complete Example

```tsx
'use client'

import { useState } from 'react'
import {
  CalendarHeader,
  CalendarGrid,
  CalendarTimeline,
  EmptyState,
} from '@/app/(trainer)/trainer/calendar-v2/components/CalendarCore'
import type {
  CalendarView,
  CalendarEvent,
  CalendarSettings,
  FilterState,
} from '@/app/(trainer)/trainer/calendar-v2/types/calendar'

export default function MyCalendar() {
  const [view, setView] = useState<CalendarView>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])

  const settings: CalendarSettings = {
    dayStartTime: '06:00',
    dayEndTime: '22:00',
    timezone: 'America/Los_Angeles',
    workingDays: [1, 2, 3, 4, 5],
  }

  const filters: FilterState = {
    scheduled: true,
    completed: true,
    cancelled: false,
    rescheduled: true,
    blocked: true,
  }

  const stats = {
    total: events.filter(e => e.type === 'appointment').length,
    completed: events.filter(e => e.status === 'COMPLETED').length,
    upcoming: events.filter(
      e => e.status === 'SCHEDULED' && e.startTime > new Date()
    ).length,
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 p-6 gap-6">
      <CalendarHeader
        view={view}
        onViewChange={setView}
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        stats={stats}
      />

      <div className="flex-1 min-h-0">
        {events.length === 0 ? (
          <EmptyState onAction={() => console.log('Create')} />
        ) : (
          <>
            {(view === 'month' || view === 'week') && (
              <CalendarGrid
                view={view}
                currentDate={currentDate}
                events={events}
                settings={settings}
                filters={filters}
                onSlotClick={(date, time) => console.log('Slot', date, time)}
                onEventClick={(event) => console.log('Event', event)}
              />
            )}

            {(view === 'day' || view === 'agenda') && (
              <CalendarTimeline
                view={view}
                currentDate={currentDate}
                events={events}
                settings={settings}
                onSlotClick={(date) => console.log('Slot', date)}
                onEventClick={(event) => console.log('Event', event)}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
```

## Next Steps

### 1. Connect to API
```tsx
// Using React Query
const { data: events = [] } = useQuery('events', fetchEvents)
const { mutate: createEvent } = useMutation(createEventAPI)

const handleSlotClick = (date: Date) => {
  createEvent({
    startTime: date,
    endTime: addHours(date, 1),
    // ... other fields
  })
}
```

### 2. Add Modals/Dialogs
```tsx
const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

<EventDetailDialog
  event={selectedEvent}
  onClose={() => setSelectedEvent(null)}
/>
```

### 3. Add Filters UI
```tsx
<FilterBar
  filters={filters}
  onToggle={(key) => setFilters({ ...filters, [key]: !filters[key] })}
/>
```

### 4. Add Loading States
```tsx
{isLoading ? (
  <CalendarSkeleton />
) : (
  <CalendarGrid {...props} />
)}
```

### 5. Error Handling
```tsx
{error ? (
  <ErrorState onRetry={() => refetch()} />
) : (
  <CalendarGrid {...props} />
)}
```

## Customization

### Change Colors
Edit `/app/globals.css`:
```css
:root {
  --calendar-primary: #your-color;
  --calendar-bg-hover: rgba(your-color, 0.04);
}
```

### Change Working Hours
```tsx
const settings: CalendarSettings = {
  dayStartTime: '08:00',  // Start at 8am
  dayEndTime: '18:00',    // End at 6pm
  workingDays: [1, 2, 3], // Mon, Tue, Wed only
  timezone: 'America/New_York',
}
```

### Custom Event Styling
Use the `EventCard` component directly:
```tsx
import { EventCard } from '@/app/(trainer)/trainer/calendar-v2/components/CalendarCore'

<EventCard
  event={event}
  viewType="month"
  style={{ backgroundColor: 'custom' }}
/>
```

## Troubleshooting

### Events Not Showing
- Check date formats (must be Date objects)
- Verify filters are not hiding events
- Check event times are within working hours

### Animations Choppy
- Ensure Framer Motion is installed
- Check for layout shifts
- Use transform/opacity animations only

### TypeScript Errors
- Ensure all types are imported from `types/calendar.ts`
- Check Date objects (not strings)
- Verify required props are provided

## Performance Tips

1. **Memoize expensive calculations**
   ```tsx
   const filteredEvents = useMemo(
     () => events.filter(/* ... */),
     [events, filters]
   )
   ```

2. **Use React.memo for event cards**
   ```tsx
   const MemoizedEventCard = memo(EventCard)
   ```

3. **Limit event count**
   ```tsx
   const visibleEvents = events.slice(0, 100)
   ```

4. **Debounce updates**
   ```tsx
   const debouncedSetDate = useDebouncedCallback(setCurrentDate, 300)
   ```

## Support

- Documentation: See `README.md` for full API reference
- Architecture: See `ARCHITECTURE.md` for system design
- Examples: See `USAGE_EXAMPLE.tsx` for advanced patterns
- Component Details: See `COMPONENT_SUMMARY.md`

---

That's it! You now have a fully functional premium calendar. Start customizing to match your needs.
