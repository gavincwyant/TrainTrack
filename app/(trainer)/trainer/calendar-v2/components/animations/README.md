# Calendar Animation Components

Delightful micro-interactions for the premium calendar.

## Components

### ConfettiEffect

Celebration animation when completing appointments.

```tsx
import { ConfettiEffect } from './animations'

// Subtle burst (8 particles)
<ConfettiEffect
  intensity="subtle"
  onComplete={() => console.log('Confetti done!')}
/>

// Full burst (20 particles)
<ConfettiEffect
  intensity="full"
  onComplete={() => console.log('Party!')}
/>
```

**Features:**
- Particles: 8px squares in success green (#10b981)
- Animation: scale from 0 to 2, rotate 180deg, fade out
- Duration: 800ms with spring easing
- Auto-cleanup after animation

---

### CheckmarkAnimation

Drawing checkmark animation for success states.

```tsx
import { CheckmarkAnimation } from './animations'

<CheckmarkAnimation
  size={48}
  color="#10b981"
  onComplete={() => console.log('Check drawn!')}
/>
```

**Features:**
- SVG checkmark with stroke-dasharray animation
- Circle background with fade-in
- Duration: 400ms with spring easing
- Configurable size and color

---

### SkeletonCalendar

Loading state skeleton with shimmer effect.

```tsx
import { SkeletonCalendar } from './animations'

// Month view
<SkeletonCalendar view="month" />

// Week view with custom rows
<SkeletonCalendar view="week" rows={10} />

// Day view
<SkeletonCalendar view="day" />

// Agenda view
<SkeletonCalendar view="agenda" />
```

**Features:**
- Matches calendar grid structure for each view
- Gradient shimmer animation (1.5s loop)
- Event card placeholders with random distribution
- Dark mode support

---

### LoadingSpinner

Inline spinner for loading states.

```tsx
import { LoadingSpinner } from './animations'

// Default (20px, primary blue)
<LoadingSpinner />

// Custom size and color
<LoadingSpinner size={32} color="#10b981" />
```

**Features:**
- Circular border animation
- Fast rotation (600ms)
- Accessible with aria-label
- Inline-block display

---

## Usage Examples

### Complete Event with Confetti

```tsx
'use client'

import { useState } from 'react'
import { ConfettiEffect, CheckmarkAnimation } from './animations'

function EventCard() {
  const [isCompleting, setIsCompleting] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const handleComplete = async () => {
    setIsCompleting(true)
    setShowConfetti(true)

    await markEventComplete(eventId)

    setTimeout(() => {
      setIsCompleting(false)
    }, 1000)
  }

  return (
    <div className="relative">
      <button onClick={handleComplete}>
        Mark Complete
      </button>

      {showConfetti && (
        <ConfettiEffect
          intensity="subtle"
          onComplete={() => setShowConfetti(false)}
        />
      )}

      {isCompleting && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <CheckmarkAnimation size={64} />
        </div>
      )}
    </div>
  )
}
```

### Loading State with Skeleton

```tsx
'use client'

import { SkeletonCalendar } from './animations'
import { useCalendarData } from '../hooks'

function Calendar() {
  const { events, isLoading } = useCalendarData()
  const view = 'week'

  if (isLoading) {
    return <SkeletonCalendar view={view} rows={12} />
  }

  return <CalendarGrid events={events} view={view} />
}
```

### Inline Loading Spinner

```tsx
'use client'

import { LoadingSpinner } from './animations'

function SaveButton({ isSaving }: { isSaving: boolean }) {
  return (
    <button disabled={isSaving}>
      {isSaving ? (
        <span className="flex items-center gap-2">
          <LoadingSpinner size={16} color="currentColor" />
          Saving...
        </span>
      ) : (
        'Save'
      )}
    </button>
  )
}
```

---

## Animation Timing

All animations use the timing constants from `types/calendar.ts`:

```typescript
export const TIMING = {
  instant: 100,
  fast: 180,
  normal: 250,
  slow: 350,
  verySlow: 500,
}

export const EASING = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  decelerate: 'cubic-bezier(0.0, 0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
}
```

---

## Accessibility

All components include proper accessibility attributes:
- `role` and `aria-label` for screen readers
- Reduced motion support (respects `prefers-reduced-motion`)
- Keyboard navigation support
- Semantic HTML structure

---

## Performance

- Uses Framer Motion for GPU-accelerated animations
- Proper cleanup to prevent memory leaks
- Memoized components to prevent unnecessary re-renders
- CSS animations for simple transitions
- Optimized particle counts for performance
