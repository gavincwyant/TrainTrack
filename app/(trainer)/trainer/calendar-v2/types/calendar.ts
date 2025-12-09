// Calendar Types for Premium Calendar V2

export type CalendarView = 'month' | 'week' | 'day' | 'agenda'

export type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED'

export interface CalendarEvent {
  id: string
  title: string
  startTime: Date
  endTime: Date
  status: AppointmentStatus
  clientId: string
  clientName: string
  clientAvatar?: string
  clientEmail?: string
  type: 'appointment' | 'blocked'
  reason?: string
  isRecurring?: boolean
  _pending?: boolean // For optimistic updates
  _tempId?: string // For temp IDs during creation
}

export interface TimeSlot {
  start: Date
  end: Date
  isEmpty: boolean
  events: CalendarEvent[]
  isToday: boolean
  isPast: boolean
  isFuture: boolean
  isWorkingHours: boolean
}

export interface CalendarDay {
  date: Date
  isToday: boolean
  isCurrentMonth: boolean
  isPast: boolean
  events: CalendarEvent[]
  slots: TimeSlot[]
}

export interface CalendarWeek {
  weekNumber: number
  days: CalendarDay[]
  startDate: Date
  endDate: Date
}

export interface CalendarMonth {
  month: number
  year: number
  weeks: CalendarWeek[]
  totalDays: number
}

export interface FilterState {
  scheduled: boolean
  completed: boolean
  cancelled: boolean
  rescheduled: boolean
  blocked: boolean
}

export interface CalendarSettings {
  dayStartTime: string // "06:00"
  dayEndTime: string // "22:00"
  timezone: string
  workingDays: number[] // [1, 2, 3, 4, 5] for Mon-Fri
}

export interface EventLayoutInfo {
  event: CalendarEvent
  top: number
  height: number
  left: number
  width: number
  column: number
  maxColumns: number
}

// Animation timing constants
export const TIMING = {
  instant: 100,
  fast: 180,
  normal: 250,
  slow: 350,
  verySlow: 500,
} as const

export const EASING = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  decelerate: 'cubic-bezier(0.0, 0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
} as const

// Block Time Template Types
export interface BlockTimeTemplate {
  id: string
  name: string
  icon: string // emoji
  days: number[] // 0-6 (Sunday-Saturday)
  startTime: string // "12:00"
  endTime: string // "13:00"
  reason?: string
  recurrence: 'one-time' | 'weekly' | 'custom'
  createdAt?: Date
  updatedAt?: Date
}

export interface DragSelection {
  startSlot: Date
  endSlot: Date
  isValid: boolean
}

export interface QuickMenuPreset {
  id: string
  label: string
  icon: string
  reason: string
}

// Status colors
export const STATUS_COLORS = {
  SCHEDULED: {
    bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    border: '#2563eb',
    glow: 'rgba(59, 130, 246, 0.4)',
    text: '#ffffff',
  },
  COMPLETED: {
    bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: '#059669',
    glow: 'rgba(16, 185, 129, 0.4)',
    text: '#ffffff',
  },
  CANCELLED: {
    bg: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
    border: '#4b5563',
    text: '#e5e7eb',
    opacity: 0.6,
  },
  RESCHEDULED: {
    bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    border: '#d97706',
    glow: 'rgba(245, 158, 11, 0.4)',
    text: '#ffffff',
  },
} as const

// Quick menu presets
export const QUICK_MENU_PRESETS: QuickMenuPreset[] = [
  { id: 'lunch', label: 'Lunch', icon: '🍽️', reason: 'Lunch Break' },
  { id: 'break', label: 'Break', icon: '☕', reason: 'Break' },
  { id: 'personal', label: 'Personal', icon: '🏠', reason: 'Personal Time' },
  { id: 'meeting', label: 'Meeting', icon: '👥', reason: 'Meeting' },
] as const
