# Quick Start: Command Palette Integration

Get the command palette running in 5 minutes.

## Step 1: Import Components (30 seconds)

Add to your calendar page:

```tsx
import { useCommandPalette } from './hooks'
import { CommandPalette, AppointmentDrawer } from './components/Shared'
```

## Step 2: Add Hook (1 minute)

```tsx
const {
  isOpen,
  setIsOpen,
  query,
  setQuery,
  results,
  search,
  execute,
  isLoading,
  recentSearches,
} = useCommandPalette({
  onScheduleClient: (clientId) => {
    console.log('Schedule client:', clientId)
    // TODO: Open your appointment modal
  },
  onQuickSchedule: (parsed) => {
    console.log('Quick schedule:', parsed)
    // TODO: Create appointment from parsed data
  },
  onExecuteCommand: (command) => {
    console.log('Execute:', command)
    // TODO: Handle commands (schedule, block, today)
  },
  onApplyFilter: (filter) => {
    console.log('Filter:', filter)
    // TODO: Apply filter to calendar
  },
})
```

## Step 3: Add Search Effect (30 seconds)

```tsx
useEffect(() => {
  search(query)
}, [query, search])
```

## Step 4: Add UI Components (1 minute)

```tsx
return (
  <>
    {/* Your existing calendar */}
    <YourCalendarComponent />

    {/* Command Palette */}
    <CommandPalette
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      query={query}
      onQueryChange={setQuery}
      results={results}
      onExecute={execute}
      isLoading={isLoading}
      recentSearches={recentSearches}
    />
  </>
)
```

## Step 5: Test It! (30 seconds)

1. Press `Cmd + K` (Mac) or `Ctrl + K` (Windows/Linux)
2. Type a client name
3. Press Enter to select
4. Try typing "john 2pm friday"
5. Try single-key shortcuts: C, B, T

## Done! 🎉

You now have:
- ✅ Spotlight-style command palette
- ✅ Fuzzy client search
- ✅ Natural language scheduling
- ✅ Keyboard shortcuts
- ✅ Recent searches

## Next Steps

### Add Appointment Drawer (Optional)

Replace your modal with a drawer:

```tsx
// Add state
const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
const [drawerOpen, setDrawerOpen] = useState(false)

// In your calendar event click handler
onEventClick={(event) => {
  setSelectedEvent(event)
  setDrawerOpen(true)
}}

// Add drawer component
<AppointmentDrawer
  appointment={selectedEvent}
  isOpen={drawerOpen}
  onClose={() => setDrawerOpen(false)}
  onSave={async (updates) => {
    await fetch(`/api/appointments/${updates.id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  }}
  onDelete={async (id) => {
    await fetch(`/api/appointments/${id}`, {
      method: 'DELETE',
    })
  }}
  onStatusChange={async (id, status) => {
    await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  }}
/>
```

### Implement Action Handlers

Fill in the TODO comments in Step 2:

```tsx
onScheduleClient: (clientId) => {
  // Open your existing appointment modal
  setShowAppointmentModal(true)
  setPreselectedClient(clientId)
},

onQuickSchedule: async (parsed) => {
  if (parsed.type === 'schedule') {
    // Create appointment from natural language
    const response = await fetch('/api/appointments', {
      method: 'POST',
      body: JSON.stringify({
        clientName: parsed.client,
        date: parsed.date,
        time: parsed.time,
      }),
    })
    if (response.ok) {
      // Refresh calendar
      refetchAppointments()
    }
  }
},

onExecuteCommand: (command) => {
  switch (command) {
    case 'schedule':
      setShowAppointmentModal(true)
      break
    case 'block':
      setShowBlockTimeModal(true)
      break
    case 'today':
      setCurrentDate(new Date())
      setView('day')
      break
  }
},

onApplyFilter: (filter) => {
  switch (filter) {
    case 'today':
      setFilterToToday()
      break
    case 'week':
      setFilterToWeek()
      break
    case 'completed':
      setStatusFilter('COMPLETED')
      break
  }
},
```

## Troubleshooting

### Command palette not opening?
- Check console for errors
- Verify you're in a client component ("use client")
- Try clicking a button instead: `<button onClick={() => setIsOpen(true)}>Open</button>`

### No search results?
- Check that `/api/clients` endpoint returns data
- Verify clients array has `fullName` and `email` fields
- Console.log the `results` to debug

### Keyboard shortcuts not working?
- Check for browser extension conflicts
- Verify shortcuts aren't prevented by other event handlers
- Test in incognito mode

## Complete Example

See `INTEGRATION_EXAMPLE.tsx` for a full working example with all features.

## Keyboard Shortcuts

Once working, you'll have:

- **Cmd/Ctrl + K**: Toggle command palette
- **C**: Quick create appointment
- **B**: Quick block time
- **T**: Jump to today
- **↑ / ↓**: Navigate results
- **Enter**: Execute
- **Esc**: Close

## What's Next?

After the basic integration works:

1. ✅ Customize command results
2. ✅ Add natural language parsing
3. ✅ Implement Quick Scheduler
4. ✅ Replace modals with drawers
5. ✅ Add inline editing
6. ✅ Test on mobile

## Resources

- 📖 **Full Documentation**: `COMMAND_PALETTE_GUIDE.md`
- 💻 **Complete Example**: `INTEGRATION_EXAMPLE.tsx`
- ⌨️ **Shortcuts**: `KEYBOARD_SHORTCUTS.md`
- 🏗️ **Architecture**: `ARCHITECTURE_DIAGRAM.md`
- 📦 **Components**: `components/Shared/README.md`

## Common Patterns

### Add Custom Command

```tsx
// In useCommandPalette options
const customCommands: CommandResult[] = [
  {
    id: 'custom-export',
    type: 'command',
    title: 'Export Calendar',
    subtitle: 'Download as PDF',
    icon: '📥',
    category: 'Advanced',
    action: () => exportCalendarToPDF(),
  },
]
```

### Add to Default Actions

Modify `getDefaultActions()` in `useCommandPalette.ts` to add your own commands.

### Customize Shortcuts

Modify the `useEffect` keyboard listener in `useCommandPalette.ts`:

```tsx
if (e.key === 'e') {
  // Your custom action
}
```

## Tips

1. **Start Simple**: Just get Cmd+K working first
2. **Console.log**: Log everything to understand the flow
3. **Test Mobile**: Use Chrome DevTools device emulation
4. **Read Examples**: The integration example has working code
5. **Customize Later**: Get it working, then customize

## Support

Stuck? Check:
1. Console errors
2. Network tab (API calls)
3. React DevTools (state)
4. Examples in `INTEGRATION_EXAMPLE.tsx`

Happy coding! 🚀
