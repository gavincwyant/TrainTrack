# Shared Components - Command Palette & Power User Features

This directory contains the command palette system and enhanced modal components for power users.

## Components

### CommandPalette
Spotlight-style universal search and command execution.

**Location**: `CommandPalette.tsx`

**Features**:
- Fuzzy search across clients, actions, and commands
- Keyboard navigation (↑↓, Enter, Esc)
- Natural language parsing
- Recent searches
- Grouped results by category
- Cmd/Ctrl + K to toggle

**Usage**:
```tsx
import { CommandPalette } from './components/Shared'
import { useCommandPalette } from './hooks'

const palette = useCommandPalette({ ... })

<CommandPalette
  isOpen={palette.isOpen}
  onClose={() => palette.setIsOpen(false)}
  query={palette.query}
  onQueryChange={palette.setQuery}
  results={palette.results}
  onExecute={palette.execute}
/>
```

### AppointmentDrawer
Side drawer for viewing and editing appointment details with inline editing.

**Location**: `AppointmentDrawer.tsx`

**Features**:
- Slides from right (desktop) or bottom (mobile)
- Inline editing of fields
- Status management
- Quick actions (complete, cancel, restore)
- Drag to dismiss
- Client information display

**Usage**:
```tsx
import { AppointmentDrawer } from './components/Shared'

<AppointmentDrawer
  appointment={selectedEvent}
  isOpen={drawerOpen}
  onClose={() => setDrawerOpen(false)}
  onSave={handleSave}
  onDelete={handleDelete}
  onStatusChange={handleStatusChange}
/>
```

### SlideOverPanel
Reusable drawer/slide-over component for building custom panels.

**Location**: `SlideOverPanel.tsx`

**Features**:
- Slides from any direction (right, left, top, bottom)
- Spring animations with Framer Motion
- Drag to dismiss
- Focus trap for accessibility
- Portal rendering
- Mobile-optimized (bottom sheet)
- Customizable width
- Header with title and actions

**Usage**:
```tsx
import { SlideOverPanel } from './components/Shared'

<SlideOverPanel
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  position="right"
  title="Panel Title"
  actions={<button>Save</button>}
  width="400px"
>
  <div>Your content here</div>
</SlideOverPanel>
```

### InlineEditField
Click-to-edit field with auto-save and validation.

**Location**: `InlineEditField.tsx`

**Features**:
- Click to edit mode
- Auto-save on blur
- Enter to save, Esc to cancel
- Validation support
- Error handling
- Multiple input types (text, email, date, time, select, textarea)
- Loading states
- Undo support

**Usage**:
```tsx
import { InlineEditField } from './components/Shared'

<InlineEditField
  value={appointment.title}
  onSave={async (value) => {
    await updateAppointment({ title: value })
  }}
  label="Session Type"
  icon="📝"
  placeholder="Enter session type"
  validation={(value) => {
    if (!value) return 'Title is required'
    return null
  }}
/>
```

### QuickScheduler
Natural language appointment scheduler with real-time parsing.

**Location**: `QuickScheduler.tsx`

**Features**:
- Natural language input parsing
- Real-time parsing feedback
- Confidence scoring
- Autocomplete suggestions
- Visual parsing breakdown
- Example prompts
- Supports: dates, times, durations, client names

**Usage**:
```tsx
import { QuickScheduler } from './components/Shared'

<QuickScheduler
  onSchedule={(data) => {
    // data: { clientName?, date, time, duration, type }
    createAppointment(data)
  }}
  onParse={(parsed) => {
    // Optional: show parsing feedback
    console.log(parsed)
  }}
/>
```

**Example Inputs**:
- "john 2pm friday"
- "block lunch tomorrow"
- "jane next monday 60min"
- "sarah 3:30pm today"

## Hooks

### useCommandPalette
Manages command palette state, search, and actions.

**Location**: `../../hooks/useCommandPalette.ts`

**Returns**:
```tsx
{
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  query: string
  setQuery: (query: string) => void
  results: CommandResult[]
  search: (query: string) => Promise<void>
  execute: (result: CommandResult) => void
  isLoading: boolean
  recentSearches: string[]
}
```

### useNaturalLanguageParse
Parses natural language inputs into structured data.

**Location**: `../../hooks/useNaturalLanguageParse.ts`

**Returns**:
```tsx
{
  client?: string
  time?: string
  date?: string
  duration?: string
  action?: 'schedule' | 'block' | 'cancel' | 'view'
  confidence: number
  raw: string
}
```

**Helper Functions**:
- `parseDateString(dateStr: string): Date`
- `parseDuration(durationStr: string): number`

### useInlineEdit
Handles inline editing state and validation.

**Location**: `../../hooks/useInlineEdit.ts`

**Returns**:
```tsx
{
  isEditing: boolean
  value: T
  setValue: (value: T) => void
  isSaving: boolean
  error: string | null
  inputRef: RefObject
  startEdit: () => void
  cancelEdit: () => void
  save: () => Promise<void>
  handleKeyDown: (e: KeyboardEvent) => void
  undo: () => void
}
```

## Keyboard Shortcuts

Global shortcuts (when palette is closed):
- **Cmd/Ctrl + K**: Open command palette
- **C**: Create appointment
- **B**: Block time
- **T**: Jump to today

Command palette shortcuts:
- **↑ / ↓**: Navigate results
- **Enter**: Execute selected result
- **Esc**: Close palette
- **Tab**: Autocomplete (if available)

Inline edit shortcuts:
- **Enter**: Save
- **Esc**: Cancel
- **Click outside**: Save (on blur)

## Mobile Support

All components are fully responsive:

- **CommandPalette**: Full-screen on mobile
- **AppointmentDrawer**: Bottom sheet with drag handle
- **SlideOverPanel**: Automatic bottom sheet mode
- **InlineEditField**: Full-width on mobile
- **QuickScheduler**: Touch-optimized

## Accessibility

- Full keyboard navigation
- Focus trap in modals/drawers
- ARIA labels and roles
- Screen reader announcements
- Escape key to close
- Logical tab order

## Design System

Components use CSS variables for theming:

```css
/* Colors */
--calendar-primary
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
--shadow-xl
--shadow-2xl
--shadow-glow-blue
--shadow-glow-green

/* Borders */
--radius-md
--radius-lg
--radius-xl

/* Text */
--text-primary
--text-secondary
--text-tertiary
```

## Examples

See `INTEGRATION_EXAMPLE.tsx` for complete integration examples.

See `COMMAND_PALETTE_GUIDE.md` for detailed documentation.

## File Structure

```
components/Shared/
├── README.md (this file)
├── index.ts (exports)
├── CommandPalette.tsx
├── AppointmentDrawer.tsx
├── SlideOverPanel.tsx
├── InlineEditField.tsx
└── QuickScheduler.tsx

hooks/
├── useCommandPalette.ts
├── useNaturalLanguageParse.ts
└── useInlineEdit.ts
```

## Quick Start

1. Import the command palette hook and component:
```tsx
import { useCommandPalette } from './hooks'
import { CommandPalette } from './components/Shared'
```

2. Set up the hook:
```tsx
const palette = useCommandPalette({
  onScheduleClient: (id) => { /* ... */ },
  onQuickSchedule: (parsed) => { /* ... */ },
  onExecuteCommand: (cmd) => { /* ... */ },
  onApplyFilter: (filter) => { /* ... */ },
})
```

3. Add the component:
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

4. Press Cmd/Ctrl + K to test!

## Tips

- **Performance**: Command palette searches are debounced automatically
- **Customization**: All components accept custom styles via props
- **Extensions**: Add custom command results to extend functionality
- **Testing**: Use the integration example to test all features
- **Natural Language**: The parser improves with more specific inputs

## Support

For issues or questions, refer to:
- `COMMAND_PALETTE_GUIDE.md` - Complete documentation
- `INTEGRATION_EXAMPLE.tsx` - Working examples
- Component prop types - Full TypeScript support
