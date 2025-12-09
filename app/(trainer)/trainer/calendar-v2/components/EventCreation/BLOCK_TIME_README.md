# Smart Time Blocking System - Phase 2

This system reduces time blocking from **6 clicks to 1 click** using templates and drag gestures.

## Overview

The smart time blocking system consists of:
- **Templates**: Pre-configured blocked time patterns (e.g., "Lunch Break")
- **Drag-to-Block**: Shift+Drag or Long-press+Drag to block time
- **Quick Menu**: One-click preset selection after dragging
- **Recurring Blocks**: Visual calendar picker for recurring blocks

## Components

### 1. BlockTimeTemplates

Displays saved templates in a card-based layout with one-click application.

```tsx
import { BlockTimeTemplates } from '@/app/(trainer)/trainer/calendar-v2/components/EventCreation'
import { useBlockTimeTemplates } from '@/app/(trainer)/trainer/calendar-v2/hooks'

function MyCalendar() {
  const { templates, applyTemplate, deleteTemplate } = useBlockTimeTemplates()
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)

  return (
    <BlockTimeTemplates
      templates={templates}
      onApply={async (templateId, weeks) => {
        await applyTemplate(templateId, new Date(), weeks)
        // Refresh calendar data
      }}
      onEdit={(template) => {
        setEditingTemplate(template)
        setShowTemplateManager(true)
      }}
      onDelete={async (templateId) => {
        await deleteTemplate(templateId)
      }}
      onCreate={() => {
        setEditingTemplate(null)
        setShowTemplateManager(true)
      }}
    />
  )
}
```

**Default Templates** (created automatically):
- 💼 Lunch Break - Mon-Fri, 12:00-1:00 PM
- 🏃 Morning Workout - Mon/Wed/Fri, 6:00-7:00 AM
- 📋 Admin Time - Fridays, 4:00-5:00 PM
- 🏖️ Weekend Block - Sat-Sun, All Day

### 2. TemplateManager

Modal for creating and editing templates.

```tsx
import { TemplateManager } from '@/app/(trainer)/trainer/calendar-v2/components/EventCreation'

<AnimatePresence>
  {showTemplateManager && (
    <TemplateManager
      template={editingTemplate}
      mode={editingTemplate ? 'edit' : 'create'}
      onSave={async (templateData) => {
        if (editingTemplate) {
          await updateTemplate(editingTemplate.id, templateData)
        } else {
          await createTemplate(templateData)
        }
        setShowTemplateManager(false)
      }}
      onCancel={() => setShowTemplateManager(false)}
    />
  )}
</AnimatePresence>
```

**Features**:
- Visual day selector (Mon-Sun buttons)
- Emoji icon picker
- Time pickers with 15-minute intervals
- Recurrence options (one-time, weekly, custom)

### 3. Drag-to-Block

Enable drag-to-block on your calendar grid.

```tsx
import { useDragToBlock } from '@/app/(trainer)/trainer/calendar-v2/hooks'
import { DragToBlockOverlay, BlockTimeQuickMenu } from '@/app/(trainer)/trainer/calendar-v2/components/EventCreation'

function CalendarGrid() {
  const {
    isDragging,
    dragSelection,
    showQuickMenu,
    handlers,
    confirmSelection,
    cancelSelection
  } = useDragToBlock(true, () => {
    // Refresh calendar after blocking
    refreshCalendar()
  })

  return (
    <div>
      {/* Your calendar grid */}
      {slots.map((slot) => (
        <div
          key={slot.id}
          data-time-slot={slot.date.toISOString()}
          onMouseDown={(e) => handlers.onMouseDown(e, slot.date)}
          onMouseMove={(e) => handlers.onMouseMove(e, slot.date)}
          onMouseUp={handlers.onMouseUp}
          onTouchStart={(e) => handlers.onTouchStart(e, slot.date)}
          onTouchMove={handlers.onTouchMove}
          onTouchEnd={handlers.onTouchEnd}
        >
          {/* Slot content */}
        </div>
      ))}

      {/* Drag overlay */}
      {isDragging && dragSelection && (
        <DragToBlockOverlay dragSelection={dragSelection} />
      )}

      {/* Quick menu after drag */}
      {showQuickMenu && dragSelection && (
        <BlockTimeQuickMenu
          timeRange={{
            start: dragSelection.startSlot,
            end: dragSelection.endSlot,
          }}
          onConfirm={confirmSelection}
          onCancel={cancelSelection}
        />
      )}
    </div>
  )
}
```

**Interaction**:
1. Hold **Shift** + Drag on desktop
2. **Long-press** (500ms) + Drag on mobile
3. Release to show quick menu
4. Select preset or enter custom reason
5. Press Enter or click checkmark to confirm

**Quick Menu Presets**:
- 🍽️ Lunch (Press 1)
- ☕ Break (Press 2)
- 🏠 Personal (Press 3)
- 👥 Meeting (Press 4)
- ✏️ Custom (Enter your own)

### 4. BlockTimeQuickMenu

Appears after drag gesture with keyboard shortcuts.

```tsx
<BlockTimeQuickMenu
  timeRange={{ start: new Date(), end: new Date() }}
  position={{ x: 500, y: 300 }} // Optional, centers by default
  onConfirm={async (reason) => {
    // Create blocked time with reason
    await createBlockedTime(start, end, reason)
  }}
  onCancel={() => setShowMenu(false)}
/>
```

**Keyboard Shortcuts**:
- `1-4`: Select preset
- `Enter`: Confirm selection
- `Esc`: Cancel

**Auto-dismiss**: After 5 seconds of inactivity

### 5. RecurringBlockTime

Visual calendar picker for creating recurring blocks.

```tsx
import { RecurringBlockTime } from '@/app/(trainer)/trainer/calendar-v2/components/EventCreation'

<RecurringBlockTime
  timeRange={{ start: new Date(), end: new Date() }}
  onSubmit={async (dates, reason) => {
    // Create blocked times for all selected dates
    for (const date of dates) {
      await createBlockedTime(date, endDate, reason)
    }
  }}
  onCancel={() => setShowRecurring(false)}
/>
```

**Features**:
- Next 4 weeks calendar view
- "Every [Day] for next [N] weeks" quick select
- Visual date selection with checkboxes
- Shows selected dates count
- Optional reason field

## Hooks

### useBlockTimeTemplates

Manages templates with local storage + database sync.

```tsx
const {
  templates,          // Array of BlockTimeTemplate
  isLoading,          // Boolean
  error,              // string | null
  loadTemplates,      // () => Promise<void>
  createTemplate,     // (template) => Promise<void>
  updateTemplate,     // (id, updates) => Promise<void>
  deleteTemplate,     // (id) => Promise<void>
  applyTemplate,      // (id, startDate, weeks) => Promise<void>
} = useBlockTimeTemplates()
```

### useDragToBlock

Handles drag-to-block interaction.

```tsx
const {
  isDragging,         // Boolean
  dragSelection,      // DragSelection | null
  showQuickMenu,      // Boolean
  handlers,           // { onMouseDown, onMouseMove, onMouseUp, onTouchStart, onTouchMove, onTouchEnd }
  clearDrag,          // () => void
  confirmSelection,   // (reason?) => Promise<void>
  cancelSelection,    // () => void
} = useDragToBlock(enabled, onBlockCreated)
```

## API Routes

### GET /api/blocked-times/templates
Fetch all templates for the current trainer.

**Response**:
```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "Lunch Break",
      "icon": "🍽️",
      "days": [1, 2, 3, 4, 5],
      "startTime": "12:00",
      "endTime": "13:00",
      "reason": "Lunch Break",
      "recurrence": "weekly",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/blocked-times/templates
Create a new template.

**Body**:
```json
{
  "name": "Morning Workout",
  "icon": "🏃",
  "days": [1, 3, 5],
  "startTime": "06:00",
  "endTime": "07:00",
  "reason": "Gym time",
  "recurrence": "weekly"
}
```

### PATCH /api/blocked-times/templates
Update an existing template.

**Body**:
```json
{
  "id": "uuid",
  "name": "Updated Name",
  "days": [1, 2, 3]
}
```

### DELETE /api/blocked-times/templates
Delete a template.

**Body**:
```json
{
  "id": "uuid"
}
```

### POST /api/blocked-times/apply-template
Apply a template to create multiple blocked time entries.

**Body**:
```json
{
  "templateId": "uuid",
  "startDate": "2024-01-01T00:00:00Z",
  "weeks": 4
}
```

**Response**:
```json
{
  "success": true,
  "created": 20,
  "message": "Created 20 blocked time entries"
}
```

## Database Schema

```prisma
model BlockTimeTemplate {
  id          String    @id @default(uuid())
  workspaceId String    @map("workspace_id")
  trainerId   String    @map("trainer_id")
  name        String
  icon        String    @default("💼")
  days        Int[]     // [1, 2, 3, 4, 5] for Mon-Fri
  startTime   String    @map("start_time")  // "12:00"
  endTime     String    @map("end_time")    // "13:00"
  reason      String?   @db.Text
  recurrence  String    @default("weekly")  // "one-time", "weekly", "custom"
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  @@index([workspaceId, trainerId])
  @@map("block_time_templates")
}
```

## Migration

Run the Prisma migration to add the new table:

```bash
npx prisma migrate dev --name add_block_time_templates
npx prisma generate
```

## Design System

All components follow the calendar design system:

**Colors**:
- Primary: `#3b82f6` (blue-600)
- Success: `#10b981` (green-600)
- Hover: `rgba(59, 130, 246, 0.08)`

**Animations**:
- Duration: 250ms (normal)
- Easing: cubic-bezier(0.4, 0, 0.2, 1)
- Framer Motion for all transitions

**Shadows**:
- Cards: `shadow-md`
- Modals: `shadow-2xl`
- Hover: `shadow-lg`

**Patterns**:
- Diagonal stripes for drag overlay
- Pulse animation for borders
- Smooth scale transitions on hover

## Mobile Considerations

- Long-press (500ms) instead of Shift+Drag
- Larger touch targets (44px minimum)
- Bottom sheet for template manager
- Haptic feedback on drag start
- Touch-friendly time pickers

## Performance

- Debounced drag updates (60fps)
- Optimistic UI updates
- Lazy loading for templates
- Memoized date calculations
- Virtual scrolling for large date ranges

## Testing

Test the drag-to-block flow:
1. Open calendar
2. Hold Shift and drag across time slots
3. Release to see quick menu
4. Select preset or enter custom reason
5. Verify blocked time appears on calendar

Test template application:
1. Create a template (e.g., "Lunch Break")
2. Click "Apply"
3. Set weeks (e.g., 4)
4. Confirm
5. Verify blocked times appear for next 4 weeks

## Future Enhancements

- [ ] Template sharing across team
- [ ] Smart suggestions based on past blocks
- [ ] Conflict detection before applying
- [ ] Bulk edit/delete recurring blocks
- [ ] Template categories/folders
- [ ] Export/import templates
