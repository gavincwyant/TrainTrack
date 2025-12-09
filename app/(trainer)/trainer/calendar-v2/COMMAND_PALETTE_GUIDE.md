# Command Palette & Power User Features

This guide explains how to integrate and use the Spotlight-style command palette and enhanced modal system for power users.

## Overview

The command palette system includes:

- **CommandPalette**: Spotlight-style universal search with fuzzy matching
- **AppointmentDrawer**: Side drawer for appointment details with inline editing
- **QuickScheduler**: Natural language appointment creation
- **SlideOverPanel**: Reusable drawer component
- **InlineEditField**: Click-to-edit fields with auto-save

## Quick Start

### 1. Add Command Palette to Your Calendar

```tsx
import { useCommandPalette, CommandPalette } from './hooks'

export default function CalendarPage() {
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
      // Open appointment modal for client
      console.log('Schedule for client:', clientId)
    },
    onQuickSchedule: (parsed) => {
      // Handle natural language scheduling
      console.log('Quick schedule:', parsed)
    },
    onExecuteCommand: (command) => {
      // Handle commands (schedule, block, today)
      console.log('Execute:', command)
    },
    onApplyFilter: (filter) => {
      // Apply filter (today, week, completed)
      console.log('Apply filter:', filter)
    },
  })

  // Trigger search when query changes
  useEffect(() => {
    search(query)
  }, [query, search])

  return (
    <>
      {/* Your calendar UI */}
      <CalendarView />

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
}
```

### 2. Replace Modal with AppointmentDrawer

```tsx
import { AppointmentDrawer } from './components/Shared'

function Calendar() {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <CalendarView
        onEventClick={(event) => {
          setSelectedEvent(event)
          setDrawerOpen(true)
        }}
      />

      <AppointmentDrawer
        appointment={selectedEvent}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSave={async (updates) => {
          // Update appointment
          await fetch(`/api/appointments/${updates.id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
          })
        }}
        onDelete={async (id) => {
          // Delete appointment
          await fetch(`/api/appointments/${id}`, {
            method: 'DELETE',
          })
        }}
        onStatusChange={async (id, status) => {
          // Update status
          await fetch(`/api/appointments/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
          })
        }}
      />
    </>
  )
}
```

## Keyboard Shortcuts

The command palette automatically registers these global shortcuts:

- **Cmd/Ctrl + K**: Toggle command palette
- **C**: Quick create appointment (when palette closed)
- **B**: Quick block time (when palette closed)
- **T**: Jump to today (when palette closed)

When palette is open:
- **↑ / ↓**: Navigate results
- **Enter**: Execute selected result
- **Esc**: Close palette

## Natural Language Parsing

The QuickScheduler supports natural language inputs:

### Examples

- `"john 2pm friday"` → Schedules John Doe at 2 PM next Friday
- `"block lunch tomorrow"` → Blocks 12-1 PM tomorrow
- `"jane next monday 60min"` → Schedules Jane next Monday, 60 minutes
- `"sarah 3:30pm today"` → Schedules Sarah at 3:30 PM today

### Supported Patterns

**Client names**: Any text at the start (fuzzy matched against your clients)
**Times**: 2pm, 14:00, 2:30, 3:30pm
**Dates**: today, tomorrow, monday, next week, Dec 15, 12/15
**Durations**: 30min, 1hr, 60 minutes, 90min
**Actions**: schedule, block, cancel

## Components

### CommandPalette

Spotlight-style command palette with fuzzy search.

**Props**:
```tsx
interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  query: string
  onQueryChange: (query: string) => void
  results: CommandResult[]
  onExecute: (result: CommandResult) => void
  isLoading?: boolean
  recentSearches?: string[]
}
```

**Features**:
- Fuzzy search across clients and commands
- Keyboard navigation
- Recent searches
- Grouped results by category
- Natural language parsing

### AppointmentDrawer

Side drawer for viewing and editing appointment details.

**Props**:
```tsx
interface AppointmentDrawerProps {
  appointment: CalendarEvent | null
  isOpen: boolean
  onClose: () => void
  onSave?: (appointment: Partial<CalendarEvent>) => Promise<void>
  onDelete?: (appointmentId: string) => Promise<void>
  onStatusChange?: (appointmentId: string, status: AppointmentStatus) => Promise<void>
}
```

**Features**:
- Inline editing of fields
- Status management (complete, cancel, restore)
- Client information display
- Quick actions
- Responsive (drawer on desktop, bottom sheet on mobile)

### SlideOverPanel

Reusable drawer component for building custom panels.

**Props**:
```tsx
interface SlideOverPanelProps {
  isOpen: boolean
  onClose: () => void
  position?: 'right' | 'left' | 'top' | 'bottom'
  children: React.ReactNode
  title?: string
  actions?: React.ReactNode
  width?: string
  allowDragClose?: boolean
  showBackdrop?: boolean
}
```

**Features**:
- Slides from any direction
- Spring animations
- Drag to dismiss
- Focus trap
- Portal rendering
- Mobile-optimized (full-screen with bottom sheet)

### InlineEditField

Click-to-edit field with auto-save.

**Props**:
```tsx
interface InlineEditFieldProps<T = string> {
  value: T
  onSave: (value: T) => Promise<void>
  type?: 'text' | 'email' | 'date' | 'time' | 'select' | 'textarea' | 'number'
  label: string
  placeholder?: string
  validation?: (value: T) => string | null
  options?: { value: string; label: string }[]
  multiline?: boolean
  disabled?: boolean
  icon?: React.ReactNode
}
```

**Features**:
- Click to edit
- Auto-save on blur
- Enter to save, Esc to cancel
- Validation support
- Error handling
- Multiple input types

### QuickScheduler

Natural language appointment scheduler.

**Props**:
```tsx
interface QuickSchedulerProps {
  onSchedule: (data: ScheduleData) => void
  onParse?: (parsed: ParsedScheduleData) => void
}
```

**Features**:
- Real-time parsing feedback
- Confidence scoring
- Autocomplete suggestions
- Visual parsing breakdown
- Example prompts

## Hooks

### useCommandPalette

Manages command palette state and actions.

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
  onScheduleClient: (clientId) => void,
  onQuickSchedule: (parsed) => void,
  onExecuteCommand: (command) => void,
  onApplyFilter: (filter) => void,
})
```

### useNaturalLanguageParse

Parses natural language inputs into structured data.

```tsx
const parsed = useNaturalLanguageParse(input)
// Returns: { client, time, date, duration, action, confidence }
```

Helper functions:
- `parseDateString(dateStr: string): Date` - Converts date strings to Date objects
- `parseDuration(durationStr: string): number` - Converts duration to minutes

### useInlineEdit

Handles inline editing state.

```tsx
const {
  isEditing,
  value,
  setValue,
  isSaving,
  error,
  inputRef,
  startEdit,
  cancelEdit,
  save,
  handleKeyDown,
  undo,
} = useInlineEdit({
  initialValue: 'John Doe',
  onSave: async (value) => {
    await updateClient(value)
  },
  validate: (value) => {
    if (!value) return 'Name is required'
    return null
  },
})
```

## Mobile Adaptations

### Command Palette
- Full-screen on mobile
- Touch-optimized results (48px tall)
- Virtual keyboard friendly
- Swipe down to dismiss

### Drawers
- Bottom sheet on mobile (slides from bottom)
- Drag handle for dismissal
- Full-width inputs
- Sticky header with actions

### Inline Edit
- Larger touch targets
- Full-width inputs on mobile
- Virtual keyboard optimized

## Accessibility

All components follow accessibility best practices:

- **Focus Management**: Focus trap in modals/drawers
- **Keyboard Navigation**: Full keyboard support
- **ARIA Labels**: Proper roles and labels
- **Screen Readers**: Announce state changes
- **Escape Key**: Always closes topmost panel
- **Tab Navigation**: Logical tab order

## Design Tokens

Components use CSS variables from your design system:

```css
/* Colors */
--calendar-primary
--calendar-primary-light
--calendar-primary-dark
--calendar-success
--calendar-warning
--calendar-danger
--calendar-neutral

/* Backgrounds */
--calendar-bg-primary
--calendar-bg-secondary
--calendar-bg-tertiary
--calendar-bg-hover
--calendar-bg-selected

/* Shadows */
--shadow-sm
--shadow-md
--shadow-lg
--shadow-xl
--shadow-2xl

/* Radius */
--radius-xs
--radius-sm
--radius-md
--radius-lg
--radius-xl
--radius-2xl

/* Timing */
--timing-fast (180ms)
--timing-normal (250ms)
--timing-slow (350ms)

/* Easing */
--ease-standard
--ease-spring
```

## Advanced Usage

### Custom Command Results

Add custom commands to the palette:

```tsx
const customCommands: CommandResult[] = [
  {
    id: 'export-calendar',
    type: 'command',
    title: 'Export calendar',
    subtitle: 'Download as PDF',
    icon: '📥',
    category: 'Advanced',
    action: () => exportCalendar(),
  },
  {
    id: 'sync-google',
    type: 'command',
    title: 'Sync with Google Calendar',
    subtitle: 'Two-way sync',
    icon: '🔄',
    category: 'Advanced',
    shortcut: 'S',
    action: () => syncWithGoogle(),
  },
]
```

### Custom Drawer Panels

Use SlideOverPanel to create custom drawers:

```tsx
<SlideOverPanel
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  position="right"
  title="Client Details"
  actions={
    <button onClick={handleSave}>Save</button>
  }
>
  <div>
    <InlineEditField
      value={client.name}
      onSave={async (name) => {
        await updateClient({ name })
      }}
      label="Client Name"
    />
    {/* More fields... */}
  </div>
</SlideOverPanel>
```

### Natural Language Extensions

Extend the natural language parser:

```tsx
const parsed = useNaturalLanguageParse(input)

// Custom parsing logic
if (input.includes('repeat')) {
  // Handle recurring appointments
}

if (input.includes('with notes')) {
  // Extract notes
}
```

## Performance Tips

1. **Lazy Load**: Import command palette components only when needed
2. **Debounce Search**: The hook handles this automatically
3. **Virtual Lists**: For large result sets, consider virtualization
4. **Memoize Results**: Cache search results for common queries
5. **Optimistic Updates**: Use optimistic UI updates in drawers

## Troubleshooting

### Command palette not opening
- Check that Cmd/Ctrl + K isn't intercepted by another handler
- Verify the hook is called in a client component

### Drawer not closing on mobile
- Ensure touch events aren't prevented
- Check that backdrop is clickable

### Natural language parsing low confidence
- Add more context (date + time)
- Use supported date formats
- Check client names match database

### Inline edit not saving
- Check network errors in console
- Verify onSave handler is async
- Add error handling

## Examples

See the integration example in `/Users/gavinwyant/SIDE_PROJECTS/train/app/(trainer)/trainer/calendar-v2/INTEGRATION_EXAMPLE.tsx`
