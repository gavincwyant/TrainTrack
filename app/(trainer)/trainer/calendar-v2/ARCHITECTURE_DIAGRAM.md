# Command Palette System Architecture

Visual guide to how all components and hooks connect.

## Component Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                      Calendar Page                          │
│  (Your existing calendar component)                         │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
        ┌───────▼──────┐       ┌───────▼──────────┐
        │ CommandPalette│       │AppointmentDrawer│
        └───────┬──────┘       └───────┬──────────┘
                │                       │
        ┌───────▼──────────┐   ┌───────▼──────────┐
        │useCommandPalette │   │  SlideOverPanel  │
        └───────┬──────────┘   └───────┬──────────┘
                │                       │
        ┌───────▼──────────┐   ┌───────▼──────────┐
        │QuickScheduler    │   │ InlineEditField  │
        └───────┬──────────┘   └───────┬──────────┘
                │                       │
        ┌───────▼──────────────┐┌──────▼──────────┐
        │useNaturalLanguageParse││  useInlineEdit  │
        └───────────────────────┘└─────────────────┘
```

## Data Flow

```
User Action
    │
    ▼
┌─────────────────────┐
│   Keyboard Event    │  Cmd+K, C, B, T, ↑↓, Enter, Esc
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ useCommandPalette   │
│  - Listens to keys  │
│  - Manages state    │
│  - Searches clients │
│  - Parses NL input  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  CommandPalette UI  │
│  - Shows results    │
│  - Keyboard nav     │
│  - Execute action   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Action Handler    │  onScheduleClient, onExecuteCommand, etc.
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  API Call / Update  │
└─────────────────────┘
```

## Hook Dependencies

```
useCommandPalette
    ├── useState (isOpen, query, results, etc.)
    ├── useEffect (keyboard listeners, client fetching)
    ├── useCallback (search, execute, getDefaultActions)
    └── localStorage (recent searches)

useNaturalLanguageParse
    └── useMemo (parse input into structured data)

useInlineEdit
    ├── useState (isEditing, value, isSaving, error)
    ├── useCallback (startEdit, cancelEdit, save, undo)
    ├── useRef (inputRef)
    └── useEffect (sync with external changes)
```

## Component Communication

```
┌─────────────────────────────────────────────────────────────┐
│                      Calendar Page                          │
│                                                             │
│  State:                                                     │
│  - selectedEvent: CalendarEvent | null                     │
│  - drawerOpen: boolean                                      │
│  - quickSchedulerOpen: boolean                              │
│                                                             │
│  Handlers:                                                  │
│  - handleSaveAppointment(updates)                           │
│  - handleDeleteAppointment(id)                              │
│  - handleStatusChange(id, status)                           │
│  - handleQuickSchedule(data)                                │
└─────────────────────────────────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
┌──────────────┐  ┌─────────────────┐  ┌────────────────┐
│CommandPalette│  │AppointmentDrawer│  │QuickScheduler  │
│              │  │                 │  │   (optional)   │
│Props:        │  │Props:           │  │                │
│- isOpen      │  │- appointment    │  │Props:          │
│- query       │  │- isOpen         │  │- onSchedule    │
│- results     │  │- onSave         │  │- onParse       │
│- onExecute   │  │- onDelete       │  │                │
│              │  │- onStatusChange │  │                │
└──────────────┘  └─────────────────┘  └────────────────┘
          │                 │
          │                 └───────┐
          │                         │
          ▼                         ▼
    ┌──────────┐          ┌─────────────────┐
    │  Calls:  │          │SlideOverPanel   │
    │          │          │                 │
    │schedule  │          │Props:           │
    │block     │          │- children       │
    │filter    │          │- title          │
    │client    │          │- actions        │
    └──────────┘          │- position       │
                          │- width          │
                          │- allowDragClose │
                          └─────────────────┘
                                    │
                                    ▼
                          ┌─────────────────┐
                          │InlineEditField  │
                          │(multiple)       │
                          │                 │
                          │Props:           │
                          │- value          │
                          │- onSave         │
                          │- type           │
                          │- label          │
                          └─────────────────┘
```

## Keyboard Event Flow

```
Document Keyboard Event
         │
         ▼
┌─────────────────┐
│ Is Cmd/Ctrl+K?  │──Yes──▶ Toggle Command Palette
└────────┬────────┘
         │ No
         ▼
┌─────────────────┐
│ Is palette open?│──Yes──▶ Handle in CommandPalette
└────────┬────────┘          (↑↓, Enter, Esc)
         │ No
         ▼
┌─────────────────┐
│ Is drawer open? │──Yes──▶ Handle in SlideOverPanel
└────────┬────────┘          (Esc, Tab)
         │ No
         ▼
┌─────────────────┐
│ Quick shortcuts │──▶ C: Create
│    (C, B, T)    │    B: Block
└─────────────────┘    T: Today
```

## API Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│                     Command Palette                         │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
    ┌────────────────┐
    │ Search Clients │
    │ GET /api/clients
    └────────┬───────┘
             │
             ▼
    ┌────────────────┐
    │ Display Results│
    └────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Appointment Drawer                        │
└────────────┬────────────────────────────────────────────────┘
             │
             ├──▶ Update: PATCH /api/appointments/:id
             ├──▶ Delete: DELETE /api/appointments/:id
             └──▶ Status: PATCH /api/appointments/:id {status}

┌─────────────────────────────────────────────────────────────┐
│                    Quick Scheduler                          │
└────────────┬────────────────────────────────────────────────┘
             │
             └──▶ Create: POST /api/appointments
                  {clientId, startTime, endTime}
```

## State Management Flow

```
Calendar Page State
        │
        ├──▶ selectedEvent ──▶ AppointmentDrawer.appointment
        │
        ├──▶ drawerOpen ──────▶ AppointmentDrawer.isOpen
        │
        └──▶ Handlers ────────▶ AppointmentDrawer callbacks
                                 (onSave, onDelete, onStatusChange)

useCommandPalette State
        │
        ├──▶ isOpen ──────────▶ CommandPalette.isOpen
        │
        ├──▶ query ───────────▶ CommandPalette.query
        │
        ├──▶ results ─────────▶ CommandPalette.results
        │
        └──▶ execute ─────────▶ CommandPalette.onExecute

useInlineEdit State (per field)
        │
        ├──▶ isEditing ───────▶ Show input or display
        │
        ├──▶ value ───────────▶ Current field value
        │
        ├──▶ isSaving ────────▶ Show loading state
        │
        └──▶ error ───────────▶ Show error message
```

## File Import Structure

```
Calendar Page
    │
    ├── import { useCommandPalette } from './hooks'
    │
    ├── import {
    │       CommandPalette,
    │       AppointmentDrawer,
    │       QuickScheduler,
    │       SlideOverPanel
    │   } from './components/Shared'
    │
    └── import { CalendarEvent } from './types/calendar'

CommandPalette Component
    │
    ├── import { motion } from 'framer-motion'
    ├── import { createPortal } from 'react-dom'
    └── import { CommandResult } from '../../hooks/useCommandPalette'

AppointmentDrawer Component
    │
    ├── import { SlideOverPanel } from './SlideOverPanel'
    ├── import { InlineEditField } from './InlineEditField'
    └── import { CalendarEvent } from '../../types/calendar'

QuickScheduler Component
    │
    ├── import { useNaturalLanguageParse } from '../../hooks'
    └── Natural language parsing logic

SlideOverPanel Component
    │
    ├── import { motion } from 'framer-motion'
    └── import { createPortal } from 'react-dom'

InlineEditField Component
    │
    └── import { useInlineEdit } from '../../hooks'
```

## Natural Language Parsing Flow

```
User Input: "john 2pm friday"
        │
        ▼
useNaturalLanguageParse Hook
        │
        ├──▶ Extract Client Name ──▶ "john"
        │
        ├──▶ Extract Time ─────────▶ "2pm" → "14:00"
        │
        ├──▶ Extract Date ─────────▶ "friday" → next Friday
        │
        ├──▶ Calculate Confidence ─▶ 0.85 (high)
        │
        └──▶ Return Parsed Object
                │
                ▼
        { client: "john",
          time: "14:00",
          date: "friday",
          confidence: 0.85 }
                │
                ▼
        Display in QuickScheduler
        with visual feedback
                │
                ▼
        User confirms → Create Appointment
```

## Mobile Responsive Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Screen Size Detection                   │
└────────────┬────────────────────────────────────────────────┘
             │
      ┌──────┴──────┐
      │             │
Desktop (≥768px)    Mobile (<768px)
      │             │
      ▼             ▼
┌─────────────┐   ┌──────────────┐
│Right Drawer │   │Bottom Sheet  │
│400px width  │   │90vh height   │
│Slides from  │   │Slides from   │
│right        │   │bottom        │
│Drag left    │   │Drag down     │
│to dismiss   │   │to dismiss    │
└─────────────┘   └──────────────┘
```

## Error Handling Flow

```
User Action (Save/Delete/Update)
        │
        ▼
    Try Block
        │
        ├──▶ Optimistic Update (optional)
        │
        ▼
    API Call
        │
    ┌───┴────┐
    │        │
  Success   Failure
    │        │
    ▼        ▼
Update UI  Catch Block
Close UI    │
            ├──▶ Set Error State
            ├──▶ Display Error Message
            ├──▶ Rollback Optimistic Update
            └──▶ Keep UI Open for Retry
```

## Summary

The architecture follows these principles:

1. **Separation of Concerns**: UI components separate from business logic (hooks)
2. **Composition**: Small, reusable components that build up
3. **Data Flow**: Unidirectional from parent to children
4. **State Management**: Local state with hooks, no global state needed
5. **Event Handling**: Callbacks up, props down
6. **Portal Rendering**: Modals/drawers render at document root
7. **Accessibility**: Focus management and keyboard navigation
8. **Responsive**: Adapts to screen size automatically

This creates a maintainable, testable, and performant system that's easy to integrate and customize.
