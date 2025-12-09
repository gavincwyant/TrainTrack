"use client"

import { useState, useCallback, useRef, useEffect } from 'react'

export interface UseInlineEditOptions<T> {
  initialValue: T
  onSave: (value: T) => Promise<void>
  validate?: (value: T) => string | null
  onCancel?: () => void
}

export function useInlineEdit<T = string>(options: UseInlineEditOptions<T>) {
  const { initialValue, onSave, validate, onCancel } = options

  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState<T>(initialValue)
  const [previousValue, setPreviousValue] = useState<T>(initialValue)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null)

  // Sync with external changes
  useEffect(() => {
    if (!isEditing) {
      setValue(initialValue)
      setPreviousValue(initialValue)
    }
  }, [initialValue, isEditing])

  const startEdit = useCallback(() => {
    setPreviousValue(value)
    setIsEditing(true)
    setError(null)

    // Auto-focus after state update
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }, [value])

  const cancelEdit = useCallback(() => {
    setValue(previousValue)
    setIsEditing(false)
    setError(null)
    onCancel?.()
  }, [previousValue, onCancel])

  const save = useCallback(async () => {
    // Validate
    if (validate) {
      const validationError = validate(value)
      if (validationError) {
        setError(validationError)
        return
      }
    }

    // Don't save if value hasn't changed
    if (value === previousValue) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await onSave(value)
      setPreviousValue(value)
      setIsEditing(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save'
      setError(errorMessage)
      // Keep editing mode on error
    } finally {
      setIsSaving(false)
    }
  }, [value, previousValue, validate, onSave])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      save()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    }
  }, [save, cancelEdit])

  const undo = useCallback(() => {
    setValue(previousValue)
    setError(null)
  }, [previousValue])

  return {
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
  }
}
