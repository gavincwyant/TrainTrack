'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface QuickActionButtonsProps {
  onComplete: () => void
  onEdit: () => void
  onCancel: () => void
  position?: 'top-right' | 'bottom'
}

export function QuickActionButtons({
  onComplete,
  onEdit,
  onCancel,
  position = 'top-right',
}: QuickActionButtonsProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)

  const positionClasses = {
    'top-right': 'top-3 right-3',
    bottom: 'bottom-3 right-3',
  }

  const handleAction = (action: () => void) => {
    setIsVisible(false)
    action()
  }

  return (
    <div
      className={`absolute ${positionClasses[position]} z-10`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => {
        setIsVisible(false)
        setActiveTooltip(null)
      }}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {/* Mobile: Tap to show, desktop: hover */}
      <div
        className="md:hidden w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center cursor-pointer"
        onClick={() => setIsVisible(!isVisible)}
      >
        <svg
          className="w-5 h-5 text-gray-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
      </div>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            className="flex gap-2"
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{
              duration: 0.15,
              ease: 'easeOut',
            }}
          >
            {/* Complete Button */}
            <div className="relative">
              <motion.button
                onClick={() => handleAction(onComplete)}
                onMouseEnter={() => setActiveTooltip('complete')}
                onMouseLeave={() => setActiveTooltip(null)}
                className="w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg hover:shadow-xl hover:shadow-green-500/30 flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 backdrop-blur-sm"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Mark Complete"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </motion.button>

              {/* Tooltip */}
              <AnimatePresence>
                {activeTooltip === 'complete' && (
                  <motion.div
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg whitespace-nowrap pointer-events-none"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.15 }}
                  >
                    Mark Complete
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Edit Button */}
            <div className="relative">
              <motion.button
                onClick={() => handleAction(onEdit)}
                onMouseEnter={() => setActiveTooltip('edit')}
                onMouseLeave={() => setActiveTooltip(null)}
                className="w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl hover:shadow-blue-500/30 flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 backdrop-blur-sm"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Edit Appointment"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </motion.button>

              {/* Tooltip */}
              <AnimatePresence>
                {activeTooltip === 'edit' && (
                  <motion.div
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg whitespace-nowrap pointer-events-none"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.15 }}
                  >
                    Edit Appointment
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Cancel Button */}
            <div className="relative">
              <motion.button
                onClick={() => handleAction(onCancel)}
                onMouseEnter={() => setActiveTooltip('cancel')}
                onMouseLeave={() => setActiveTooltip(null)}
                className="w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg hover:shadow-xl hover:shadow-red-500/30 flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 backdrop-blur-sm"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Cancel Appointment"
              >
                <svg
                  className="w-5 h-5"
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
              </motion.button>

              {/* Tooltip */}
              <AnimatePresence>
                {activeTooltip === 'cancel' && (
                  <motion.div
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg whitespace-nowrap pointer-events-none"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.15 }}
                  >
                    Cancel Appointment
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
