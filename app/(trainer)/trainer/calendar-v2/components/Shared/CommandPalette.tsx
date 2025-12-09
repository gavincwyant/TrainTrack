"use client"

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { CommandResult } from '../../hooks/useCommandPalette'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  query: string
  onQueryChange: (query: string) => void
  results: CommandResult[]
  onExecute: (result: CommandResult) => void
  isLoading?: boolean
  recentSearches?: string[]
}

export function CommandPalette({
  isOpen,
  onClose,
  query,
  onQueryChange,
  results,
  onExecute,
  isLoading = false,
  recentSearches = [],
}: CommandPaletteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (results[selectedIndex]) {
            onExecute(results[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, results, onExecute, onClose])

  // Scroll selected item into view
  useEffect(() => {
    if (!resultsRef.current) return

    const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement
    if (selectedElement) {
      selectedElement.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  }, [selectedIndex])

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Group results by category
  const groupedResults = results.reduce((acc, result) => {
    const category = result.category || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(result)
    return acc
  }, {} as Record<string, CommandResult[]>)

  const categoryOrder = [
    'Natural Language',
    'Quick Actions',
    'Recent Clients',
    'Quick Filters',
    'Keyboard Shortcuts',
  ]

  const sortedCategories = Object.keys(groupedResults).sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a)
    const bIndex = categoryOrder.indexOf(b)
    if (aIndex === -1 && bIndex === -1) return 0
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })

  if (typeof window === 'undefined') return null

  const content = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              zIndex: 9998,
            }}
          />

          {/* Command Palette */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              padding: '15vh 20px 20px',
              zIndex: 9999,
              pointerEvents: 'none',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                width: '100%',
                maxWidth: '640px',
                backgroundColor: 'var(--calendar-bg-primary)',
                borderRadius: '18px',
                boxShadow: 'var(--shadow-2xl)',
                overflow: 'hidden',
                pointerEvents: 'auto',
              }}
            >
              {/* Search Input */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--calendar-bg-tertiary)',
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  placeholder="Type a command or search..."
                  style={{
                    flex: 1,
                    fontSize: '16px',
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--text-primary)',
                  }}
                />
                {isLoading && (
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid var(--calendar-bg-tertiary)',
                      borderTopColor: 'var(--calendar-primary)',
                      borderRadius: '50%',
                      animation: 'spin 0.6s linear infinite',
                    }}
                  />
                )}
                <kbd
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    backgroundColor: 'var(--calendar-bg-tertiary)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div
                ref={resultsRef}
                style={{
                  maxHeight: '60vh',
                  overflowY: 'auto',
                }}
              >
                {results.length === 0 && !isLoading && (
                  <div
                    style={{
                      padding: '32px 20px',
                      textAlign: 'center',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {query ? (
                      <>
                        <svg
                          width="48"
                          height="48"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          style={{ margin: '0 auto 12px', opacity: 0.4 }}
                        >
                          <circle cx="11" cy="11" r="8" />
                          <path d="m21 21-4.35-4.35" />
                        </svg>
                        <div style={{ fontSize: '14px' }}>No results found</div>
                        <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>
                          Try searching for a client or command
                        </div>
                      </>
                    ) : recentSearches.length > 0 ? (
                      <>
                        <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '12px', textAlign: 'left' }}>
                          RECENT SEARCHES
                        </div>
                        {recentSearches.slice(0, 5).map((search, i) => (
                          <button
                            key={i}
                            onClick={() => onQueryChange(search)}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              fontSize: '14px',
                              textAlign: 'left',
                              border: 'none',
                              backgroundColor: 'transparent',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              borderRadius: '6px',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--calendar-bg-hover)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }}
                          >
                            {search}
                          </button>
                        ))}
                      </>
                    ) : (
                      <div style={{ fontSize: '14px' }}>Start typing to search</div>
                    )}
                  </div>
                )}

                {sortedCategories.map((category, categoryIndex) => {
                  const categoryResults = groupedResults[category]
                  const startIndex = sortedCategories.slice(0, categoryIndex).reduce(
                    (sum, cat) => sum + groupedResults[cat].length,
                    0
                  )

                  return (
                    <div key={category} style={{ padding: '12px 0' }}>
                      <div
                        style={{
                          padding: '6px 20px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--text-tertiary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {category}
                      </div>
                      {categoryResults.map((result, index) => {
                        const globalIndex = startIndex + index
                        const isSelected = globalIndex === selectedIndex

                        return (
                          <button
                            key={result.id}
                            onClick={() => onExecute(result)}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '10px 20px',
                              border: 'none',
                              backgroundColor: isSelected
                                ? 'var(--calendar-bg-selected)'
                                : 'transparent',
                              color: 'var(--text-primary)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              textAlign: 'left',
                            }}
                          >
                            {result.icon && (
                              <span style={{ fontSize: '20px', flexShrink: 0 }}>
                                {result.icon}
                              </span>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: '14px',
                                  fontWeight: 500,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {result.title}
                              </div>
                              {result.subtitle && (
                                <div
                                  style={{
                                    fontSize: '12px',
                                    color: 'var(--text-tertiary)',
                                    marginTop: '2px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {result.subtitle}
                                </div>
                              )}
                            </div>
                            {result.shortcut && (
                              <kbd
                                style={{
                                  padding: '3px 6px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  borderRadius: '4px',
                                  backgroundColor: 'var(--calendar-bg-tertiary)',
                                  color: 'var(--text-tertiary)',
                                  flexShrink: 0,
                                }}
                              >
                                {result.shortcut}
                              </kbd>
                            )}
                            {isSelected && (
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                style={{ color: 'var(--calendar-primary)', flexShrink: 0 }}
                              >
                                <path d="M9 18l6-6-6-6" />
                              </svg>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 20px',
                  borderTop: '1px solid var(--calendar-bg-tertiary)',
                  fontSize: '11px',
                  color: 'var(--text-tertiary)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <kbd
                    style={{
                      padding: '2px 5px',
                      borderRadius: '3px',
                      backgroundColor: 'var(--calendar-bg-tertiary)',
                    }}
                  >
                    ↑↓
                  </kbd>
                  Navigate
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <kbd
                    style={{
                      padding: '2px 5px',
                      borderRadius: '3px',
                      backgroundColor: 'var(--calendar-bg-tertiary)',
                    }}
                  >
                    ↵
                  </kbd>
                  Select
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <kbd
                    style={{
                      padding: '2px 5px',
                      borderRadius: '3px',
                      backgroundColor: 'var(--calendar-bg-tertiary)',
                    }}
                  >
                    ESC
                  </kbd>
                  Close
                </div>
                <div style={{ marginLeft: 'auto', opacity: 0.5 }}>
                  Cmd/Ctrl + K to toggle
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )

  return createPortal(content, document.body)
}
