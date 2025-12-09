'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface ProgressIndicatorProps {
  completed: number
  total: number
  onClick?: () => void
}

export function ProgressIndicator({ completed, total, onClick }: ProgressIndicatorProps) {
  const [prevCompleted, setPrevCompleted] = useState(completed)
  const [shouldPulse, setShouldPulse] = useState(false)

  const percentage = total > 0 ? (completed / total) * 100 : 0
  const circumference = 2 * Math.PI * 40 // radius = 40
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  // Determine color based on progress
  const getColor = () => {
    if (percentage >= 90) return { stroke: '#10b981', text: 'text-green-600', glow: 'shadow-green-500/30' }
    if (percentage >= 50) return { stroke: '#f59e0b', text: 'text-orange-600', glow: 'shadow-orange-500/30' }
    return { stroke: '#3b82f6', text: 'text-blue-600', glow: 'shadow-blue-500/30' }
  }

  const color = getColor()

  // Detect progress change and trigger pulse animation
  useEffect(() => {
    if (completed > prevCompleted) {
      setShouldPulse(true)

      // Haptic feedback on milestone
      if ('vibrate' in navigator) {
        if (percentage >= 90 || percentage >= 50) {
          navigator.vibrate(50)
        }
      }

      setTimeout(() => setShouldPulse(false), 600)
    }
    setPrevCompleted(completed)
  }, [completed, prevCompleted, percentage])

  return (
    <motion.div
      className={`relative cursor-pointer ${onClick ? 'hover:scale-105' : ''} transition-transform duration-200`}
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: 1,
        scale: shouldPulse ? [1, 1.1, 1] : 1,
      }}
      transition={{
        opacity: { duration: 0.3 },
        scale: { duration: 0.6, ease: [0.175, 0.885, 0.32, 1.275] },
      }}
    >
      <svg className="transform -rotate-90 w-24 h-24" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="40"
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-gray-200"
        />

        {/* Progress circle */}
        <motion.circle
          cx="50"
          cy="50"
          r="40"
          stroke={color.stroke}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{
            strokeDashoffset,
            filter: shouldPulse ? [
              'drop-shadow(0 0 0px rgba(16, 185, 129, 0))',
              'drop-shadow(0 0 8px rgba(16, 185, 129, 0.5))',
              'drop-shadow(0 0 0px rgba(16, 185, 129, 0))',
            ] : 'drop-shadow(0 0 0px rgba(16, 185, 129, 0))',
          }}
          transition={{
            strokeDashoffset: {
              duration: 0.8,
              ease: [0.175, 0.885, 0.32, 1.275],
            },
            filter: {
              duration: 0.6,
            },
          }}
          style={{
            strokeDasharray: circumference,
            willChange: 'stroke-dashoffset',
          }}
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          className={`text-2xl font-bold ${color.text}`}
          animate={shouldPulse ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.6, ease: [0.175, 0.885, 0.32, 1.275] }}
        >
          {completed}/{total}
        </motion.div>
        <div className="text-xs text-gray-500 font-medium mt-0.5">
          completed
        </div>
      </div>

      {/* Milestone celebration glow */}
      {shouldPulse && percentage >= 50 && (
        <motion.div
          className={`absolute inset-0 rounded-full ${color.glow}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 1.4] }}
          transition={{ duration: 0.6 }}
        />
      )}

      {/* Completion glow (100%) */}
      {percentage === 100 && (
        <motion.div
          className="absolute inset-0 rounded-full shadow-lg shadow-green-500/50"
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </motion.div>
  )
}
