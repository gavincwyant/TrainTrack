# Command Palette & Enhanced Modal System

> Spotlight-style command palette and power user features for the premium calendar

## What This Is

A complete command palette system that makes your calendar feel like a professional productivity tool. Press Cmd+K and search for anything, schedule appointments with natural language, and manage everything without touching your mouse.

## Quick Links

- **🚀 [Quick Start](./QUICK_START_COMMAND_PALETTE.md)** - Get running in 5 minutes
- **📖 [Complete Guide](./COMMAND_PALETTE_GUIDE.md)** - Full documentation
- **💻 [Integration Example](./INTEGRATION_EXAMPLE.tsx)** - Working code examples
- **⌨️ [Keyboard Shortcuts](./KEYBOARD_SHORTCUTS.md)** - All shortcuts reference
- **🏗️ [Architecture](./ARCHITECTURE_DIAGRAM.md)** - How it all connects
- **📦 [Component Docs](./components/Shared/README.md)** - Component reference
- **📋 [Summary](./PHASE_2_COMMAND_PALETTE_SUMMARY.md)** - What was built

## Features

### Command Palette (Cmd+K)
- Fuzzy search across clients and commands
- Natural language scheduling ("john 2pm friday")
- Keyboard navigation (↑↓, Enter, Esc)
- Recent searches with persistence
- Grouped results by category
- Loading states and feedback

### Appointment Drawer
- Slide-in drawer (replaces modal)
- Inline editing of all fields
- Status management (complete, cancel, restore)
- Quick actions
- Mobile-optimized (bottom sheet)
- Drag to dismiss

### Natural Language Parsing
- Date parsing: "today", "tomorrow", "next monday", "Dec 15"
- Time parsing: "2pm", "14:00", "3:30pm"
- Duration: "30min", "1hr", "90 minutes"
- Client names: Fuzzy matched from database
- Actions: schedule, block, cancel
- Confidence scoring

### Keyboard Shortcuts
- **Cmd/Ctrl + K**: Toggle command palette
- **C**: Create appointment
- **B**: Block time
- **T**: Jump to today
- **↑ / ↓**: Navigate results
- **Enter**: Execute action
- **Esc**: Close

## Files Created

### Components (6 files)
```
components/Shared/
├── CommandPalette.tsx        - Spotlight-style search UI
├── AppointmentDrawer.tsx     - Enhanced appointment details
├── SlideOverPanel.tsx        - Reusable drawer component
├── InlineEditField.tsx       - Click-to-edit fields
├── QuickScheduler.tsx        - Natural language scheduler
├── index.ts                  - Barrel exports
└── README.md                 - Component documentation
```

### Hooks (3 files)
```
hooks/
├── useCommandPalette.ts      - Command palette state & shortcuts
├── useNaturalLanguageParse.ts - NLP for scheduling
├── useInlineEdit.ts          - Inline editing state
└── index.ts                  - Updated with new exports
```

### Documentation (7 files)
```
├── QUICK_START_COMMAND_PALETTE.md  - 5-minute setup guide
├── COMMAND_PALETTE_GUIDE.md        - Complete documentation
├── INTEGRATION_EXAMPLE.tsx         - Working examples
├── KEYBOARD_SHORTCUTS.md           - Shortcuts reference
├── ARCHITECTURE_DIAGRAM.md         - System architecture
├── PHASE_2_COMMAND_PALETTE_SUMMARY.md - Build summary
└── README_COMMAND_PALETTE.md       - This file
```

## Installation

No installation needed! All dependencies are already in your project:
- ✅ React 18+
- ✅ Framer Motion 11+
- ✅ TypeScript
- ✅ Next.js 14+

## Quick Start

1. **Import the hook and component**:
```tsx
import { useCommandPalette } from './hooks'
import { CommandPalette } from './components/Shared'
```

2. **Set up the hook**:
```tsx
const palette = useCommandPalette({
  onScheduleClient: (id) => { /* ... */ },
  onQuickSchedule: (parsed) => { /* ... */ },
  onExecuteCommand: (cmd) => { /* ... */ },
  onApplyFilter: (filter) => { /* ... */ },
})
```

3. **Add search effect**:
```tsx
useEffect(() => {
  palette.search(palette.query)
}, [palette.query])
```

4. **Render the component**:
```tsx
<CommandPalette
  isOpen={palette.isOpen}
  onClose={() => palette.setIsOpen(false)}
  query={palette.query}
  onQueryChange={palette.setQuery}
  results={palette.results}
  onExecute={palette.execute}
/>
```

5. **Press Cmd+K to test!**

See [QUICK_START_COMMAND_PALETTE.md](./QUICK_START_COMMAND_PALETTE.md) for complete setup.

## Usage Examples

### Basic Command Palette

```tsx
const palette = useCommandPalette({ /* handlers */ })

return (
  <>
    <YourCalendar />
    <CommandPalette {...palette} />
  </>
)
```

### With Appointment Drawer

```tsx
const [selectedEvent, setSelectedEvent] = useState(null)
const [drawerOpen, setDrawerOpen] = useState(false)

return (
  <>
    <Calendar onEventClick={(e) => {
      setSelectedEvent(e)
      setDrawerOpen(true)
    }} />

    <AppointmentDrawer
      appointment={selectedEvent}
      isOpen={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      onSave={handleSave}
      onDelete={handleDelete}
    />
  </>
)
```

### Natural Language Scheduling

```tsx
<QuickScheduler
  onSchedule={(data) => {
    // data: { clientName?, date, time, duration, type }
    createAppointment(data)
  }}
/>
```

Type: "john 2pm friday" → Schedules John at 2 PM next Friday

### Custom Drawer Panel

```tsx
<SlideOverPanel
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Settings"
  position="right"
>
  <YourContent />
</SlideOverPanel>
```

See [INTEGRATION_EXAMPLE.tsx](./INTEGRATION_EXAMPLE.tsx) for complete working examples.

## Components

### CommandPalette
Universal search and command execution. Supports fuzzy search, keyboard navigation, and natural language.

### AppointmentDrawer
Enhanced appointment details with inline editing and status management. Replaces traditional modals.

### SlideOverPanel
Reusable drawer component. Slides from any direction, focus trap, drag to dismiss.

### InlineEditField
Click-to-edit fields with validation, auto-save, and error handling.

### QuickScheduler
Natural language appointment scheduler with real-time parsing feedback.

See [components/Shared/README.md](./components/Shared/README.md) for detailed component docs.

## Hooks

### useCommandPalette
Manages command palette state, search, keyboard shortcuts, and action routing.

### useNaturalLanguageParse
Parses natural language into structured appointment data with confidence scoring.

### useInlineEdit
Handles inline editing state with validation, auto-save, and undo support.

See [COMMAND_PALETTE_GUIDE.md](./COMMAND_PALETTE_GUIDE.md) for hook documentation.

## Architecture

```
Calendar Page
    │
    ├── CommandPalette (Cmd+K)
    │   ├── useCommandPalette
    │   ├── QuickScheduler
    │   └── useNaturalLanguageParse
    │
    └── AppointmentDrawer
        ├── SlideOverPanel
        ├── InlineEditField
        └── useInlineEdit
```

See [ARCHITECTURE_DIAGRAM.md](./ARCHITECTURE_DIAGRAM.md) for detailed architecture.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Toggle command palette |
| `C` | Create appointment |
| `B` | Block time |
| `T` | Jump to today |
| `↑ / ↓` | Navigate results |
| `Enter` | Execute action |
| `Esc` | Close |

See [KEYBOARD_SHORTCUTS.md](./KEYBOARD_SHORTCUTS.md) for complete reference.

## Mobile Support

All components are fully responsive:
- Command palette: Full-screen on mobile
- Drawers: Bottom sheet with drag handle
- Touch-optimized (48px minimum targets)
- Virtual keyboard friendly
- Swipe gestures

## Accessibility

- Full keyboard navigation
- Focus trap in modals/drawers
- ARIA labels and roles
- Screen reader support
- Visible focus indicators
- Logical tab order

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

## Performance

- Debounced search
- Lazy rendering
- Portal rendering
- Memoized results
- Optimistic updates
- ~35KB gzipped total

## Customization

All components use CSS variables from your design system:
- Colors: `--calendar-primary`, `--calendar-success`, etc.
- Backgrounds: `--calendar-bg-primary`, `--calendar-bg-hover`
- Shadows: `--shadow-xl`, `--shadow-2xl`
- Borders: `--radius-md`, `--radius-lg`

## Testing

See checklist in [PHASE_2_COMMAND_PALETTE_SUMMARY.md](./PHASE_2_COMMAND_PALETTE_SUMMARY.md).

## Troubleshooting

### Command palette not opening
- Check for keyboard shortcut conflicts
- Verify component is mounted
- Test in incognito mode

### No search results
- Check API endpoint returns data
- Verify client data structure
- Console.log results array

### Drawer not closing
- Ensure backdrop is clickable
- Check for event.preventDefault() conflicts
- Verify onClose handler is called

See [COMMAND_PALETTE_GUIDE.md](./COMMAND_PALETTE_GUIDE.md) for more troubleshooting.

## What's Next

After basic integration:
1. Customize command results
2. Add more natural language patterns
3. Implement Quick Scheduler
4. Replace all modals with drawers
5. Add custom keyboard shortcuts
6. Test on mobile devices

## Support

Need help? Check these resources in order:

1. **Quick Start** - Get it running first
2. **Integration Example** - See working code
3. **Command Palette Guide** - Complete docs
4. **Architecture Diagram** - Understand the flow
5. **Component README** - Component details

## Summary

This system provides:
- ✅ Spotlight-style command palette
- ✅ Natural language scheduling
- ✅ Enhanced drawers with inline editing
- ✅ Full keyboard navigation
- ✅ Mobile responsive
- ✅ Accessible
- ✅ Well documented
- ✅ Easy to integrate

Built to make power users feel superhuman! 🚀

---

**Start Here**: [QUICK_START_COMMAND_PALETTE.md](./QUICK_START_COMMAND_PALETTE.md)

**Questions?** See [COMMAND_PALETTE_GUIDE.md](./COMMAND_PALETTE_GUIDE.md)
