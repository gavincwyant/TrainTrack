"use client"

import { useInlineEdit } from '../../hooks/useInlineEdit'

export type InlineEditType = 'text' | 'email' | 'date' | 'time' | 'select' | 'textarea' | 'number'

interface InlineEditFieldProps<T = string> {
  value: T
  onSave: (value: T) => Promise<void>
  type?: InlineEditType
  label: string
  placeholder?: string
  validation?: (value: T) => string | null
  options?: { value: string; label: string }[]
  multiline?: boolean
  disabled?: boolean
  icon?: React.ReactNode
}

export function InlineEditField<T = string>({
  value,
  onSave,
  type = 'text',
  label,
  placeholder,
  validation,
  options,
  multiline = false,
  disabled = false,
  icon,
}: InlineEditFieldProps<T>) {
  const {
    isEditing,
    value: editValue,
    setValue,
    isSaving,
    error,
    inputRef,
    startEdit,
    cancelEdit,
    save,
    handleKeyDown,
  } = useInlineEdit<T>({
    initialValue: value,
    onSave,
    validate: validation,
  })

  const renderInput = () => {
    const baseInputStyles: React.CSSProperties = {
      width: '100%',
      padding: '8px 12px',
      fontSize: '14px',
      borderRadius: '8px',
      border: '2px solid var(--calendar-primary)',
      backgroundColor: 'var(--calendar-bg-primary)',
      color: 'var(--text-primary)',
      outline: 'none',
      transition: 'all 0.15s ease',
    }

    if (type === 'select' && options) {
      return (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={editValue as string}
          onChange={(e) => setValue(e.target.value as T)}
          onBlur={save}
          onKeyDown={handleKeyDown}
          style={baseInputStyles}
          disabled={isSaving}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )
    }

    if (type === 'textarea' || multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={editValue as string}
          onChange={(e) => setValue(e.target.value as T)}
          onBlur={save}
          onKeyDown={(e) => {
            // Allow Shift+Enter for new lines in textarea
            if (e.key === 'Enter' && e.shiftKey) {
              return
            }
            handleKeyDown(e)
          }}
          placeholder={placeholder}
          disabled={isSaving}
          rows={3}
          style={{
            ...baseInputStyles,
            resize: 'vertical',
            minHeight: '80px',
          }}
        />
      )
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={type}
        value={editValue as string}
        onChange={(e) => setValue(e.target.value as T)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isSaving}
        style={baseInputStyles}
      />
    )
  }

  return (
    <div
      style={{
        marginBottom: '16px',
      }}
    >
      <label
        style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          marginBottom: '6px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {label}
      </label>

      {isEditing ? (
        <div>
          {renderInput()}

          {/* Edit actions */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginTop: '8px',
            }}
          >
            <button
              onClick={save}
              disabled={isSaving}
              style={{
                flex: 1,
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: 500,
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'var(--calendar-primary)',
                color: 'white',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.6 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={cancelEdit}
              disabled={isSaving}
              style={{
                flex: 1,
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: 500,
                borderRadius: '6px',
                border: '1px solid var(--calendar-bg-tertiary)',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.6 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              Cancel
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div
              style={{
                marginTop: '8px',
                padding: '8px 12px',
                fontSize: '13px',
                color: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '6px',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              {error}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={disabled ? undefined : startEdit}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '14px',
            textAlign: 'left',
            borderRadius: '8px',
            border: '1px solid transparent',
            backgroundColor: 'var(--calendar-bg-secondary)',
            color: 'var(--text-primary)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            position: 'relative',
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.backgroundColor = 'var(--calendar-bg-hover)'
              e.currentTarget.style.borderColor = 'var(--calendar-bg-tertiary)'
              const pencilIcon = e.currentTarget.querySelector('.pencil-icon') as HTMLElement
              if (pencilIcon) {
                pencilIcon.style.opacity = '1'
              }
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--calendar-bg-secondary)'
            e.currentTarget.style.borderColor = 'transparent'
            const pencilIcon = e.currentTarget.querySelector('.pencil-icon') as HTMLElement
            if (pencilIcon) {
              pencilIcon.style.opacity = '0'
            }
          }}
        >
          {icon && (
            <span style={{ fontSize: '16px' }}>
              {icon}
            </span>
          )}
          <span style={{ flex: 1 }}>
            {value ? String(value) : <span style={{ color: 'var(--text-tertiary)' }}>{placeholder || 'Click to edit'}</span>}
          </span>
          {!disabled && (
            <svg
              className="pencil-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                opacity: 0,
                transition: 'opacity 0.15s ease',
                color: 'var(--text-tertiary)',
              }}
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          )}
        </button>
      )}
    </div>
  )
}
