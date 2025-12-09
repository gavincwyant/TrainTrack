# CalendarCore Components

Premium event display components for the custom calendar implementation.

## Components

### 1. EventCard
A versatile event card component that adapts its layout based on the calendar view.

**Features:**
- Multiple layouts (month compact, week/day detailed, agenda)
- Status-based gradient backgrounds with glows
- Smooth hover animations (scale + translateY + enhanced shadow)
- Quick action buttons on hover (desktop only)
- Special status indicators (completed checkmark, cancelled dashed border, blocked diagonal stripes)
- Client avatar with fallback initials
- Duration indicator bar (detailed view)

**Props:**
```typescript
interface EventCardProps {
  event: CalendarEvent           // Event data
  viewType: CalendarView         // 'month' | 'week' | 'day' | 'agenda'
  onClick?: (event: CalendarEvent) => void
  onQuickAction?: (action: 'complete' | 'cancel' | 'edit', event: CalendarEvent) => void
  style?: React.CSSProperties
}
```

**Usage:**
```tsx
import { EventCard } from './components/CalendarCore'

<EventCard
  event={event}
  viewType="day"
  onClick={(evt) => openDetailModal(evt)}
  onQuickAction={(action, evt) => handleAction(action, evt)}
/>
```

### 2. CalendarTimeline
Timeline view component supporting both day and agenda layouts.

**Day View Features:**
- 24-hour timeline with 30-minute slots
- Time labels on left
- Grid lines for visual alignment
- Overlapping event handling with column layout
- Current time indicator (red line with pulsing dot)
- Click empty slots to create appointments
- Auto-scroll to current time on mount

**Agenda View Features:**
- List view grouped by date
- Shows next 30 days
- Date headers with appointment counts
- Virtualized for performance
- Empty state for days without events

**Props:**
```typescript
interface CalendarTimelineProps {
  view: 'day' | 'agenda'
  currentDate: Date
  events: CalendarEvent[]
  onSlotClick?: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  onQuickAction?: (action: 'complete' | 'cancel' | 'edit', event: CalendarEvent) => void
  settings: CalendarSettings
}
```

**Usage:**
```tsx
import { CalendarTimeline } from './components/CalendarCore'

<CalendarTimeline
  view="day"
  currentDate={selectedDate}
  events={filteredEvents}
  onSlotClick={(date) => createAppointment(date)}
  onEventClick={(evt) => openDetailModal(evt)}
  onQuickAction={(action, evt) => handleAction(action, evt)}
  settings={calendarSettings}
/>
```

### 3. EmptyState
Beautiful empty state component shown when no events exist.

**Features:**
- Animated calendar illustration with gradient background
- Smooth fade-in animations
- CTA button with shimmer effect on hover
- Decorative elements (dots, circles)

**Props:**
```typescript
interface EmptyStateProps {
  message?: string              // Default: "No appointments scheduled"
  actionLabel?: string          // Default: "Schedule First Session"
  onAction?: () => void
}
```

**Usage:**
```tsx
import { EmptyState } from './components/CalendarCore'

{events.length === 0 && (
  <EmptyState
    message="No appointments this week"
    actionLabel="Schedule New Session"
    onAction={() => openCreateModal()}
  />
)}
```

## Design System Integration

All components use CSS variables from `globals.css`:

- **Shadows**: `var(--shadow-sm)`, `var(--shadow-md)`, `var(--shadow-lg)`
- **Colored glows**: `var(--shadow-glow-blue)`, `var(--shadow-glow-green)`, etc.
- **Timing**: `var(--timing-fast)`, `var(--timing-normal)`, etc.
- **Easing**: `var(--ease-spring)`, `var(--ease-standard)`, etc.
- **Status colors**: From `types/calendar.ts` STATUS_COLORS

## Animation Specifications

- **Hover**: 180ms with spring easing (translateY + scale + shadow)
- **Click**: 100ms scale down to 0.98
- **View transitions**: 350ms with stagger
- **Quick actions**: 200ms fade-in with 150ms delay
- **Empty state**: Multi-stage animation with 100-600ms delays

## Accessibility

- Proper ARIA labels on interactive elements
- Keyboard navigation support
- Focus states for all clickable elements
- Semantic HTML structure
- Screen reader friendly

## Performance

- Framer Motion for hardware-accelerated animations
- Virtualization in agenda view (react-window ready)
- Event memoization for large datasets
- Optimized re-renders with proper dependencies
- Absolute positioning for overlapping events (no layout shifts)

## Examples

### Complete Calendar Integration
```tsx
import { useState } from 'react'
import { CalendarTimeline, EmptyState } from './components/CalendarCore'

function Calendar() {
  const [view, setView] = useState<'day' | 'agenda'>('day')
  const [events, setEvents] = useState<CalendarEvent[]>([])

  return (
    <div className="h-screen flex flex-col">
      {events.length === 0 ? (
        <EmptyState onAction={() => setCreateModalOpen(true)} />
      ) : (
        <CalendarTimeline
          view={view}
          currentDate={new Date()}
          events={events}
          onSlotClick={handleSlotClick}
          onEventClick={handleEventClick}
          onQuickAction={handleQuickAction}
          settings={settings}
        />
      )}
    </div>
  )
}
```

### Custom Event Filtering
```tsx
const filteredEvents = events.filter(event => {
  if (!filters.cancelled && event.status === 'CANCELLED') return false
  if (!filters.completed && event.status === 'COMPLETED') return false
  return true
})

<CalendarTimeline
  view="day"
  events={filteredEvents}
  {...otherProps}
/>
```

### Responsive Layout
```tsx
const viewType = isMobile ? 'agenda' : 'day'

<CalendarTimeline
  view={viewType}
  {...props}
/>
```

## Notes

- All dates use native Date objects
- Status colors must match STATUS_COLORS in types/calendar.ts
- Event IDs must be unique for animation keys
- CalendarSettings includes timezone, working hours, and working days
- Quick actions only show on desktop (hover state)
