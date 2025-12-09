import type { AppointmentStatus } from '../types/calendar'
import { STATUS_COLORS } from '../types/calendar'

/**
 * Color object interface
 */
export interface StatusColorObject {
  bg: string
  border: string
  text: string
  glow?: string
  opacity?: number
}

/**
 * Get color object for a status
 * @param status - Appointment status
 * @returns Color object with bg, border, text, and optional glow/opacity
 */
export function getStatusColor(status: AppointmentStatus): StatusColorObject {
  return STATUS_COLORS[status]
}

/**
 * Get background gradient for a status
 * @param status - Appointment status
 * @returns CSS gradient string
 */
export function getStatusGradient(status: AppointmentStatus): string {
  return STATUS_COLORS[status].bg
}

/**
 * Get text color for a status
 * @param status - Appointment status
 * @returns CSS color string
 */
export function getStatusTextColor(status: AppointmentStatus): string {
  return STATUS_COLORS[status].text
}

/**
 * Get border color for a status
 * @param status - Appointment status
 * @returns CSS color string
 */
export function getStatusBorderColor(status: AppointmentStatus): string {
  return STATUS_COLORS[status].border
}

/**
 * Get glow/shadow color for a status
 * @param status - Appointment status
 * @returns CSS color string or undefined if no glow
 */
export function getStatusGlow(status: AppointmentStatus): string | undefined {
  const colors = STATUS_COLORS[status]
  return 'glow' in colors ? colors.glow : undefined
}

/**
 * Get opacity for a status
 * @param status - Appointment status
 * @returns Opacity value (0-1) or 1 if not specified
 */
export function getStatusOpacity(status: AppointmentStatus): number {
  const colors = STATUS_COLORS[status]
  return 'opacity' in colors ? colors.opacity : 1
}

/**
 * Get complete CSS styles for a status
 * @param status - Appointment status
 * @param includeGlow - Whether to include box-shadow glow (default: true)
 * @returns Object with CSS properties
 */
export function getStatusStyles(
  status: AppointmentStatus,
  includeGlow = true
): {
  background: string
  color: string
  borderColor: string
  opacity?: number
  boxShadow?: string
} {
  const colors = getStatusColor(status)
  const styles: ReturnType<typeof getStatusStyles> = {
    background: colors.bg,
    color: colors.text,
    borderColor: colors.border,
  }

  if (colors.opacity !== undefined) {
    styles.opacity = colors.opacity
  }

  if (includeGlow && colors.glow) {
    styles.boxShadow = `0 0 20px ${colors.glow}`
  }

  return styles
}

/**
 * Get a lighter version of the status color for hover states
 * @param status - Appointment status
 * @returns CSS gradient string with lighter colors
 */
export function getStatusHoverGradient(status: AppointmentStatus): string {
  // Map to slightly lighter versions
  const hoverGradients: Record<AppointmentStatus, string> = {
    SCHEDULED: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
    COMPLETED: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
    CANCELLED: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
    RESCHEDULED: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
  }

  return hoverGradients[status]
}

/**
 * Get badge color for status (solid colors for badges/pills)
 * @param status - Appointment status
 * @returns Object with background and text colors for badges
 */
export function getStatusBadgeColors(status: AppointmentStatus): {
  bg: string
  text: string
} {
  const badgeColors: Record<AppointmentStatus, { bg: string; text: string }> = {
    SCHEDULED: { bg: '#3b82f6', text: '#ffffff' },
    COMPLETED: { bg: '#10b981', text: '#ffffff' },
    CANCELLED: { bg: '#6b7280', text: '#e5e7eb' },
    RESCHEDULED: { bg: '#f59e0b', text: '#ffffff' },
  }

  return badgeColors[status]
}

/**
 * Get status name in human-readable format
 * @param status - Appointment status
 * @returns Formatted status name
 */
export function getStatusDisplayName(status: AppointmentStatus): string {
  const displayNames: Record<AppointmentStatus, string> = {
    SCHEDULED: 'Scheduled',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    RESCHEDULED: 'Rescheduled',
  }

  return displayNames[status]
}

/**
 * Get all available statuses
 * @returns Array of all appointment statuses
 */
export function getAllStatuses(): AppointmentStatus[] {
  return ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED']
}

/**
 * Get status icon (emoji or symbol)
 * @param status - Appointment status
 * @returns Icon/emoji string
 */
export function getStatusIcon(status: AppointmentStatus): string {
  const icons: Record<AppointmentStatus, string> = {
    SCHEDULED: '📅',
    COMPLETED: '✅',
    CANCELLED: '❌',
    RESCHEDULED: '🔄',
  }

  return icons[status]
}

// Export the STATUS_COLORS constant for direct access
export { STATUS_COLORS }
