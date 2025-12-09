# Premium Calendar V2 - Animation Components & Hooks Summary

## Overview

This document provides a complete overview of the animation components and custom hooks built for the premium calendar with delightful micro-interactions.

---

## Directory Structure

```
app/(trainer)/trainer/calendar-v2/
├── components/
│   └── animations/
│       ├── ConfettiEffect.tsx       # Celebration animation
│       ├── CheckmarkAnimation.tsx   # Success checkmark
│       ├── SkeletonCalendar.tsx     # Loading skeleton
│       ├── LoadingSpinner.tsx       # Inline spinner
│       ├── EXAMPLES.tsx             # Usage examples
│       ├── README.md                # Component documentation
│       └── index.ts                 # Barrel exports
│
├── hooks/
│   ├── useCalendarView.ts           # View state management
│   ├── useCalendarData.ts           # Data fetching with SWR
│   ├── useOptimistic.ts             # Optimistic updates
│   ├── useMediaQuery.ts             # Responsive breakpoints
│   ├── useCalendarKeyboard.ts       # Keyboard shortcuts
│   ├── README.md                    # Hook documentation
│   └── index.ts                     # Barrel exports
│
└── types/
    └── calendar.ts                  # TypeScript types
```

---

## Animation Components

### 1. ConfettiEffect

**Purpose**: Celebration animation when completing appointments

**Features**:
- Subtle confetti burst (5-10 particles)
- 8px square particles in success green (#10b981)
- Scale 0→2, rotate 180deg, fade out
- Duration: 800ms with spring easing
- Framer Motion powered

**Usage**:
```tsx
<ConfettiEffect
  intensity="subtle"
  onComplete={() => console.log('Done!')}
/>
```

**Props**:
- `onComplete?: () => void` - Callback when animation completes
- `intensity?: 'subtle' | 'full'` - Particle count (8 or 20)

---

### 2. CheckmarkAnimation

**Purpose**: Drawing checkmark animation for success states

**Features**:
- SVG checkmark with stroke-dasharray animation
- Circle background with fade-in
- Duration: 400ms with spring easing
- Size: 48px (configurable)
- Color: Success green (configurable)

**Usage**:
```tsx
<CheckmarkAnimation
  size={48}
  color="#10b981"
  onComplete={() => console.log('Check drawn!')}
/>
```

**Props**:
- `size?: number` - Checkmark size in pixels (default: 48)
- `color?: string` - Checkmark color (default: #10b981)
- `onComplete?: () => void` - Callback when animation completes

---

### 3. SkeletonCalendar

**Purpose**: Loading state skeleton with shimmer effect

**Features**:
- Matches calendar grid structure for all views
- Gradient shimmer (left to right, 1.5s loop)
- Event card placeholders with random distribution
- Header skeleton (nav buttons, date label)
- Dark mode support

**Usage**:
```tsx
<SkeletonCalendar view="week" rows={10} />
<SkeletonCalendar view="month" />
<SkeletonCalendar view="day" />
<SkeletonCalendar view="agenda" />
```

**Props**:
- `view: CalendarView` - Calendar view type (month/week/day/agenda)
- `rows?: number` - Number of time slot rows (default: 5)

**View-Specific Details**:
- **Month**: 7-column grid, weekday headers, 35 day cells
- **Week**: Time slots (left) + 7 day columns, configurable rows
- **Day**: Single day with time slots, vertical layout
- **Agenda**: List view with event cards

---

### 4. LoadingSpinner

**Purpose**: Inline spinner for loading states

**Features**:
- Circular border animation
- Fast rotation (600ms)
- Size: 20px default
- Color: Primary blue default
- Accessible with aria-label

**Usage**:
```tsx
<LoadingSpinner />
<LoadingSpinner size={32} color="#10b981" />
```

**Props**:
- `size?: number` - Spinner size in pixels (default: 20)
- `color?: string` - Spinner color (default: #3b82f6)

---

## Custom Hooks

### 1. useCalendarView

**Purpose**: Manage calendar view state and navigation

**Returns**:
```typescript
{
  view: CalendarView              // Current view
  setView: (view) => void         // Change view
  currentDate: Date               // Current date
  goToToday: () => void           // Jump to today
  goToPrevious: () => void        // Previous period
  goToNext: () => void            // Next period
  goToDate: (date) => void        // Jump to specific date
}
```

**Navigation Logic**:
- Day view: ±1 day
- Week view: ±7 days
- Month view: ±1 month
- Agenda view: ±7 days

**Usage**:
```tsx
const {
  view,
  setView,
  currentDate,
  goToToday,
  goToPrevious,
  goToNext,
} = useCalendarView('week')
```

---

### 2. useCalendarData

**Purpose**: Data fetching with SWR for real-time updates

**Returns**:
```typescript
{
  events: CalendarEvent[]         // Combined appointments + blocked times
  isLoading: boolean              // Initial load state
  isError: boolean                // Error state
  refetch: () => void             // Manual refresh
}
```

**Features**:
- Auto-refresh every 60 seconds
- Revalidates on focus
- Revalidates on reconnection
- Dedupes requests within 5 seconds
- Transforms API data to CalendarEvent format
- Combines appointments and blocked times

**Usage**:
```tsx
const { events, isLoading, isError, refetch } = useCalendarData()

if (isLoading) return <SkeletonCalendar view="week" />
if (isError) return <ErrorMessage />

return <CalendarGrid events={events} />
```

---

### 3. useOptimistic

**Purpose**: Optimistic UI updates for instant feedback

**Returns**:
```typescript
{
  pendingEvents: CalendarEvent[]  // Events being created
  addOptimistic: (event) => string // Add optimistic event, returns tempId
  resolveOptimistic: (tempId, realEvent?) => void // Resolve/remove
  clearAll: () => void            // Clear all pending
}
```

**Features**:
- Instant UI feedback
- Automatic rollback on error
- Unique temp IDs for tracking
- Marks events with `_pending: true` and `_tempId`

**Usage**:
```tsx
const { pendingEvents, addOptimistic, resolveOptimistic } = useOptimistic()
const { events, refetch } = useCalendarData()

const handleCreate = async (eventData) => {
  const tempId = addOptimistic(eventData)

  try {
    const response = await createEvent(eventData)
    resolveOptimistic(tempId)
    refetch()
  } catch (error) {
    resolveOptimistic(tempId) // Remove on error
  }
}

// Combine real and pending events
const allEvents = [...events, ...pendingEvents]
```

---

### 4. useMediaQuery

**Purpose**: Responsive breakpoint detection

**Returns**:
```typescript
{
  isMobile: boolean               // ≤768px
  isTablet: boolean               // 769px - 1024px
  isDesktop: boolean              // >1024px
}
```

**Features**:
- SSR-safe (checks for window)
- Uses native matchMedia API
- Auto-updates on resize
- Proper cleanup

**Usage**:
```tsx
const { isMobile, isTablet, isDesktop } = useMediaQuery()

if (isMobile) return <MobileCalendar />
if (isTablet) return <TabletCalendar />
return <DesktopCalendar />
```

---

### 5. useCalendarKeyboard

**Purpose**: Keyboard shortcuts for power users

**Keyboard Shortcuts**:
- `C` - Create appointment
- `B` - Block time
- `T` - Go to today
- `M` - Month view
- `W` - Week view
- `D` - Day view
- `A` - Agenda view
- `←` - Previous period
- `→` - Next period

**Features**:
- Ignores shortcuts when typing in inputs
- All handlers are optional
- Prevents default browser behavior
- Proper cleanup on unmount

**Usage**:
```tsx
const { setView, goToToday, goToPrevious, goToNext } = useCalendarView()
const [showCreateModal, setShowCreateModal] = useState(false)

useCalendarKeyboard({
  onCreateAppointment: () => setShowCreateModal(true),
  onBlockTime: () => setShowBlockModal(true),
  onGoToToday: goToToday,
  onViewChange: setView,
  onNavigate: (dir) => dir === 'prev' ? goToPrevious() : goToNext(),
})
```

---

## Complete Integration Example

```tsx
'use client'

import { useState } from 'react'
import {
  useCalendarView,
  useCalendarData,
  useOptimistic,
  useMediaQuery,
  useCalendarKeyboard,
} from './hooks'
import {
  SkeletonCalendar,
  ConfettiEffect,
  CheckmarkAnimation,
  LoadingSpinner,
} from './components/animations'

export function PremiumCalendar() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  // View management
  const { view, setView, currentDate, goToToday, goToPrevious, goToNext } =
    useCalendarView('week')

  // Data fetching
  const { events, isLoading, refetch } = useCalendarData()

  // Optimistic updates
  const { pendingEvents, addOptimistic, resolveOptimistic } = useOptimistic()

  // Responsive
  const { isMobile } = useMediaQuery()

  // Keyboard shortcuts
  useCalendarKeyboard({
    onCreateAppointment: () => setShowCreateModal(true),
    onGoToToday: goToToday,
    onViewChange: setView,
    onNavigate: (dir) => dir === 'prev' ? goToPrevious() : goToNext(),
  })

  // Combine real and pending events
  const allEvents = [...events, ...pendingEvents]

  // Loading state
  if (isLoading) {
    return <SkeletonCalendar view={view} />
  }

  return (
    <div className="relative">
      <CalendarHeader {...{ view, setView, currentDate, goToPrevious, goToNext, goToToday }} />
      <CalendarGrid events={allEvents} view={view} />

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

## Technical Details

### Dependencies
- **Framer Motion 11**: Animation library for confetti and checkmark
- **SWR**: Data fetching with auto-refresh
- **React 19**: Latest React features
- **TypeScript**: Full type safety

### Performance
- GPU-accelerated animations via Framer Motion
- Efficient media query listeners (native matchMedia)
- SWR caching and deduplication
- Proper cleanup to prevent memory leaks
- Memoized callbacks in hooks

### Accessibility
- ARIA labels for spinners and loading states
- Keyboard shortcuts with proper focus management
- Screen reader friendly
- Respects prefers-reduced-motion (can be added)

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid and Flexbox
- matchMedia API
- Crypto API for UUID generation

---

## File Locations

All files are located at:
- **Components**: `/Users/gavinwyant/SIDE_PROJECTS/train/app/(trainer)/trainer/calendar-v2/components/animations/`
- **Hooks**: `/Users/gavinwyant/SIDE_PROJECTS/train/app/(trainer)/trainer/calendar-v2/hooks/`
- **Types**: `/Users/gavinwyant/SIDE_PROJECTS/train/app/(trainer)/trainer/calendar-v2/types/calendar.ts`

---

## Testing Recommendations

1. **Animation Components**:
   - Test confetti renders correct particle count
   - Verify checkmark animation completes in 400ms
   - Check skeleton matches all view types
   - Test spinner with different sizes/colors

2. **Hooks**:
   - Test useCalendarView navigation logic
   - Verify useCalendarData auto-refresh
   - Test optimistic updates with success/failure
   - Check useMediaQuery breakpoints
   - Test keyboard shortcuts don't fire in inputs

3. **Integration**:
   - Test full calendar with all hooks
   - Verify SSR compatibility
   - Test on mobile/tablet/desktop
   - Check memory leaks with cleanup

---

## Next Steps

1. Integrate components into main calendar
2. Add accessibility improvements (prefers-reduced-motion)
3. Add unit tests for hooks
4. Add Storybook stories for components
5. Performance testing with large event sets
6. Add analytics tracking for keyboard shortcuts
7. Add customization options (themes, colors)

---

## Resources

- Framer Motion Docs: https://www.framer.com/motion/
- SWR Docs: https://swr.vercel.app/
- Tailwind CSS: https://tailwindcss.com/
- React 19 Docs: https://react.dev/

---

**Created**: December 9, 2025
**Author**: Premium Calendar Team
**Version**: 1.0.0
