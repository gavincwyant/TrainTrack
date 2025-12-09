# Quick Start Guide: Quick Create System

Get up and running with the quick create system in 5 minutes.

## Step 1: Import Components

```tsx
import {
  QuickCreatePopover,
  CalendarContextMenu,
  AppointmentCreateData
} from './components/EventCreation'
```

## Step 2: Add State Management

```tsx
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
```

## Step 3: Add Click Handlers

```tsx
// Single-click on empty slot → Quick create popover
const handleSlotClick = (e: React.MouseEvent, slot: TimeSlot) => {
  if (slot.isEmpty) {
    setQuickCreate({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      slot: { start: slot.start, end: slot.end }
    })
  }
}

// Right-click → Context menu
const handleContextMenu = (e: React.MouseEvent, target: TimeSlot | CalendarEvent) => {
  e.preventDefault()
  setContextMenu({
    isOpen: true,
    position: { x: e.clientX, y: e.clientY },
    target: { type: 'isEmpty' in target ? 'slot' : 'event', data: target }
  })
}
```

## Step 4: Add Submit Handler

```tsx
const handleCreateAppointment = async (data: AppointmentCreateData) => {
  // Optimistic UI
  const tempId = `temp-${Date.now()}`
  const optimisticEvent = {
    id: tempId,
    _tempId: tempId,
    _pending: true,
    startTime: data.startTime,
    endTime: data.endTime,
    clientId: data.clientId,
    // ... other fields
  }

  setEvents(prev => [...prev, optimisticEvent])

  try {
    const response = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: data.clientId,
        startTime: data.startTime.toISOString(),
        endTime: data.endTime.toISOString()
      })
    })

    const result = await response.json()

    // Replace temp with real
    setEvents(prev => prev.map(e =>
      e._tempId === tempId ? result.appointment : e
    ))
  } catch (error) {
    // Remove on error
    setEvents(prev => prev.filter(e => e._tempId !== tempId))
    throw error
  }
}
```

## Step 5: Add Components to Render

```tsx
return (
  <div className="calendar">
    {/* Your calendar grid with click handlers */}
    <div
      onClick={(e) => handleSlotClick(e, slot)}
      onContextMenu={(e) => handleContextMenu(e, slot)}
    >
      {/* Slot content */}
    </div>

    {/* Quick create popover */}
    <QuickCreatePopover
      isOpen={quickCreate.isOpen}
      position={quickCreate.position}
      slot={quickCreate.slot}
      onClose={() => setQuickCreate(prev => ({ ...prev, isOpen: false }))}
      onSubmit={handleCreateAppointment}
    />

    {/* Context menu */}
    <CalendarContextMenu
      isOpen={contextMenu.isOpen}
      position={contextMenu.position}
      target={contextMenu.target}
      onAction={handleContextMenuAction}
      onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
    />
  </div>
)
```

## That's It!

You now have:
- ✅ Single-click quick create (2-3 clicks)
- ✅ Right-click context menu
- ✅ Smart client suggestions
- ✅ Optimistic UI updates
- ✅ Keyboard navigation
- ✅ Beautiful animations

## Next Steps

1. **Add inline form** (optional): For double-click quick create
2. **Customize durations**: Change preset durations in DurationPicker
3. **Add context menu actions**: Implement block time, complete, etc.
4. **Add keyboard shortcuts**: Use useCalendarKeyboardShortcuts hook
5. **Customize styling**: Match your design system

## Common Issues

### Popover not appearing
- Check z-index values (popover uses z-50)
- Ensure portal is rendering to document.body
- Verify position values are valid

### Smart suggestions not working
- Check that `/api/appointments` returns correct data
- Verify appointment history has `clientId` and timestamps
- Ensure hook is fetching data correctly

### Click outside not closing
- Verify event listeners are attached
- Check for stopPropagation in parent elements
- Add delay to prevent immediate close: `setTimeout(..., 100)`

## Performance Tips

1. **Memoize handlers**: Use `useCallback` for click handlers
2. **Debounce search**: Add debounce to client search
3. **Virtualize lists**: For 100+ clients, use react-window
4. **Optimize re-renders**: Use React.memo for child components

## Support

See [README.md](./README.md) for full documentation and examples.
See [INTEGRATION_EXAMPLE.tsx](./INTEGRATION_EXAMPLE.tsx) for complete working example.
