'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Star, Clock, AlertCircle, User } from 'lucide-react'
import { Client, ClientSuggestion } from './types'

interface SmartClientSelectorProps {
  onSelect: (client: Client) => void
  currentDate?: Date
  currentTime?: string
  autoFocus?: boolean
  suggestedClients?: ClientSuggestion[]
  allClients?: Client[]
}

export function SmartClientSelector({
  onSelect,
  currentDate,
  currentTime,
  autoFocus = false,
  suggestedClients = [],
  allClients = []
}: SmartClientSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [clients, setClients] = useState<Client[]>(allClients)
  const [isLoading, setIsLoading] = useState(allClients.length === 0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Fetch clients if not provided
  useEffect(() => {
    if (allClients.length === 0) {
      const fetchClients = async () => {
        try {
          const response = await fetch('/api/clients')
          const data = await response.json()
          setClients(data.clients || [])
        } catch (error) {
          console.error('Failed to fetch clients:', error)
        } finally {
          setIsLoading(false)
        }
      }
      fetchClients()
    } else {
      setClients(allClients)
      setIsLoading(false)
    }
  }, [allClients])

  // Auto-focus input
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  // Fuzzy search
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients

    const query = searchQuery.toLowerCase()
    return clients.filter(client =>
      client.fullName.toLowerCase().includes(query) ||
      client.email.toLowerCase().includes(query)
    )
  }, [clients, searchQuery])

  // Separate suggested and regular clients
  const { suggested, regular } = useMemo(() => {
    const suggestedIds = new Set(suggestedClients.map(c => c.id))

    let filteredSuggested = suggestedClients
    let filteredRegular = filteredClients.filter(c => !suggestedIds.has(c.id))

    // Apply search filter to suggestions too
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filteredSuggested = suggestedClients.filter(client =>
        client.fullName.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query)
      )
    }

    return {
      suggested: filteredSuggested,
      regular: filteredRegular
    }
  }, [suggestedClients, filteredClients, searchQuery])

  const allFilteredClients = [...suggested, ...regular]

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, allFilteredClients.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && allFilteredClients[selectedIndex]) {
        e.preventDefault()
        onSelect(allFilteredClients[selectedIndex])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIndex, allFilteredClients, onSelect])

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex])

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchQuery])

  const formatLastSession = (daysSince?: number): string => {
    if (daysSince === undefined) return 'No sessions yet'
    if (daysSince === 0) return 'Today'
    if (daysSince === 1) return '1 day ago'
    if (daysSince < 7) return `${daysSince} days ago`
    if (daysSince < 30) return `${Math.floor(daysSince / 7)} weeks ago`
    return `${Math.floor(daysSince / 30)} months ago`
  }

  const getSuggestionIcon = (reason: ClientSuggestion['suggestionReason']) => {
    switch (reason) {
      case 'pattern':
        return <Star className="w-3.5 h-3.5 text-amber-500" />
      case 'overdue':
        return <AlertCircle className="w-3.5 h-3.5 text-red-500" />
      case 'recent':
        return <Clock className="w-3.5 h-3.5 text-blue-500" />
    }
  }

  const renderClientItem = (client: Client | ClientSuggestion, index: number, isSuggested: boolean) => {
    const isSelected = index === selectedIndex
    const suggestion = isSuggested ? (client as ClientSuggestion) : null

    return (
      <motion.div
        key={client.id}
        className={`
          px-3 py-2.5 cursor-pointer transition-colors
          ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}
        `}
        onClick={() => onSelect(client)}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.02 }}
      >
        <div className="flex items-start gap-3">
          {/* Avatar */}
          {client.clientProfile?.lastSessionDate ? (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {client.fullName.charAt(0).toUpperCase()}
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-semibold flex-shrink-0">
              {client.fullName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            {/* Name and suggestion badge */}
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-medium text-sm text-gray-900 truncate">
                {client.fullName}
              </span>
              {suggestion && (
                <div className="flex items-center gap-1">
                  {getSuggestionIcon(suggestion.suggestionReason)}
                </div>
              )}
            </div>

            {/* Suggestion details or last session */}
            {suggestion?.suggestionDetails ? (
              <p className="text-xs text-gray-600 mb-0.5">
                {suggestion.suggestionDetails}
              </p>
            ) : null}

            {/* Last session info */}
            {suggestion?.daysSinceLastSession !== undefined && (
              <p className="text-xs text-gray-500">
                Last session: {formatLastSession(suggestion.daysSinceLastSession)}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full max-h-96">
      {/* Search input */}
      <div className="px-3 py-2 border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Client list */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {allFilteredClients.length === 0 ? (
            <motion.div
              className="flex flex-col items-center justify-center py-8 text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <User className="w-12 h-12 mb-2 text-gray-300" />
              <p className="text-sm">No clients found</p>
            </motion.div>
          ) : (
            <div>
              {/* Suggested clients */}
              {suggested.length > 0 && (
                <div className="py-2">
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-500" />
                    Suggested
                  </div>
                  {suggested.map((client, idx) => renderClientItem(client, idx, true))}
                </div>
              )}

              {/* All clients */}
              {regular.length > 0 && (
                <div className="py-2">
                  {suggested.length > 0 && (
                    <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      All Clients
                    </div>
                  )}
                  {regular.map((client, idx) => renderClientItem(client, idx + suggested.length, false))}
                </div>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Keyboard hint */}
      <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
        <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">↑↓</kbd> Navigate
        <span className="mx-2">•</span>
        <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">Enter</kbd> Select
      </div>
    </div>
  )
}
