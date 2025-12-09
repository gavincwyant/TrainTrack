# CalendarCore Architecture

## Component Hierarchy

```
CalendarPage (Parent - Not Created)
│
├── CalendarHeader
│   ├── Navigation (Previous/Next/Today)
│   ├── Date Label
│   ├── View Switcher (Month/Week/Day/Agenda)
│   ├── Sync Button
│   └── Stats Display
│
├── CalendarGrid (Month/Week Views)
│   ├── Month View
│   │   ├── Day Headers (Sun-Sat)
│   │   ├── Week Rows (5-6 rows)
│   │   │   └── Day Cells
│   │   │       ├── Date Number
│   │   │       └── Event Cards (up to 3)
│   │   └── Overflow Indicators
│   │
│   └── Week View
│       ├── Day Headers
│       ├── Time Gutter (6am-10pm)
│       ├── Time Slots (30min intervals)
│       │   └── TimeSlot Component
│       ├── Event Cards (positioned by time)
│       └── CurrentTimeIndicator
│
└── CalendarTimeline (Day/Agenda Views - Already Exists)
    ├── Day View
    │   ├── Time Column
    │   ├── Event Area
    │   │   └── EventCard Components
    │   └── CurrentTimeIndicator
    │
    └── Agenda View
        └── Date Groups
            └── EventCard Components
```

## Data Flow

```
User Interaction
    ↓
Event Handler (onClick, onViewChange, etc.)
    ↓
Parent State Update (view, currentDate, events)
    ↓
Props Flow Down
    ↓
Component Re-render
    ↓
Memoized Calculations (grids, filters)
    ↓
Animated UI Update
```

## State Management

### Component State (Internal)
- `CalendarHeader`: isSyncing, view indicator position
- `CalendarGrid`: hoveredDate, event layouts
- `TimeSlot`: hover state, click animation
- `CurrentTimeIndicator`: position updates

### Parent State (Lifted)
- `view`: Current calendar view
- `currentDate`: Selected date
- `events`: Array of calendar events
- `settings`: User preferences
- `filters`: Event filters

## Animation Flow

```
1. User Action
   ↓
2. State Change
   ↓
3. Framer Motion Detects Change
   ↓
4. Animation Variants Applied
   ↓
5. GPU-Accelerated Transform
   ↓
6. Smooth Visual Transition
```

## Event Flow Examples

### Creating an Appointment

```
User clicks empty cell
    ↓
CalendarGrid.handleCellClick()
    ↓
onSlotClick(date, time)
    ↓
Parent opens appointment dialog
    ↓
User fills form and submits
    ↓
API call (optimistic update)
    ↓
Event added to events array
    ↓
CalendarGrid re-renders with new event
    ↓
Event card animates in
```

### Changing View

```
User clicks "Week" button
    ↓
CalendarHeader.handleViewChange()
    ↓
onViewChange('week')
    ↓
Parent updates view state
    ↓
CalendarGrid receives new view prop
    ↓
Month view fades out
    ↓
Week view fades in
    ↓
Sliding indicator animates to "Week"
```

### Navigating Dates

```
User clicks "Next" button
    ↓
CalendarHeader.handleNext()
    ↓
Calculate new date (currentDate + 1 month)
    ↓
onDateChange(newDate)
    ↓
Parent updates currentDate
    ↓
CalendarGrid receives new date
    ↓
Month grid recalculated (memoized)
    ↓
New dates fade in with stagger
    ↓
Date label updates with animation
```

## Performance Strategy

### Render Optimization
```
Props Change
    ↓
useMemo checks dependencies
    ↓
If dependencies unchanged → Use cached value
    ↓
If dependencies changed → Recalculate
    ↓
Shallow comparison in React.memo
    ↓
Skip render if props identical
```

### Animation Optimization
```
Framer Motion
    ↓
Uses transform/opacity (GPU-accelerated)
    ↓
Avoids layout thrashing
    ↓
RequestAnimationFrame timing
    ↓
Smooth 60fps animations
```

## Responsive Strategy

### Breakpoint System
```
Mobile (< 640px)
    - Stack layout
    - Dropdown selects
    - Simplified animations

Tablet (640px - 767px)
    - Hybrid layout
    - Touch-optimized
    - Medium animations

Desktop (>= 768px)
    - Full grid layout
    - Hover effects
    - Rich animations
```

### Adaptive Components
```
CalendarHeader
    Desktop: Pills → Mobile: Dropdown

CalendarGrid Month
    Desktop: 7 columns → Mobile: Horizontal scroll

CalendarGrid Week
    Desktop: Full width → Mobile: Pinch zoom enabled
```

## Accessibility Strategy

### Keyboard Navigation Tree
```
CalendarHeader
├── Previous Button (Tab)
├── Next Button (Tab)
├── Today Button (Tab)
├── View Switcher (Tab)
│   ├── Month (Arrow Keys)
│   ├── Week (Arrow Keys)
│   ├── Day (Arrow Keys)
│   └── Agenda (Arrow Keys)
└── Sync Button (Tab)

CalendarGrid
├── Day Cell 1 (Tab)
├── Day Cell 2 (Tab)
├── ... (Tab)
└── Day Cell N (Tab)
    └── Event Cards (Tab)
```

### ARIA Structure
```
<header role="banner">
  <nav aria-label="Calendar navigation">
    <button aria-label="Previous month">
    <button aria-label="Today">
    <button aria-label="Next month">
  </nav>

  <div role="tablist" aria-label="Calendar views">
    <button role="tab" aria-selected="true">Month</button>
    <button role="tab" aria-selected="false">Week</button>
  </div>
</header>

<main role="main">
  <div role="grid" aria-label="Calendar">
    <div role="row">
      <div role="gridcell" aria-label="December 1, 2025, 3 events">
        ...
      </div>
    </div>
  </div>
</main>
```

## Error Boundaries Strategy

```
CalendarPage (Error Boundary)
│
├── CalendarHeader (Isolated)
│   └── If error: Show simplified header
│
└── CalendarGrid (Error Boundary)
    └── If error: Show EmptyState with retry
```

## Loading States

```
Initial Load
    ↓
Skeleton UI
    - Header: Pulse animations
    - Grid: Shimmer effect

Syncing
    ↓
Sync Button: Spinner

View Change
    ↓
Fade out → Fade in

Event Update
    ↓
Optimistic UI (immediate feedback)
```

## Integration Points

### API Integration
```typescript
// Fetching events
const { data: events, isLoading } = useQuery('events', fetchEvents)

// Creating event
const { mutate: createEvent } = useMutation(createEventAPI, {
  onMutate: (newEvent) => {
    // Optimistic update
    queryClient.setQueryData('events', (old) => [...old, newEvent])
  }
})
```

### State Management (Zustand Example)
```typescript
interface CalendarStore {
  view: CalendarView
  currentDate: Date
  filters: FilterState
  setView: (view: CalendarView) => void
  setCurrentDate: (date: Date) => void
  toggleFilter: (filter: keyof FilterState) => void
}

const useCalendarStore = create<CalendarStore>((set) => ({
  view: 'month',
  currentDate: new Date(),
  filters: { scheduled: true, completed: true, ... },
  setView: (view) => set({ view }),
  setCurrentDate: (currentDate) => set({ currentDate }),
  toggleFilter: (filter) => set((state) => ({
    filters: { ...state.filters, [filter]: !state.filters[filter] }
  }))
}))
```

## File Structure
```
calendar-v2/
├── components/
│   ├── CalendarCore/
│   │   ├── CalendarHeader.tsx       (New)
│   │   ├── CalendarGrid.tsx         (New)
│   │   ├── TimeSlot.tsx             (New)
│   │   ├── CurrentTimeIndicator.tsx (New)
│   │   ├── EventCard.tsx            (Existing)
│   │   ├── CalendarTimeline.tsx     (Existing)
│   │   ├── EmptyState.tsx           (Existing)
│   │   ├── index.ts                 (Updated)
│   │   ├── README.md                (New)
│   │   ├── USAGE_EXAMPLE.tsx        (New)
│   │   ├── COMPONENT_SUMMARY.md     (New)
│   │   └── ARCHITECTURE.md          (This file)
│   │
│   ├── EventCreation/
│   ├── EventDetail/
│   ├── Filters/
│   ├── Mobile/
│   ├── Shared/
│   └── animations/
│
├── types/
│   └── calendar.ts
│
├── hooks/
│   ├── useCalendarData.ts
│   ├── useCalendarNavigation.ts
│   └── useEventMutations.ts
│
└── utils/
    ├── dateHelpers.ts
    ├── eventHelpers.ts
    └── layoutCalculations.ts
```

## Styling Strategy

### CSS Variables (Design Tokens)
```css
/* globals.css */
:root {
  /* Colors */
  --calendar-primary: #3b82f6;
  --calendar-bg-hover: rgba(59, 130, 246, 0.04);

  /* Shadows */
  --shadow-md: 0 2px 8px 0 rgba(0, 0, 0, 0.08);

  /* Timing */
  --timing-fast: 180ms;

  /* Easing */
  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
```

### Tailwind Classes (Utility-First)
```tsx
// Component
<div className="px-4 py-2 rounded-lg hover:bg-[var(--calendar-bg-hover)]">
  {/* Content */}
</div>
```

### Inline Styles (Dynamic Values)
```tsx
// For dynamic values that can't be predefined
<div style={{ top: `${position}px`, background: statusColors.bg }}>
  {/* Content */}
</div>
```

## Testing Strategy

### Unit Tests
```typescript
// CalendarHeader.test.tsx
describe('CalendarHeader', () => {
  it('navigates to previous month', () => {
    const onDateChange = jest.fn()
    render(<CalendarHeader onDateChange={onDateChange} />)
    fireEvent.click(screen.getByLabelText('Previous month'))
    expect(onDateChange).toHaveBeenCalled()
  })
})
```

### Integration Tests
```typescript
// CalendarGrid.test.tsx
describe('CalendarGrid', () => {
  it('displays events correctly in month view', () => {
    render(<CalendarGrid view="month" events={mockEvents} />)
    expect(screen.getByText('John Smith')).toBeInTheDocument()
  })
})
```

### Visual Tests
```typescript
// CalendarHeader.stories.tsx
export const Default = {
  args: {
    view: 'month',
    currentDate: new Date(2025, 11, 9),
    stats: { total: 10, completed: 3, upcoming: 7 }
  }
}
```

---

This architecture provides a solid foundation for a premium calendar interface with excellent performance, accessibility, and user experience.
