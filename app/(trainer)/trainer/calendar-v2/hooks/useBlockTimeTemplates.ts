"use client"

import { useState, useEffect, useCallback } from 'react'
import { BlockTimeTemplate } from '../types/calendar'

interface UseBlockTimeTemplatesReturn {
  templates: BlockTimeTemplate[]
  isLoading: boolean
  error: string | null
  loadTemplates: () => Promise<void>
  createTemplate: (template: Omit<BlockTimeTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateTemplate: (id: string, template: Partial<BlockTimeTemplate>) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>
  applyTemplate: (templateId: string, startDate: Date, weeks: number) => Promise<void>
}

export function useBlockTimeTemplates(): UseBlockTimeTemplatesReturn {
  const [templates, setTemplates] = useState<BlockTimeTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTemplates = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/blocked-times/templates')

      if (!response.ok) {
        throw new Error('Failed to fetch templates')
      }

      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load templates'
      setError(message)
      console.error('Load templates error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createTemplate = useCallback(async (template: Omit<BlockTimeTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/blocked-times/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create template')
      }

      await loadTemplates()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create template'
      setError(message)
      console.error('Create template error:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [loadTemplates])

  const updateTemplate = useCallback(async (id: string, template: Partial<BlockTimeTemplate>) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/blocked-times/templates`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...template }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update template')
      }

      await loadTemplates()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update template'
      setError(message)
      console.error('Update template error:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [loadTemplates])

  const deleteTemplate = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/blocked-times/templates`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete template')
      }

      await loadTemplates()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete template'
      setError(message)
      console.error('Delete template error:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [loadTemplates])

  const applyTemplate = useCallback(async (templateId: string, startDate: Date, weeks: number) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/blocked-times/apply-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          startDate: startDate.toISOString(),
          weeks,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to apply template')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to apply template'
      setError(message)
      console.error('Apply template error:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load templates on mount
  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  return {
    templates,
    isLoading,
    error,
    loadTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplate,
  }
}
