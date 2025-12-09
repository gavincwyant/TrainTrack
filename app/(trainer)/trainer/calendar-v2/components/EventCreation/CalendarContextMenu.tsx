'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Ban, Edit2, Trash2, X, CheckCircle, StickyNote } from 'lucide-react'
import { Position } from './types'
import { CalendarEvent, TimeSlot, TIMING } from '../../types/calendar'

type ContextMenuAction =
  | 'schedule'
  | 'block'
  | 'note'
  | 'complete'
  | 'edit'
  | 'delete'
  | 'cancel'

interface ContextMenuTarget {
  type: 'slot' | 'event'
  data: TimeSlot | CalendarEvent
}

interface CalendarContextMenuProps {
  isOpen: boolean
  position: Position
  target: ContextMenuTarget | null
  onAction: (action: ContextMenuAction, target: ContextMenuTarget) => void
  onClose: () => void
}

interface MenuItem {
  action: ContextMenuAction
  label: string
  icon: React.ReactNode
  color?: string
  divider?: boolean
  condition?: (target: ContextMenuTarget) => boolean
}

export function CalendarContextMenu({
  isOpen,
  position,
  target,
  onAction,
  onClose
}: CalendarContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Menu items configuration
  const slotMenuItems: MenuItem[] = [
    {
      action: 'schedule',
      label: 'Schedule Appointment',
      icon: <Calendar className="w-4 h-4" />,
      color: 'text-blue-600'
    },
    {
      action: 'block',
      label: 'Block Time',
      icon: <Ban className="w-4 h-4" />,
      color: 'text-gray-600'
    },
    {
      action: 'note',
      label: 'Add Note',
      icon: <StickyNote className="w-4 h-4" />,
      color: 'text-amber-600',
      divider: false
    }
  ]

  const eventMenuItems: MenuItem[] = [
    {
      action: 'complete',
      label: 'Mark Complete',
      icon: <CheckCircle className="w-4 h-4" />,
      color: 'text-green-600',
      condition: (target) => {
        if (target.type !== 'event') return false
        const event = target.data as CalendarEvent
        return event.type === 'appointment' && event.status === 'SCHEDULED'
      }
    },
    {
      action: 'edit',
      label: 'Edit',
      icon: <Edit2 className="w-4 h-4" />,
      color: 'text-blue-600'
    },
    {
      action: 'delete',
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      color: 'text-red-600'
    },
    {
      action: 'cancel',
      label: 'Cancel',
      icon: <X className="w-4 h-4" />,
      color: 'text-orange-600',
      condition: (target) => {
        if (target.type !== 'event') return false
        const event = target.data as CalendarEvent
        return event.type === 'appointment' && event.status === 'SCHEDULED'
      }
    }
  ]

  // Get applicable menu items
  const menuItems = target?.type === 'slot' ? slotMenuItems : eventMenuItems.filter(
    item => !item.condition || (target && item.condition(target))
  )

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleEscape)
    }

    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      // Delay to prevent immediate close from the same click that opened it
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 100)
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, menuItems.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && target) {
        e.preventDefault()
        const item = menuItems[selectedIndex]
        if (item) {
          onAction(item.action, target)
          onClose()
        }
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, menuItems, target, onAction, onClose])

  // Reset selection when menu opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Handle menu item click
  const handleItemClick = (action: ContextMenuAction) => {
    if (target) {
      onAction(action, target)
      onClose()
    }
  }

  // Adjust position to keep menu on screen
  const getAdjustedPosition = () => {
    if (!menuRef.current) return position

    const menuWidth = 220
    const menuHeight = menuItems.length * 42 + 16 // approximate

    let { x, y } = position

    // Adjust horizontal position
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 8
    }

    // Adjust vertical position
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 8
    }

    return { x: Math.max(8, x), y: Math.max(8, y) }
  }

  if (!isOpen || !target) return null

  const adjustedPosition = getAdjustedPosition()

  const content = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] pointer-events-none">
          <motion.div
            ref={menuRef}
            role="menu"
            aria-orientation="vertical"
            className="absolute bg-white rounded-xl shadow-2xl border border-gray-200 py-2 pointer-events-auto min-w-[220px]"
            style={{
              left: adjustedPosition.x,
              top: adjustedPosition.y
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: TIMING.fast / 1000, ease: [0.175, 0.885, 0.32, 1.275] }}
          >
            {/* Menu title */}
            <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 mb-1">
              {target.type === 'slot' ? 'Time Slot' : 'Appointment'}
            </div>

            {/* Menu items */}
            {menuItems.map((item, index) => (
              <div key={item.action}>
                <motion.button
                  role="menuitem"
                  onClick={() => handleItemClick(item.action)}
                  className={`
                    w-full px-3 py-2.5 flex items-center gap-3 transition-colors text-left
                    ${selectedIndex === index
                      ? 'bg-blue-50'
                      : 'hover:bg-gray-50'
                    }
                  `}
                  whileHover={{ x: 2 }}
                  transition={{ duration: 0.15 }}
                >
                  <span className={item.color || 'text-gray-600'}>
                    {item.icon}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {item.label}
                  </span>
                </motion.button>
                {item.divider && (
                  <div className="my-1 border-t border-gray-100" />
                )}
              </div>
            ))}

            {/* Keyboard hint */}
            <div className="px-3 py-2 border-t border-gray-100 mt-1">
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px]">↑↓</kbd>
                <span>Navigate</span>
                <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px]">Enter</kbd>
                <span>Select</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )

  return typeof window !== 'undefined' ? createPortal(content, document.body) : null
}
