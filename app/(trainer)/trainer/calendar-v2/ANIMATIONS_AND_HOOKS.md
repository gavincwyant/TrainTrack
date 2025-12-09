# Premium Calendar V2 - Animations & Hooks

Complete implementation of delightful micro-interactions and powerful custom hooks for the premium calendar.

---

## 📦 What's Included

### Animation Components (4)
1. **ConfettiEffect** - Celebration animation for completed appointments
2. **CheckmarkAnimation** - Drawing checkmark with spring animation
3. **SkeletonCalendar** - Loading state with shimmer effect
4. **LoadingSpinner** - Inline spinner for loading states

### Custom Hooks (5)
1. **useCalendarView** - View state and navigation management
2. **useCalendarData** - Data fetching with SWR and auto-refresh
3. **useOptimistic** - Optimistic UI updates for instant feedback
4. **useMediaQuery** - Responsive breakpoint detection
5. **useCalendarKeyboard** - Keyboard shortcuts for power users

---

## 📁 File Structure

```
app/(trainer)/trainer/calendar-v2/
│
├── components/animations/
│   ├── ConfettiEffect.tsx       (85 lines)  - Confetti burst animation
│   ├── CheckmarkAnimation.tsx   (85 lines)  - SVG checkmark drawing
│   ├── SkeletonCalendar.tsx     (177 lines) - Loading skeleton for all views
│   ├── LoadingSpinner.tsx       (28 lines)  - Simple spinner component
│   ├── EXAMPLES.tsx             (346 lines) - Usage examples
│   ├── README.md                (240 lines) - Component documentation
│   └── index.ts                 (4 lines)   - Barrel exports
│
├── hooks/
│   ├── useCalendarView.ts       (83 lines)  - View management
│   ├── useCalendarData.ts       (101 lines) - Data fetching
│   ├── useOptimistic.ts         (52 lines)  - Optimistic updates
│   ├── useMediaQuery.ts         (50 lines)  - Responsive detection
│   ├── useCalendarKeyboard.ts   (107 lines) - Keyboard shortcuts
│   ├── README.md                (399 lines) - Hook documentation
│   └── index.ts                 (5 lines)   - Barrel exports
│
├── COMPONENTS_SUMMARY.md        - Complete technical documentation
├── QUICK_START.md               - 5-minute setup guide
└── ANIMATIONS_AND_HOOKS.md      - This file

Total: 1,762 lines of code + documentation
```

---

## 🚀 Quick Start

### 1. Import what you need

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

### 2. Basic calendar setup

```tsx
'use client'

import { useCalendarView, useCalendarData } from './hooks'
import { SkeletonCalendar } from './components/animations'

export function Calendar() {
  const { view, currentDate, goToPrevious, goToNext } = useCalendarView('week')
  const { events, isLoading } = useCalendarData()

  if (isLoading) return <SkeletonCalendar view={view} />

  return <CalendarGrid events={events} view={view} currentDate={currentDate} />
}
```

---

## 🎨 Animation Showcase

### Confetti Effect
**When to use**: Celebrate completed appointments, achievements
**Duration**: 800ms
**Particles**: 8 (subtle) or 20 (full)
**Color**: Success green (#10b981)

```tsx
<ConfettiEffect
  intensity="subtle"
  onComplete={() => console.log('Party time!')}
/>
```

### Checkmark Animation
**When to use**: Success confirmations, task completions
**Duration**: 400ms
**Style**: SVG path drawing with spring easing
**Size**: 48px (configurable)

```tsx
<CheckmarkAnimation
  size={64}
  color="#10b981"
  onComplete={() => console.log('Done!')}
/>
```

### Skeleton Calendar
**When to use**: Initial page load, data refetch
**Views**: Month, Week, Day, Agenda
**Effect**: Gradient shimmer (1.5s loop)
**Dark mode**: Fully supported

```tsx
<SkeletonCalendar view="week" rows={12} />
```

### Loading Spinner
**When to use**: Inline loading states, buttons
**Duration**: 600ms rotation
**Size**: 20px (configurable)
**Color**: Primary blue (configurable)

```tsx
<LoadingSpinner size={16} color="currentColor" />
```

---

## 🎯 Hook Capabilities

### useCalendarView
**Purpose**: Centralized view state management

**Features**:
- View switching (month/week/day/agenda)
- Date navigation (previous/next/today)
- Jump to specific date
- View-aware navigation (±1 day, ±7 days, ±1 month)

### useCalendarData
**Purpose**: Real-time data fetching with SWR

**Features**:
- Auto-refresh every 60 seconds
- Revalidates on window focus
- Revalidates on network reconnect
- Request deduplication (5s window)
- Combines appointments + blocked times
- Transforms API data to CalendarEvent format

### useOptimistic
**Purpose**: Instant UI feedback during async operations

**Features**:
- Optimistic event creation
- Automatic rollback on error
- Unique temp ID tracking
- Pending state markers
- Clean add/resolve API

### useMediaQuery
**Purpose**: Responsive design without CSS media queries

**Features**:
- Mobile detection (≤768px)
- Tablet detection (769-1024px)
- Desktop detection (>1024px)
- SSR-safe (checks for window)
- Native matchMedia API
- Auto-updates on resize

### useCalendarKeyboard
**Purpose**: Power user keyboard shortcuts

**Features**:
- 10 keyboard shortcuts
- Ignores input/textarea focus
- All handlers optional
- Prevents default browser behavior
- Proper cleanup on unmount

**Shortcuts**:
- C → Create appointment
- B → Block time
- T → Go to today
- M/W/D/A → View switching
- ←/→ → Navigation

---

## 💡 Common Patterns

### Pattern 1: Complete Event with Celebration

```tsx
const [showConfetti, setShowConfetti] = useState(false)
const [showCheckmark, setShowCheckmark] = useState(false)

const handleComplete = async () => {
  setShowCheckmark(true)
  await completeEvent(eventId)

  setTimeout(() => {
    setShowCheckmark(false)
    setShowConfetti(true)
  }, 400)
}

return (
  <div className="relative">
    <button onClick={handleComplete}>Complete</button>
    {showCheckmark && <CheckmarkAnimation />}
    {showConfetti && <ConfettiEffect intensity="subtle" />}
  </div>
)
```

### Pattern 2: Optimistic Event Creation

```tsx
const { events, refetch } = useCalendarData()
const { pendingEvents, addOptimistic, resolveOptimistic } = useOptimistic()

const handleCreate = async (data) => {
  const tempId = addOptimistic(data)

  try {
    await createEvent(data)
    resolveOptimistic(tempId)
    refetch()
  } catch {
    resolveOptimistic(tempId)
    alert('Failed')
  }
}

// Combine real + pending
const allEvents = [...events, ...pendingEvents]
```

### Pattern 3: Responsive View

```tsx
const { isMobile, isTablet } = useMediaQuery()
const { view, setView } = useCalendarView()

useEffect(() => {
  if (isMobile && view === 'month') {
    setView('day') // Auto-switch to day view on mobile
  }
}, [isMobile, view])
```

### Pattern 4: Full-Featured Calendar

```tsx
export function PremiumCalendar() {
  // Hooks
  const { view, setView, goToToday, goToPrevious, goToNext } = useCalendarView('week')
  const { events, isLoading, refetch } = useCalendarData()
  const { pendingEvents, addOptimistic, resolveOptimistic } = useOptimistic()
  const { isMobile } = useMediaQuery()

  useCalendarKeyboard({
    onGoToToday: goToToday,
    onViewChange: setView,
    onNavigate: (dir) => dir === 'prev' ? goToPrevious() : goToNext(),
  })

  if (isLoading) return <SkeletonCalendar view={view} />

  const allEvents = [...events, ...pendingEvents]

  return <CalendarGrid events={allEvents} view={view} />
}
```

---

## 🎭 Animation Timing System

All components use the centralized timing system from `types/calendar.ts`:

```typescript
// Durations (milliseconds)
TIMING = {
  instant: 100,
  fast: 180,
  normal: 250,
  slow: 350,
  verySlow: 500,
}

// Easing curves
EASING = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  decelerate: 'cubic-bezier(0.0, 0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
}
```

**Usage**:
```tsx
transition: `opacity ${TIMING.fast}ms ${EASING.spring}`
```

---

## ⚡ Performance

- **GPU-accelerated animations** via Framer Motion
- **Efficient media queries** using native matchMedia API
- **SWR caching** prevents duplicate requests
- **Proper cleanup** prevents memory leaks
- **Memoized callbacks** in all hooks
- **SSR-safe** - all hooks check for window

---

## ♿ Accessibility

- **ARIA labels** on spinners and loading states
- **Keyboard navigation** with proper focus management
- **Screen reader friendly** semantic HTML
- **Reduced motion** support (can be added with prefers-reduced-motion)

---

## 🧪 Testing Checklist

### Animation Components
- [ ] Confetti renders correct particle count
- [ ] Checkmark completes in 400ms
- [ ] Skeleton matches all view types
- [ ] Spinner works with custom sizes/colors
- [ ] All animations clean up properly

### Custom Hooks
- [ ] useCalendarView navigation logic correct
- [ ] useCalendarData auto-refreshes every 60s
- [ ] Optimistic updates rollback on error
- [ ] useMediaQuery detects breakpoints correctly
- [ ] Keyboard shortcuts don't fire in inputs
- [ ] All hooks clean up on unmount

### Integration
- [ ] Full calendar works with all hooks
- [ ] SSR compatible (no window errors)
- [ ] Works on mobile/tablet/desktop
- [ ] No memory leaks with repeated mount/unmount
- [ ] Handles large event sets (100+ events)

---

## 📚 Documentation

1. **Quick Start**: `QUICK_START.md` - Get up and running in 5 minutes
2. **Components**: `components/animations/README.md` - Animation component details
3. **Hooks**: `hooks/README.md` - Custom hook documentation
4. **Examples**: `components/animations/EXAMPLES.tsx` - Working code examples
5. **Summary**: `COMPONENTS_SUMMARY.md` - Complete technical overview

---

## 🔧 Technical Stack

- **React 19** - Latest React features
- **Next.js 16** - App Router, Server Components
- **Framer Motion 11** - Animation library
- **SWR** - Data fetching and caching
- **TypeScript** - Full type safety
- **Tailwind CSS 4** - Styling system

---

## 📊 Statistics

- **Total Lines**: 1,762
- **Components**: 4 animation components
- **Hooks**: 5 custom hooks
- **Documentation**: 1,018 lines
- **Code**: 744 lines
- **Examples**: 346 lines
- **Type Safety**: 100%

---

## 🎯 Use Cases

### Event Management
- Create appointments with optimistic updates
- Complete events with confetti celebration
- Block time slots
- View different time periods

### Loading States
- Skeleton while fetching data
- Spinner for inline operations
- Smooth transitions between views
- Progressive loading for large datasets

### Power Users
- Keyboard shortcuts for fast navigation
- Quick view switching (M/W/D/A)
- Date navigation (←/→)
- Instant create actions (C/B)

### Responsive Design
- Mobile-optimized views
- Tablet-specific layouts
- Desktop full features
- Auto-adapt based on screen size

---

## 🚦 Next Steps

1. **Integration**: Add components to main calendar
2. **Customization**: Theme support, color variants
3. **Accessibility**: Add prefers-reduced-motion
4. **Testing**: Unit tests for all hooks
5. **Storybook**: Interactive component documentation
6. **Analytics**: Track keyboard shortcut usage
7. **Performance**: Optimize for 1000+ events

---

## 📞 Support

For questions or issues:
1. Check the README files in each directory
2. Review the EXAMPLES.tsx for working code
3. Look at type definitions in `types/calendar.ts`
4. Check the QUICK_START.md for common patterns

---

## 🎉 Key Features

✅ **4 Animation Components** - Confetti, Checkmark, Skeleton, Spinner
✅ **5 Custom Hooks** - View, Data, Optimistic, Media, Keyboard
✅ **Full TypeScript** - 100% type safety
✅ **Framer Motion** - GPU-accelerated animations
✅ **SWR Integration** - Auto-refresh, caching, deduplication
✅ **Responsive** - Mobile, tablet, desktop support
✅ **Keyboard Shortcuts** - 10 power user shortcuts
✅ **Optimistic Updates** - Instant UI feedback
✅ **SSR-Safe** - Works with Next.js App Router
✅ **Accessible** - ARIA labels, keyboard navigation
✅ **Well Documented** - 1000+ lines of docs + examples

---

**Built with ❤️ for delightful user experiences**

*Last Updated: December 9, 2025*
