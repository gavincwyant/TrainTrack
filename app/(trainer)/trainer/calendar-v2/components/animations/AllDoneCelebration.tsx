'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ConfettiEffect } from './ConfettiEffect'

interface AllDoneCelebrationProps {
  count: number
  onClose: () => void
  onViewTomorrow?: () => void
  isOpen: boolean
}

export function AllDoneCelebration({
  count,
  onClose,
  onViewTomorrow,
  isOpen,
}: AllDoneCelebrationProps) {
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Start confetti immediately
      setShowConfetti(true)

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 100, 50])
      }

      // Auto-dismiss after 10 seconds
      const autoDismissTimer = setTimeout(() => {
        onClose()
      }, 10000)

      return () => clearTimeout(autoDismissTimer)
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 pointer-events-auto relative overflow-hidden"
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{
                duration: 0.4,
                ease: [0.175, 0.885, 0.32, 1.275], // Spring easing
              }}
            >
              {/* Confetti Effect */}
              {showConfetti && (
                <ConfettiEffect
                  intensity="full"
                  onComplete={() => setShowConfetti(false)}
                />
              )}

              {/* Success Icon with Animation */}
              <motion.div
                className="flex justify-center mb-6"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  delay: 0.2,
                  duration: 0.5,
                  ease: [0.175, 0.885, 0.32, 1.275],
                }}
              >
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                  <svg
                    className="w-12 h-12 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <motion.path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.4, duration: 0.4 }}
                    />
                  </svg>
                </div>
              </motion.div>

              {/* Title */}
              <motion.h2
                className="text-3xl font-bold text-center text-gray-900 mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              >
                Amazing!
              </motion.h2>

              {/* Message */}
              <motion.p
                className="text-center text-gray-600 text-lg mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              >
                You completed all{' '}
                <span className="font-bold text-green-600">{count}</span>{' '}
                {count === 1 ? 'appointment' : 'appointments'} today!
              </motion.p>

              {/* Action Buttons */}
              <motion.div
                className="flex gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.3 }}
              >
                {onViewTomorrow && (
                  <button
                    onClick={onViewTomorrow}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
                  >
                    View Tomorrow
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
                >
                  Close
                </button>
              </motion.div>

              {/* Auto-dismiss indicator */}
              <motion.p
                className="text-center text-gray-400 text-xs mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.3 }}
              >
                Auto-dismisses in 10 seconds
              </motion.p>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
