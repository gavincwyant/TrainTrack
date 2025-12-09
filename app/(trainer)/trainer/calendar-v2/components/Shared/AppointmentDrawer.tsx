"use client"

import { useState } from 'react'
import { SlideOverPanel } from './SlideOverPanel'
import { InlineEditField } from './InlineEditField'
import { CalendarEvent, AppointmentStatus } from '../../types/calendar'

interface AppointmentDrawerProps {
  appointment: CalendarEvent | null
  isOpen: boolean
  onClose: () => void
  onSave?: (appointment: Partial<CalendarEvent>) => Promise<void>
  onDelete?: (appointmentId: string) => Promise<void>
  onStatusChange?: (appointmentId: string, status: AppointmentStatus) => Promise<void>
}

export function AppointmentDrawer({
  appointment,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onStatusChange,
}: AppointmentDrawerProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  if (!appointment) return null

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }

    setIsDeleting(true)
    try {
      await onDelete?.(appointment.id)
      onClose()
    } catch (error) {
      console.error('Failed to delete appointment:', error)
    } finally {
      setIsDeleting(false)
      setDeleteConfirm(false)
    }
  }

  const handleSave = async (field: string, value: any) => {
    await onSave?.({
      id: appointment.id,
      [field]: value,
    })
  }

  const handleStatusChange = async (newStatus: AppointmentStatus) => {
    await onStatusChange?.(appointment.id, newStatus)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(date)
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date)
  }

  const formatTimeRange = (start: Date, end: Date) => {
    return `${formatTime(start)} - ${formatTime(end)}`
  }

  const getDuration = (start: Date, end: Date) => {
    const minutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60

    if (hours === 0) return `${mins}min`
    if (mins === 0) return `${hours}hr`
    return `${hours}hr ${mins}min`
  }

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'SCHEDULED':
        return 'var(--calendar-primary)'
      case 'COMPLETED':
        return 'var(--calendar-success)'
      case 'CANCELLED':
        return 'var(--calendar-neutral)'
      case 'RESCHEDULED':
        return 'var(--calendar-warning)'
      default:
        return 'var(--text-secondary)'
    }
  }

  const actions = (
    <>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        style={{
          padding: '8px 16px',
          fontSize: '13px',
          fontWeight: 600,
          borderRadius: '8px',
          border: 'none',
          backgroundColor: deleteConfirm ? 'var(--calendar-danger)' : 'transparent',
          color: deleteConfirm ? 'white' : 'var(--calendar-danger)',
          cursor: isDeleting ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          if (!isDeleting) {
            e.currentTarget.style.backgroundColor = deleteConfirm
              ? '#dc2626'
              : 'rgba(239, 68, 68, 0.1)'
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = deleteConfirm
            ? 'var(--calendar-danger)'
            : 'transparent'
        }}
      >
        {isDeleting ? 'Deleting...' : deleteConfirm ? 'Confirm Delete?' : 'Delete'}
      </button>
    </>
  )

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={onClose}
      position="right"
      title="Appointment Details"
      actions={actions}
      width="480px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Status Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            borderRadius: '8px',
            backgroundColor: `${getStatusColor(appointment.status)}15`,
            color: getStatusColor(appointment.status),
            fontSize: '13px',
            fontWeight: 600,
            alignSelf: 'flex-start',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: getStatusColor(appointment.status),
            }}
          />
          {appointment.status}
        </div>

        {/* Client Section */}
        <section>
          <h3
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '12px',
            }}
          >
            Client
          </h3>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              borderRadius: '10px',
              backgroundColor: 'var(--calendar-bg-secondary)',
            }}
          >
            {appointment.clientAvatar ? (
              <img
                src={appointment.clientAvatar}
                alt={appointment.clientName}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--calendar-primary)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 600,
                }}
              >
                {appointment.clientName.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '2px',
                }}
              >
                {appointment.clientName}
              </div>
              {appointment.clientEmail && (
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {appointment.clientEmail}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Date & Time Section */}
        <section>
          <h3
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '12px',
            }}
          >
            When
          </h3>
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              backgroundColor: 'var(--calendar-bg-secondary)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '12px',
              }}
            >
              <span style={{ fontSize: '20px' }}>📅</span>
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                {formatDate(appointment.startTime)}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '12px',
              }}
            >
              <span style={{ fontSize: '20px' }}>🕐</span>
              <span
                style={{
                  fontSize: '15px',
                  color: 'var(--text-primary)',
                }}
              >
                {formatTimeRange(appointment.startTime, appointment.endTime)}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '20px' }}>⏱️</span>
              <span
                style={{
                  fontSize: '15px',
                  color: 'var(--text-primary)',
                }}
              >
                {getDuration(appointment.startTime, appointment.endTime)}
              </span>
            </div>
          </div>
        </section>

        {/* Session Type (if not blocked time) */}
        {appointment.type === 'appointment' && (
          <section>
            <InlineEditField
              value={appointment.title || 'Individual Training'}
              onSave={async (value) => handleSave('title', value)}
              label="Session Type"
              icon="📝"
              placeholder="Enter session type"
            />
          </section>
        )}

        {/* Reason (for blocked time) */}
        {appointment.type === 'blocked' && appointment.reason && (
          <section>
            <InlineEditField
              value={appointment.reason}
              onSave={async (value) => handleSave('reason', value)}
              label="Reason"
              icon="📋"
              type="textarea"
              multiline
            />
          </section>
        )}

        {/* Quick Actions */}
        <section>
          <h3
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '12px',
            }}
          >
            Quick Actions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {appointment.status === 'SCHEDULED' && (
              <>
                <button
                  onClick={() => handleStatusChange('COMPLETED')}
                  style={{
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--calendar-success)',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = 'var(--shadow-glow-green)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Mark as Completed
                </button>
                <button
                  onClick={() => handleStatusChange('CANCELLED')}
                  style={{
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: '1px solid var(--calendar-bg-tertiary)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--calendar-bg-hover)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  Cancel Appointment
                </button>
              </>
            )}
            {appointment.status === 'CANCELLED' && (
              <button
                onClick={() => handleStatusChange('SCHEDULED')}
                style={{
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'var(--calendar-primary)',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-glow-blue)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
                Restore Appointment
              </button>
            )}
          </div>
        </section>

        {/* Recurring Info */}
        {appointment.isRecurring && (
          <section>
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--calendar-accent)" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--calendar-accent)' }}>
                  Recurring Appointment
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  This appointment repeats weekly
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </SlideOverPanel>
  )
}
