"use client"

import { useState, useEffect, useCallback } from 'react'

export type CommandResultType = 'client' | 'command' | 'parsed' | 'filter' | 'shortcut'

export interface CommandResult {
  id: string
  type: CommandResultType
  title: string
  subtitle?: string
  icon?: string
  action: () => void
  category: string
  shortcut?: string
  metadata?: Record<string, unknown>
}

interface UseCommandPaletteOptions {
  onScheduleClient?: (clientId: string) => void
  onQuickSchedule?: (parsed: ParsedCommand) => void
  onExecuteCommand?: (command: string) => void
  onApplyFilter?: (filter: string) => void
}

export interface ParsedCommand {
  type: 'schedule' | 'block' | 'cancel' | 'view'
  client?: string
  date?: string
  time?: string
  duration?: string
  confidence: number
}

export function useCommandPalette(options: UseCommandPaletteOptions = {}) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CommandResult[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('command-palette-recent')
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored))
      } catch {
        // Ignore parse errors
      }
    }
  }, [])

  // Fetch clients when palette opens
  useEffect(() => {
    if (isOpen && clients.length === 0) {
      fetchClients()
    }
  }, [isOpen])

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients')
      const data = await response.json()
      if (response.ok) {
        setClients(data.clients || [])
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error)
    }
  }

  const getDefaultActions = useCallback((): CommandResult[] => {
    return [
      {
        id: 'schedule-appointment',
        type: 'command',
        title: 'Schedule appointment',
        subtitle: 'Create a new client appointment',
        icon: '📅',
        category: 'Quick Actions',
        shortcut: 'C',
        action: () => options.onExecuteCommand?.('schedule'),
      },
      {
        id: 'block-time',
        type: 'command',
        title: 'Block time',
        subtitle: 'Block time on your calendar',
        icon: '🚫',
        category: 'Quick Actions',
        shortcut: 'B',
        action: () => options.onExecuteCommand?.('block'),
      },
      {
        id: 'view-today',
        type: 'command',
        title: 'View today',
        subtitle: 'Jump to today\'s view',
        icon: '📍',
        category: 'Quick Actions',
        shortcut: 'T',
        action: () => options.onExecuteCommand?.('today'),
      },
      {
        id: 'filter-today',
        type: 'filter',
        title: 'Show only today',
        subtitle: 'Filter appointments for today',
        icon: '⚡',
        category: 'Quick Filters',
        action: () => options.onApplyFilter?.('today'),
      },
      {
        id: 'filter-week',
        type: 'filter',
        title: 'Show this week',
        subtitle: 'Filter appointments for this week',
        icon: '⚡',
        category: 'Quick Filters',
        action: () => options.onApplyFilter?.('week'),
      },
      {
        id: 'filter-completed',
        type: 'filter',
        title: 'Show completed',
        subtitle: 'Show only completed appointments',
        icon: '⚡',
        category: 'Quick Filters',
        action: () => options.onApplyFilter?.('completed'),
      },
    ]
  }, [options])

  const searchClients = useCallback((searchQuery: string): CommandResult[] => {
    if (!searchQuery || clients.length === 0) return []

    const lowerQuery = searchQuery.toLowerCase()
    const matches = clients.filter(client =>
      client.fullName?.toLowerCase().includes(lowerQuery) ||
      client.email?.toLowerCase().includes(lowerQuery)
    )

    return matches.slice(0, 5).map(client => ({
      id: `client-${client.id}`,
      type: 'client' as const,
      title: client.fullName,
      subtitle: `${client.email} → Schedule session`,
      icon: '👤',
      category: 'Recent Clients',
      action: () => options.onScheduleClient?.(client.id),
      metadata: { client },
    }))
  }, [clients, options])

  const parseNaturalLanguage = useCallback((input: string): CommandResult | null => {
    // Simple natural language parsing
    const lowerInput = input.toLowerCase()

    // Check for schedule patterns: "john 2pm friday", "jane next monday"
    const schedulePattern = /^([a-z\s]+)\s+(\d+)(:\d+)?\s*(am|pm)?\s+(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next\s+\w+)/i
    const scheduleMatch = input.match(schedulePattern)

    if (scheduleMatch) {
      const [, clientName, , , , dateStr] = scheduleMatch
      return {
        id: 'parsed-schedule',
        type: 'parsed',
        title: `Schedule ${clientName} ${scheduleMatch[0].substring(clientName.length).trim()}`,
        subtitle: 'Press Enter to confirm',
        icon: '✨',
        category: 'Natural Language',
        action: () => {
          options.onQuickSchedule?.({
            type: 'schedule',
            client: clientName.trim(),
            date: dateStr,
            time: `${scheduleMatch[2]}${scheduleMatch[3] || ''}${scheduleMatch[4] || ''}`,
            confidence: 0.8,
          })
        },
      }
    }

    // Check for block patterns: "block lunch tomorrow"
    if (lowerInput.includes('block')) {
      return {
        id: 'parsed-block',
        type: 'parsed',
        title: `Block time: ${input}`,
        subtitle: 'Press Enter to confirm',
        icon: '✨',
        category: 'Natural Language',
        action: () => {
          options.onQuickSchedule?.({
            type: 'block',
            date: input.substring(5).trim(),
            confidence: 0.7,
          })
        },
      }
    }

    return null
  }, [options])

  const search = useCallback(async (searchQuery: string) => {
    setIsLoading(true)

    if (!searchQuery.trim()) {
      setResults(getDefaultActions())
      setIsLoading(false)
      return
    }

    const allResults: CommandResult[] = []

    // Parse natural language first
    const parsed = parseNaturalLanguage(searchQuery)
    if (parsed) {
      allResults.push(parsed)
    }

    // Search clients
    const clientResults = searchClients(searchQuery)
    allResults.push(...clientResults)

    // Match commands
    const commands = getDefaultActions().filter(cmd =>
      cmd.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    allResults.push(...commands)

    setResults(allResults)
    setIsLoading(false)
  }, [getDefaultActions, searchClients, parseNaturalLanguage])

  const execute = useCallback((result: CommandResult) => {
    // Save to recent searches
    const newRecent = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10)
    setRecentSearches(newRecent)
    localStorage.setItem('command-palette-recent', JSON.stringify(newRecent))

    // Execute action
    result.action()

    // Close palette
    setIsOpen(false)
    setQuery('')
  }, [query, recentSearches])

  // Global keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
        setQuery('')
      }

      // Quick shortcuts when palette is closed
      if (!isOpen && !e.metaKey && !e.ctrlKey) {
        if (e.key === 'c') {
          options.onExecuteCommand?.('schedule')
        } else if (e.key === 'b') {
          options.onExecuteCommand?.('block')
        } else if (e.key === 't') {
          options.onExecuteCommand?.('today')
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, options])

  return {
    isOpen,
    setIsOpen,
    query,
    setQuery,
    results,
    search,
    execute,
    isLoading,
    recentSearches,
  }
}
