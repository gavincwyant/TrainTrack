"use client"

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'

export type SlideOverPosition = 'right' | 'left' | 'top' | 'bottom'

interface SlideOverPanelProps {
  isOpen: boolean
  onClose: () => void
  position?: SlideOverPosition
  children: React.ReactNode
  title?: string
  actions?: React.ReactNode
  width?: string
  allowDragClose?: boolean
  showBackdrop?: boolean
}

export function SlideOverPanel({
  isOpen,
  onClose,
  position = 'right',
  children,
  title,
  actions,
  width = '400px',
  allowDragClose = true,
  showBackdrop = true,
}: SlideOverPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)

  // Focus trap
  useEffect(() => {
    if (!isOpen) return

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusableElements = panelRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )

      if (!focusableElements || focusableElements.length === 0) return

      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTabKey)
    return () => document.removeEventListener('keydown', handleTabKey)
  }, [isOpen])

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when open
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

  const getSlideVariants = () => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

    if (isMobile) {
      // Mobile: always slide from bottom
      return {
        hidden: { y: '100%' },
        visible: { y: 0 },
        exit: { y: '100%' },
      }
    }

    // Desktop: slide from specified position
    switch (position) {
      case 'right':
        return {
          hidden: { x: '100%' },
          visible: { x: 0 },
          exit: { x: '100%' },
        }
      case 'left':
        return {
          hidden: { x: '-100%' },
          visible: { x: 0 },
          exit: { x: '-100%' },
        }
      case 'top':
        return {
          hidden: { y: '-100%' },
          visible: { y: 0 },
          exit: { y: '-100%' },
        }
      case 'bottom':
        return {
          hidden: { y: '100%' },
          visible: { y: 0 },
          exit: { y: '100%' },
        }
    }
  }

  const getPositionStyles = () => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

    if (isMobile) {
      return {
        position: 'fixed' as const,
        bottom: 0,
        left: 0,
        right: 0,
        height: '90vh',
        width: '100%',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
      }
    }

    const baseStyles = {
      position: 'fixed' as const,
      top: 0,
      height: '100vh',
    }

    switch (position) {
      case 'right':
        return { ...baseStyles, right: 0, width }
      case 'left':
        return { ...baseStyles, left: 0, width }
      case 'top':
        return { position: 'fixed' as const, top: 0, left: 0, right: 0, height: width }
      case 'bottom':
        return { position: 'fixed' as const, bottom: 0, left: 0, right: 0, height: width }
    }
  }

  const handleDragEnd = (event: any, info: any) => {
    if (!allowDragClose) return

    const threshold = 100
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

    if (isMobile) {
      // Mobile: drag down to close
      if (info.offset.y > threshold) {
        onClose()
      }
    } else {
      // Desktop: drag in appropriate direction
      switch (position) {
        case 'right':
          if (info.offset.x > threshold) onClose()
          break
        case 'left':
          if (info.offset.x < -threshold) onClose()
          break
        case 'top':
          if (info.offset.y < -threshold) onClose()
          break
        case 'bottom':
          if (info.offset.y > threshold) onClose()
          break
      }
    }
  }

  if (typeof window === 'undefined') return null

  const content = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          {showBackdrop && (
            <motion.div
              initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
              exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              transition={{ duration: 0.3 }}
              onClick={onClose}
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                zIndex: 9998,
              }}
            />
          )}

          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={getSlideVariants()}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
            }}
            drag={allowDragClose ? (typeof window !== 'undefined' && window.innerWidth < 768 ? 'y' : position === 'right' || position === 'left' ? 'x' : 'y') : false}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            style={{
              ...getPositionStyles(),
              zIndex: 9999,
              backgroundColor: 'var(--calendar-bg-primary)',
              boxShadow: 'var(--shadow-2xl)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Drag handle for mobile */}
            {typeof window !== 'undefined' && window.innerWidth < 768 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '12px',
                  cursor: 'grab',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '4px',
                    backgroundColor: 'var(--calendar-neutral)',
                    borderRadius: '2px',
                    opacity: 0.3,
                  }}
                />
              </div>
            )}

            {/* Header */}
            {(title || actions) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '20px 24px',
                  borderBottom: '1px solid var(--calendar-bg-tertiary)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={onClose}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--calendar-bg-hover)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                  </button>
                  {title && (
                    <h2
                      style={{
                        margin: 0,
                        fontSize: '18px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {title}
                    </h2>
                  )}
                </div>
                {actions && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {actions}
                  </div>
                )}
              </div>
            )}

            {/* Content */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px',
              }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return createPortal(content, document.body)
}
