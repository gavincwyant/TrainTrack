// EventCreation Components
// Quick create system to reduce appointment creation from 7 clicks to 2-3 clicks

export { QuickCreatePopover } from './QuickCreatePopover'
export { QuickCreateInlineForm } from './QuickCreateInlineForm'
export { CalendarContextMenu } from './CalendarContextMenu'
export { SmartClientSelector } from './SmartClientSelector'
export { DurationPicker } from './DurationPicker'

// Smart Time Blocking Components - Phase 2
// Reduces time blocking from 6 clicks to 1 click with templates and drag gestures
export { BlockTimeTemplates } from './BlockTimeTemplates'
export { TemplateManager } from './TemplateManager'
export { DragToBlockOverlay, SimpleDragOverlay } from './DragToBlockOverlay'
export { BlockTimeQuickMenu } from './BlockTimeQuickMenu'
export { RecurringBlockTime } from './RecurringBlockTime'

export type {
  Client,
  ClientSuggestion,
  TimeSlotSelection,
  Position,
  SmartDefaults,
  AppointmentCreateData
} from './types'
