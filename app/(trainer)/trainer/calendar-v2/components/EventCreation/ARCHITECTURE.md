# Quick Create System Architecture

## Component Hierarchy

```
Calendar Page
│
├── QuickCreatePopover (Portal)
│   ├── SmartClientSelector
│   │   └── Client List (with suggestions)
│   └── DurationPicker
│       └── Preset buttons + Custom dropdown
│
├── QuickCreateInlineForm
│   ├── Client Select (native)
│   └── Duration Quick Buttons
│
└── CalendarContextMenu (Portal)
    └── Menu Items (dynamic based on target)
```

## User Flow: Creating an Appointment

### Flow 1: Quick Create Popover (Recommended - 2-3 clicks)

```
1. User clicks empty time slot
   └─> QuickCreatePopover appears at cursor

2. User types client name
   └─> SmartClientSelector shows suggestions
   └─> "John Doe" appears at top (pattern match: usually books Mon 2PM)

3. User clicks "John Doe" (or presses Enter)
   └─> Step 2: Duration picker appears
   └─> Pre-filled with 60min (last used for John)

4. User clicks "Create" (or presses Enter)
   └─> Optimistic event appears immediately
   └─> API call in background
   └─> Real event replaces optimistic

RESULT: 3 clicks (slot → client → create)
```

### Flow 2: Inline Form (Alternative - 3-4 clicks)

```
1. User double-clicks empty time slot
   └─> QuickCreateInlineForm appears IN the slot

2. User selects client from dropdown
   └─> Dropdown opens, user clicks client

3. User clicks duration button (30/60/90min)
   └─> Duration selected

4. User clicks "Create"
   └─> Appointment created

RESULT: 4 clicks (double-click → client → duration → create)
```

### Flow 3: Context Menu (3-4 clicks)

```
1. User right-clicks empty time slot
   └─> CalendarContextMenu appears

2. User clicks "Schedule Appointment"
   └─> QuickCreatePopover opens

3-4. Same as Flow 1

RESULT: 4 clicks (right-click → schedule → client → create)
```

## Smart Suggestions Algorithm

```typescript
// 1. Pattern Matching
for each client:
  if client has booked this day/time ≥2 times:
    add to suggestions
    reason: "Usually books Mon 2PM"
    priority: HIGH

// 2. Overdue Detection
for each client:
  typical_frequency = median(days_between_sessions)
  days_since_last = today - last_session_date

  if days_since_last > typical_frequency + 2:
    add to suggestions
    reason: "Overdue by X days"
    priority: MEDIUM

// 3. Recent Clients
for each client:
  if created_within_30_days && no_sessions:
    add to suggestions
    reason: "New client (Xd ago)"
    priority: LOW

// 4. Sort by priority and display
suggested_clients = [HIGH, MEDIUM, LOW]
```

## Data Flow

```
┌─────────────────┐
│  User Action    │
│  (Click Slot)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Calendar Page  │◄──────────────┐
│  Event Handler  │               │
└────────┬────────┘               │
         │                        │
         ▼                        │
┌─────────────────┐               │
│ QuickCreate     │               │
│ Popover         │               │
└────────┬────────┘               │
         │                        │
         ├─► Fetch Clients ───────┤
         │                        │
         ├─► Fetch History ───────┤
         │                        │
         ▼                        │
┌─────────────────┐               │
│ useSmartDefaults│               │
│ Hook            │               │
└────────┬────────┘               │
         │                        │
         ▼                        │
┌─────────────────┐               │
│ Suggestions     │               │
│ Calculated      │               │
└────────┬────────┘               │
         │                        │
         ▼                        │
┌─────────────────┐               │
│ User Selects    │               │
│ Client + Duration│              │
└────────┬────────┘               │
         │                        │
         ▼                        │
┌─────────────────┐               │
│ handleSubmit    │               │
└────────┬────────┘               │
         │                        │
         ├─► Create Optimistic    │
         │    Event               │
         │                        │
         ├─► POST /api/           │
         │    appointments        │
         │                        │
         ├─► Success?             │
         │    │                   │
         │    ├─ Yes: Replace     │
         │    │       with real   │
         │    │                   │
         │    └─ No: Remove       │
         │         optimistic     │
         │                        │
         └────────────────────────┘
```

## State Management

### Component-Level State

```typescript
// Calendar Page
{
  events: CalendarEvent[]
  quickCreate: {
    isOpen: boolean
    position: { x, y }
    slot: { start, end }
  }
  contextMenu: {
    isOpen: boolean
    position: { x, y }
    target: { type, data }
  }
}

// QuickCreatePopover
{
  selectedClient: Client | null
  duration: number
  step: 'client' | 'duration'
  isSubmitting: boolean
  error: string | null
}

// SmartClientSelector
{
  searchQuery: string
  selectedIndex: number
  clients: Client[]
  isLoading: boolean
}
```

## API Integration

### Required Endpoints

```typescript
// 1. Get clients
GET /api/clients
Response: { clients: Client[] }

// 2. Get appointments (for smart suggestions)
GET /api/appointments
Response: { appointments: Appointment[] }

// 3. Create appointment
POST /api/appointments
Body: {
  clientId: string
  startTime: ISO string
  endTime: ISO string
}
Response: { appointment: Appointment }

// 4. Update appointment (for context menu actions)
PATCH /api/appointments/:id
Body: { status?: string, ... }
Response: { appointment: Appointment }
```

## Performance Optimizations

### 1. Optimistic Updates
```typescript
// Show event immediately
setEvents([...events, optimisticEvent])

// Update in background
await createAppointment()
```

### 2. Memoization
```typescript
// Smart defaults hook
const suggestions = useMemo(() => {
  // Heavy computation
}, [date, time, clientId])
```

### 3. Debounced Search
```typescript
// Client selector
const debouncedSearch = useMemo(
  () => debounce(setSearchQuery, 300),
  []
)
```

### 4. Portal Rendering
```typescript
// Popover and context menu
return createPortal(content, document.body)
```

## Accessibility Features

```
✓ Keyboard Navigation
  - Arrow keys: Navigate items
  - Enter: Select/submit
  - Escape: Close/cancel
  - Tab: Focus next field
  - 1/2/3: Quick duration select

✓ ARIA Labels
  - role="menu" on context menu
  - role="menuitem" on menu items
  - aria-label on buttons
  - aria-selected on active items

✓ Focus Management
  - Auto-focus on open
  - Focus trap in modal
  - Return focus on close
  - Visible focus indicators

✓ Screen Reader Support
  - Semantic HTML
  - Clear labels
  - Status announcements
  - Error messages
```

## Animation System

```typescript
// Timings (from calendar types)
TIMING = {
  instant: 100ms,   // Immediate feedback
  fast: 180ms,      // Quick interactions
  normal: 250ms,    // Default
  slow: 350ms,      // Emphasis
  verySlow: 500ms   // Major transitions
}

// Easing
EASING = {
  standard: cubic-bezier(0.4, 0, 0.2, 1),
  spring: cubic-bezier(0.175, 0.885, 0.32, 1.275)
}

// Usage
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  transition={{
    duration: TIMING.fast / 1000,
    ease: EASING.spring
  }}
/>
```

## Error Handling

```typescript
// 1. Form Validation
- Client required
- Duration > 0
- End time > start time

// 2. API Errors
try {
  await createAppointment()
} catch (error) {
  // Remove optimistic event
  setEvents(prev => prev.filter(e => e._tempId !== tempId))

  // Show error
  setError(error.message)

  // Log for debugging
  console.error('Create failed:', error)
}

// 3. Network Errors
- Show retry button
- Keep optimistic event
- Queue for retry

// 4. Conflict Detection
- Check overlapping appointments
- Show conflict resolution UI
- Allow override
```

## Testing Strategy

### Unit Tests
```typescript
// Components
- SmartClientSelector: Search, keyboard nav, selection
- DurationPicker: Preset selection, custom input
- QuickCreatePopover: Step flow, validation

// Hooks
- useSmartDefaults: Suggestion algorithm
- Pattern matching
- Overdue detection
```

### Integration Tests
```typescript
// User flows
- Create appointment via popover
- Create appointment via inline form
- Context menu actions
- Keyboard shortcuts
```

### E2E Tests
```typescript
// Critical paths
1. Click slot → Select client → Create
2. Right-click → Schedule → Create
3. Double-click → Fill form → Create
4. Error handling
5. Optimistic updates
```

## Mobile Considerations

```typescript
// Touch Events
- Single tap: Quick create
- Long press: Context menu
- Swipe: Dismiss

// Responsive Design
- Bottom sheet on mobile
- Larger touch targets (44px min)
- Simplified inline form
- Stack duration buttons vertically

// Performance
- Reduce animations
- Lazy load components
- Virtual scrolling for clients
```

## Future Enhancements

1. **Voice Input**: "Schedule John Doe tomorrow at 2pm for 60 minutes"
2. **Drag & Drop**: Drag to create, drag to reschedule
3. **Templates**: Save common appointment types
4. **Bulk Operations**: Create multiple appointments
5. **Calendar Sync**: Preview Google Calendar conflicts
6. **Smart Scheduling**: AI suggests best time slots
7. **Recurring Appointments**: Quick create recurring
8. **Multi-client Sessions**: Group training sessions
