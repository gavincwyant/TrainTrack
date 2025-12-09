"use client"

import { useState, useEffect } from 'react'
import { useNaturalLanguageParse, parseDateString, parseDuration } from '../../hooks/useNaturalLanguageParse'

interface QuickSchedulerProps {
  onSchedule: (data: ScheduleData) => void
  onParse?: (parsed: ParsedScheduleData) => void
}

export interface ScheduleData {
  clientName?: string
  date: Date
  time: string
  duration: number
  type: 'appointment' | 'block'
}

export interface ParsedScheduleData {
  client?: string
  date?: string
  time?: string
  duration?: string
  action?: 'schedule' | 'block' | 'cancel' | 'view'
  confidence: number
  isValid: boolean
  preview?: string
}

export function QuickScheduler({ onSchedule, onParse }: QuickSchedulerProps) {
  const [input, setInput] = useState('')
  const parsed = useNaturalLanguageParse(input)

  // Notify parent of parsing results
  useEffect(() => {
    if (!onParse || !input.trim()) return

    const isValid = !!parsed.date && !!parsed.time && parsed.confidence > 0.5
    const preview = generatePreview(parsed)

    onParse({
      ...parsed,
      isValid,
      preview,
    })
  }, [parsed, input, onParse])

  const generatePreview = (parsed: ReturnType<typeof useNaturalLanguageParse>): string => {
    if (!parsed.date || !parsed.time) {
      return ''
    }

    const parts: string[] = []

    // Action
    if (parsed.action === 'block') {
      parts.push('Block time')
    } else if (parsed.client) {
      parts.push(`Schedule ${parsed.client}`)
    } else {
      parts.push('Schedule appointment')
    }

    // Date
    parts.push(`on ${parsed.date}`)

    // Time
    parts.push(`at ${parsed.time}`)

    // Duration
    if (parsed.duration) {
      parts.push(`for ${parsed.duration}`)
    }

    return parts.join(' ')
  }

  const handleSchedule = () => {
    if (!parsed.date || !parsed.time) {
      return
    }

    try {
      const date = parseDateString(parsed.date)
      const duration = parsed.duration ? parseDuration(parsed.duration) : 60

      // Parse time
      const [hours, minutes] = parsed.time.split(':').map(Number)
      date.setHours(hours, minutes || 0, 0, 0)

      const data: ScheduleData = {
        clientName: parsed.client,
        date,
        time: parsed.time,
        duration,
        type: parsed.action === 'block' ? 'block' : 'appointment',
      }

      onSchedule(data)
      setInput('')
    } catch (error) {
      console.error('Failed to parse schedule data:', error)
    }
  }

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'var(--calendar-success)'
    if (confidence >= 0.5) return 'var(--calendar-warning)'
    return 'var(--calendar-danger)'
  }

  const getSuggestions = (): string[] => {
    if (!input) {
      return [
        'john 2pm friday',
        'block lunch tomorrow',
        'jane next monday 60min',
        'schedule sarah 3pm today',
      ]
    }

    const suggestions: string[] = []

    // Suggest time if missing
    if (!parsed.time && parsed.client) {
      suggestions.push(`${input} 2pm`)
      suggestions.push(`${input} 3:30pm`)
    }

    // Suggest date if missing
    if (!parsed.date && parsed.client) {
      suggestions.push(`${input} tomorrow`)
      suggestions.push(`${input} monday`)
    }

    // Suggest duration if missing
    if (parsed.time && parsed.date && !parsed.duration) {
      suggestions.push(`${input} 60min`)
      suggestions.push(`${input} 30min`)
    }

    return suggestions.slice(0, 4)
  }

  const canSchedule = parsed.date && parsed.time && parsed.confidence > 0.5

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: 'var(--calendar-bg-secondary)',
        borderRadius: '12px',
      }}
    >
      <div style={{ marginBottom: '12px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Quick Schedule
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSchedule) {
                e.preventDefault()
                handleSchedule()
              }
            }}
            placeholder="e.g., john 2pm friday or block lunch tomorrow"
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '14px',
              borderRadius: '8px',
              border: `2px solid ${input ? getConfidenceColor(parsed.confidence) : 'var(--calendar-bg-tertiary)'}`,
              backgroundColor: 'var(--calendar-bg-primary)',
              color: 'var(--text-primary)',
              outline: 'none',
              transition: 'all 0.15s ease',
            }}
          />
          {input && (
            <button
              onClick={() => setInput('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: 'var(--calendar-bg-tertiary)',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Parsing Feedback */}
      {input && (
        <div
          style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: 'var(--calendar-bg-primary)',
            marginBottom: '12px',
            border: `1px solid ${getConfidenceColor(parsed.confidence)}20`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: getConfidenceColor(parsed.confidence),
              }}
            />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
              }}
            >
              Confidence: {Math.round(parsed.confidence * 100)}%
            </span>
          </div>

          {/* Parsed Components */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
            {parsed.client && (
              <div
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  color: 'var(--calendar-primary)',
                }}
              >
                👤 {parsed.client}
              </div>
            )}
            {parsed.date && (
              <div
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  color: 'var(--calendar-success)',
                }}
              >
                📅 {parsed.date}
              </div>
            )}
            {parsed.time && (
              <div
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  color: 'var(--calendar-warning)',
                }}
              >
                🕐 {parsed.time}
              </div>
            )}
            {parsed.duration && (
              <div
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(139, 92, 246, 0.1)',
                  color: '#8b5cf6',
                }}
              >
                ⏱️ {parsed.duration}
              </div>
            )}
            {parsed.action && (
              <div
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(107, 114, 128, 0.1)',
                  color: 'var(--calendar-neutral)',
                }}
              >
                {parsed.action === 'block' ? '🚫' : '✅'} {parsed.action}
              </div>
            )}
          </div>

          {/* Preview */}
          {generatePreview(parsed) && (
            <div
              style={{
                fontSize: '13px',
                color: 'var(--text-primary)',
                fontWeight: 500,
                padding: '8px',
                backgroundColor: 'var(--calendar-bg-hover)',
                borderRadius: '6px',
              }}
            >
              📝 {generatePreview(parsed)}
            </div>
          )}
        </div>
      )}

      {/* Suggestions */}
      {getSuggestions().length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {input ? 'Suggestions' : 'Examples'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {getSuggestions().map((suggestion, i) => (
              <button
                key={i}
                onClick={() => setInput(suggestion)}
                style={{
                  padding: '8px 10px',
                  fontSize: '12px',
                  textAlign: 'left',
                  border: '1px solid var(--calendar-bg-tertiary)',
                  borderRadius: '6px',
                  backgroundColor: 'var(--calendar-bg-primary)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--calendar-bg-hover)'
                  e.currentTarget.style.borderColor = 'var(--calendar-primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--calendar-bg-primary)'
                  e.currentTarget.style.borderColor = 'var(--calendar-bg-tertiary)'
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleSchedule}
        disabled={!canSchedule}
        style={{
          width: '100%',
          padding: '10px 16px',
          fontSize: '14px',
          fontWeight: 600,
          borderRadius: '8px',
          border: 'none',
          backgroundColor: canSchedule ? 'var(--calendar-primary)' : 'var(--calendar-bg-tertiary)',
          color: canSchedule ? 'white' : 'var(--text-tertiary)',
          cursor: canSchedule ? 'pointer' : 'not-allowed',
          transition: 'all 0.15s ease',
          opacity: canSchedule ? 1 : 0.5,
        }}
        onMouseEnter={(e) => {
          if (canSchedule) {
            e.currentTarget.style.backgroundColor = 'var(--calendar-primary-dark)'
          }
        }}
        onMouseLeave={(e) => {
          if (canSchedule) {
            e.currentTarget.style.backgroundColor = 'var(--calendar-primary)'
          }
        }}
      >
        {canSchedule ? 'Create Appointment' : 'Enter date and time'}
      </button>
    </div>
  )
}
