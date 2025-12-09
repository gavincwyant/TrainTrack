# Quick Create System

Reduce appointment creation from 7 clicks to 2-3 clicks with smart defaults and inline editing.

## Components

### 1. QuickCreatePopover

Lightweight popover that appears near the clicked time slot.

**Features:**
- Appears at cursor position
- Auto-focus client selector with type-ahead search
- Pre-filled date/time from clicked slot
- Smart client suggestions (pattern matching, overdue, recent)
- Enter to submit, Escape to close
- Optimistic UI updates
- Smooth animations with Framer Motion

**Usage:**
```tsx
import { QuickCreatePopover } from './components/EventCreation'

const [popoverState, setPopoverState] = useState({
  isOpen: false,
  position: { x: 0, y: 0 },
  slot: { start: new Date(), end: new Date() }
})

const handleSlotClick = (e: React.MouseEvent, slot: TimeSlot) => {
  setPopoverState({
    isOpen: true,
    position: { x: e.clientX, y: e.clientY },
    slot: { start: slot.start, end: slot.end }
  })
}

const handleSubmit = async (data: AppointmentCreateData) => {
  // Create optimistic event
  const tempEvent = {
    id: `temp-${Date.now()}`,
    _pending: true,
    ...data
  }

  // Add to calendar immediately
  setEvents(prev => [...prev, tempEvent])

  // Call API
  const response = await fetch('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(data)
  })

  const result = await response.json()

  // Replace temp with real
  setEvents(prev => prev.map(e =>
    e.id === tempEvent.id ? result.appointment : e
  ))
}

<QuickCreatePopover
  isOpen={popoverState.isOpen}
  position={popoverState.position}
  slot={popoverState.slot}
  onClose={() => setPopoverState(prev => ({ ...prev, isOpen: false }))}
  onSubmit={handleSubmit}
/>
```

### 2. QuickCreateInlineForm

Inline form that appears directly on the calendar grid.

**Features:**
- Appears in time slot itself
- Compact single-line form
- Client dropdown + duration quick buttons
- Tab navigation, Enter to submit
- Matches calendar visual style

**Usage:**
```tsx
import { QuickCreateInlineForm } from './components/EventCreation'

const [inlineFormSlot, setInlineFormSlot] = useState<TimeSlot | null>(null)

const handleSlotDoubleClick = (slot: TimeSlot) => {
  setInlineFormSlot(slot)
}

{inlineFormSlot && (
  <QuickCreateInlineForm
    slot={inlineFormSlot}
    clients={clients}
    onSubmit={handleSubmit}
    onCancel={() => setInlineFormSlot(null)}
  />
)}
```

### 3. CalendarContextMenu

Right-click context menu for slots and events.

**Features:**
- Different menus for empty slots vs events
- Keyboard navigation (arrow keys)
- Portal rendering (above everything)
- Click outside to close
- Fully accessible (ARIA)

**Usage:**
```tsx
import { CalendarContextMenu } from './components/EventCreation'

const [contextMenu, setContextMenu] = useState({
  isOpen: false,
  position: { x: 0, y: 0 },
  target: null
})

const handleContextMenu = (e: React.MouseEvent, target: TimeSlot | CalendarEvent) => {
  e.preventDefault()

  setContextMenu({
    isOpen: true,
    position: { x: e.clientX, y: e.clientY },
    target: {
      type: target.type === 'slot' ? 'slot' : 'event',
      data: target
    }
  })
}

const handleMenuAction = (action, target) => {
  switch (action) {
    case 'schedule':
      // Open quick create popover
      break
    case 'block':
      // Block time slot
      break
    case 'complete':
      // Mark appointment complete
      break
    case 'edit':
      // Open edit modal
      break
    case 'delete':
      // Delete appointment
      break
    case 'cancel':
      // Cancel appointment
      break
  }
}

<CalendarContextMenu
  isOpen={contextMenu.isOpen}
  position={contextMenu.position}
  target={contextMenu.target}
  onAction={handleMenuAction}
  onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
/>
```

### 4. SmartClientSelector

Intelligent client selector with suggestions.

**Suggestion Logic:**
1. **Pattern Matching**: Clients who usually book at this day/time
2. **Overdue**: Clients who haven't had a session in X days (based on typical frequency)
3. **Recent**: Recently added clients (last 30 days)

**Features:**
- Fuzzy search
- Keyboard navigation
- Shows avatar and last session
- Highlights suggested clients
- Fast rendering (virtualized for 100+ clients)

**Usage:**
```tsx
import { SmartClientSelector } from './components/EventCreation'
import { useSmartDefaults } from '../../hooks/useSmartDefaults'

const { suggestedClients, isLoading } = useSmartDefaults({
  date: selectedDate,
  time: '14:00'
})

<SmartClientSelector
  onSelect={(client) => console.log('Selected:', client)}
  currentDate={selectedDate}
  currentTime="14:00"
  autoFocus={true}
  suggestedClients={suggestedClients}
/>
```

### 5. DurationPicker

Quick duration selector with presets.

**Features:**
- Button group with active state
- Remembers last-used per client
- Custom dropdown for odd durations
- Keyboard shortcuts (1, 2, 3 for presets)

**Usage:**
```tsx
import { DurationPicker } from './components/EventCreation'

const [duration, setDuration] = useState(60)

<DurationPicker
  value={duration}
  onChange={setDuration}
  clientId={selectedClient?.id}
  presets={[30, 60, 90]}
/>
```

## Smart Defaults Hook

### useSmartDefaults

Hook that provides intelligent defaults based on appointment history.

**Features:**
- Analyzes past appointments for patterns
- Finds clients who typically book at specific day/time
- Detects overdue clients
- Suggests typical duration per client
- Returns loading state

**Usage:**
```tsx
import { useSmartDefaults } from '../../hooks/useSmartDefaults'

const {
  suggestedClients,
  suggestedDuration,
  suggestedType,
  isLoading
} = useSmartDefaults({
  date: new Date(),
  time: '14:00',
  clientId: selectedClient?.id
})

// Use suggestions in your form
```

## Integration Example

Replace the old 7-click flow with the new quick create:

```tsx
'use client'

import { useState } from 'react'
import { QuickCreatePopover, CalendarContextMenu } from './components/EventCreation'
import { CalendarEvent, TimeSlot } from './types/calendar'

export default function CalendarV2() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [quickCreate, setQuickCreate] = useState({
    isOpen: false,
    position: { x: 0, y: 0 },
    slot: null
  })
  const [contextMenu, setContextMenu] = useState({
    isOpen: false,
    position: { x: 0, y: 0 },
    target: null
  })

  // Left-click: Quick create popover
  const handleSlotClick = (e: React.MouseEvent, slot: TimeSlot) => {
    if (slot.isEmpty) {
      setQuickCreate({
        isOpen: true,
        position: { x: e.clientX, y: e.clientY },
        slot: { start: slot.start, end: slot.end }
      })
    }
  }

  // Right-click: Context menu
  const handleContextMenu = (e: React.MouseEvent, target: TimeSlot | CalendarEvent) => {
    e.preventDefault()
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      target: {
        type: 'isEmpty' in target ? 'slot' : 'event',
        data: target
      }
    })
  }

  // Submit handler with optimistic UI
  const handleQuickCreate = async (data: AppointmentCreateData) => {
    // 1. Create temp event with optimistic UI
    const tempId = `temp-${Date.now()}`
    const tempEvent: CalendarEvent = {
      id: tempId,
      _tempId: tempId,
      _pending: true,
      title: 'Creating...',
      startTime: data.startTime,
      endTime: data.endTime,
      clientId: data.clientId,
      clientName: '...',
      type: 'appointment',
      status: 'SCHEDULED'
    }

    setEvents(prev => [...prev, tempEvent])

    // 2. Call API
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) throw new Error('Failed to create')

      const result = await response.json()

      // 3. Replace temp with real event
      setEvents(prev => prev.map(e =>
        e._tempId === tempId ? {
          id: result.appointment.id,
          title: result.appointment.client.fullName,
          startTime: new Date(result.appointment.startTime),
          endTime: new Date(result.appointment.endTime),
          clientId: result.appointment.clientId,
          clientName: result.appointment.client.fullName,
          clientEmail: result.appointment.client.email,
          type: 'appointment',
          status: result.appointment.status
        } : e
      ))

      // Show success toast
      showToast('Appointment created!', 'success')
    } catch (error) {
      // Remove temp event on error
      setEvents(prev => prev.filter(e => e._tempId !== tempId))
      showToast('Failed to create appointment', 'error')
      throw error
    }
  }

  return (
    <div className="calendar-container">
      {/* Calendar Grid */}
      <div className="calendar-grid">
        {slots.map(slot => (
          <div
            key={slot.id}
            onClick={(e) => handleSlotClick(e, slot)}
            onContextMenu={(e) => handleContextMenu(e, slot)}
            className="time-slot"
          >
            {/* Slot content */}
          </div>
        ))}
      </div>

      {/* Quick Create Popover */}
      <QuickCreatePopover
        isOpen={quickCreate.isOpen}
        position={quickCreate.position}
        slot={quickCreate.slot}
        onClose={() => setQuickCreate(prev => ({ ...prev, isOpen: false }))}
        onSubmit={handleQuickCreate}
      />

      {/* Context Menu */}
      <CalendarContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        target={contextMenu.target}
        onAction={handleContextMenuAction}
        onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}
```

## Performance Considerations

1. **Optimistic UI**: Show events immediately, update after API response
2. **Debounced Search**: SmartClientSelector uses debounced search for large client lists
3. **Portal Rendering**: Popover and context menu use portals to avoid z-index issues
4. **Virtualization**: For 100+ clients, consider using react-window
5. **Memoization**: Components use useMemo for expensive computations

## Accessibility

- All components support keyboard navigation
- ARIA labels and roles for screen readers
- Focus management (auto-focus on open)
- Keyboard shortcuts with visible hints
- High contrast mode support
- Respects prefers-reduced-motion

## Mobile Support

- Touch-friendly larger hit areas
- Bottom sheet variant for mobile (optional)
- Swipe gestures (optional)
- Responsive sizing
- Portrait/landscape support

## Animation Details

- **Entry/Exit**: 200ms spring easing
- **Hover**: 180ms standard easing
- **Tap**: 100ms instant feedback
- All animations respect prefers-reduced-motion
- Smooth transitions with Framer Motion

## Future Enhancements

- [ ] Drag-and-drop appointment creation
- [ ] Multi-client group sessions
- [ ] Recurring appointment quick create
- [ ] Template-based scheduling
- [ ] Voice input for client search
- [ ] Calendar sync preview
- [ ] Conflict resolution UI
- [ ] Bulk operations
