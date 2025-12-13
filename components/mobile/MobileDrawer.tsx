"use client"

import { useEffect, useCallback, useState } from "react"
import { createPortal } from "react-dom"

type MobileDrawerProps = {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  position?: "left" | "right"
}

export function MobileDrawer({
  isOpen,
  onClose,
  children,
  position = "left",
}: MobileDrawerProps) {
  const [mounted, setMounted] = useState(false)

  // Only render portal after component mounts (client-side only)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle escape key
  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    },
    [onClose]
  )

  // Lock body scroll and add keyboard listener when open
  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = "unset"
    }
  }, [isOpen, handleEscape])

  // Don't render anything until mounted (prevents SSR mismatch)
  if (!mounted) return null

  const translateClass =
    position === "left"
      ? isOpen
        ? "translate-x-0"
        : "-translate-x-full"
      : isOpen
        ? "translate-x-0"
        : "translate-x-full"

  const positionClass = position === "left" ? "left-0" : "right-0"
  const borderClass = position === "left" ? "border-r" : "border-l"

  return createPortal(
    <div
      className={`fixed inset-0 z-50 ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!isOpen}
    >
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`
          fixed inset-y-0 ${positionClass} z-50
          w-72 max-w-[80vw]
          bg-white dark:bg-gray-900
          ${borderClass} border-gray-200 dark:border-gray-700
          shadow-xl
          transform transition-transform duration-300 ease-out
          ${translateClass}
          flex flex-col
        `}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Close button */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Menu
          </span>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
