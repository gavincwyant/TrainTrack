# Quick Start Guide - Premium Calendar Components & Hooks

Get up and running with the premium calendar animations and hooks in minutes.

---

## Installation

All components and hooks are already installed in your project. No additional dependencies needed!

**Location**: `app/(trainer)/trainer/calendar-v2/`

---

## Import Components

```tsx
// Animation components
import {
  ConfettiEffect,
  CheckmarkAnimation,
  SkeletonCalendar,
  LoadingSpinner,
} from '@/app/(trainer)/trainer/calendar-v2/components/animations'

// Custom hooks
import {
  useCalendarView,
  useCalendarData,
  useOptimistic,
  useMediaQuery,
  useCalendarKeyboard,
} from '@/app/(trainer)/trainer/calendar-v2/hooks'
```

---

## 5-Minute Setup

### Step 1: Add Loading State

```tsx
'use client'

import { useCalendarData } from './hooks'
import { SkeletonCalendar } from './components/animations'

export function Calendar() {
  const { events, isLoading } = useCalendarData()

  if (isLoading) {
    return <SkeletonCalendar view="week" />
  }

  return <div>Your calendar here</div>
}
```

### Step 2: Add View Management

```tsx
'use client'

import { useCalendarView, useCalendarData } from './hooks'
import { SkeletonCalendar } from './components/animations'

export function Calendar() {
  const { view, setView, currentDate, goToPrevious, goToNext, goToToday } =
    useCalendarView('week')
  const { events, isLoading } = useCalendarData()

  if (isLoading) return <SkeletonCalendar view={view} />

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={goToPrevious}>←</button>
        <button onClick={goToToday}>Today</button>
        <button onClick={goToNext}>→</button>
        <button onClick={() => setView('day')}>Day</button>
        <button onClick={() => setView('week')}>Week</button>
        <button onClick={() => setView('month')}>Month</button>
      </div>
      <div>Your calendar grid with {events.length} events</div>
    </div>
  )
}
```

### Step 3: Add Keyboard Shortcuts

```tsx
'use client'

import { useState } from 'react'
import { useCalendarView, useCalendarKeyboard } from './hooks'

export function Calendar() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { view, setView, goToToday, goToPrevious, goToNext } = useCalendarView('week')

  useCalendarKeyboard({
    onCreateAppointment: () => setShowCreateModal(true),
    onGoToToday: goToToday,
    onViewChange: setView,
    onNavigate: (dir) => dir === 'prev' ? goToPrevious() : goToNext(),
  })

  return <div>Press C to create, T for today, ←/→ to navigate</div>
}
```

### Step 4: Add Confetti Celebration

```tsx
'use client'

import { useState } from 'react'
import { ConfettiEffect, CheckmarkAnimation } from './components/animations'

export function EventCard({ event }) {
  const [showConfetti, setShowConfetti] = useState(false)
  const [showCheckmark, setShowCheckmark] = useState(false)

  const handleComplete = async () => {
    setShowCheckmark(true)
    await markAsComplete(event.id)

    setTimeout(() => {
      setShowCheckmark(false)
      setShowConfetti(true)
    }, 400)
  }

  return (
    <div className="relative">
      <button onClick={handleComplete}>Complete</button>

      {showCheckmark && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90">
          <CheckmarkAnimation />
        </div>
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

### Step 5: Add Optimistic Updates

```tsx
'use client'

import { useCalendarData, useOptimistic } from './hooks'

export function CreateEventButton() {
  const { refetch } = useCalendarData()
  const { addOptimistic, resolveOptimistic } = useOptimistic()

  const handleCreate = async (eventData) => {
    // Add optimistic event immediately
    const tempId = addOptimistic(eventData)

    try {
      // Create on server
      await fetch('/api/appointments', {
        method: 'POST',
        body: JSON.stringify(eventData),
      })

      // Success - resolve optimistic update
      resolveOptimistic(tempId)
      refetch()
    } catch (error) {
      // Error - rollback
      resolveOptimistic(tempId)
      alert('Failed to create')
    }
  }

  return <button onClick={() => handleCreate({...})}>Create</button>
}
```

---

## Common Patterns

### Loading Button

```tsx
import { LoadingSpinner } from './components/animations'

function SaveButton() {
  const [isSaving, setIsSaving] = useState(false)

  return (
    <button disabled={isSaving}>
      {isSaving && <LoadingSpinner size={16} color="currentColor" />}
      {isSaving ? 'Saving...' : 'Save'}
    </button>
  )
}
```

### Responsive Layout

```tsx
import { useMediaQuery } from './hooks'

function Calendar() {
  const { isMobile, isTablet, isDesktop } = useMediaQuery()

  if (isMobile) return <MobileView />
  if (isTablet) return <TabletView />
  return <DesktopView />
}
```

### All Views Skeleton

```tsx
import { SkeletonCalendar } from './components/animations'

// Month view
<SkeletonCalendar view="month" />

// Week view with 12 hour rows
<SkeletonCalendar view="week" rows={12} />

// Day view
<SkeletonCalendar view="day" />

// Agenda view
<SkeletonCalendar view="agenda" />
```

---

## Keyboard Shortcuts Reference

| Key | Action |
|-----|--------|
| `C` | Create appointment |
| `B` | Block time |
| `T` | Go to today |
| `M` | Month view |
| `W` | Week view |
| `D` | Day view |
| `A` | Agenda view |
| `←` | Previous period |
| `→` | Next period |

---

## Animation Timing

Use the built-in timing constants:

```tsx
import { TIMING, EASING } from './types/calendar'

// Use in your animations
transition: `opacity ${TIMING.fast}ms ${EASING.standard}`
```

**Available Timing**:
- `instant`: 100ms
- `fast`: 180ms
- `normal`: 250ms
- `slow`: 350ms
- `verySlow`: 500ms

**Available Easing**:
- `standard`: Balanced
- `decelerate`: Slow end
- `accelerate`: Fast end
- `bounce`: Playful bounce
- `spring`: Elastic spring

---

## Troubleshooting

### Skeleton not showing?

Make sure you're checking `isLoading`:

```tsx
const { events, isLoading } = useCalendarData()

if (isLoading) {
  return <SkeletonCalendar view="week" />
}
```

### Keyboard shortcuts not working?

Ensure you're not in an input field - the hook automatically ignores shortcuts when typing.

### Confetti not visible?

Make sure the parent has `position: relative`:

```tsx
<div className="relative">
  <ConfettiEffect />
</div>
```

### Events not updating?

Call `refetch()` after mutations:

```tsx
const { refetch } = useCalendarData()

await createEvent()
refetch() // Refresh data
```

---

## Next Steps

1. Read the full documentation:
   - `/components/animations/README.md`
   - `/hooks/README.md`
   - `/COMPONENTS_SUMMARY.md`

2. Check out examples:
   - `/components/animations/EXAMPLES.tsx`

3. Start integrating into your calendar!

---

## Need Help?

- Check the README files in each directory
- Review the EXAMPLES.tsx file for working code
- Look at the type definitions in `types/calendar.ts`

---

**Happy Building!** 🎉
