'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface CheckmarkAnimationProps {
  size?: number
  color?: string
  onComplete?: () => void
}

export function CheckmarkAnimation({
  size = 48,
  color = '#10b981', // Success green
  onComplete,
}: CheckmarkAnimationProps) {
  const [isAnimating, setIsAnimating] = useState(true)

  useEffect(() => {
    // Notify when animation completes
    const timer = setTimeout(() => {
      setIsAnimating(false)
      onComplete?.()
    }, 400)

    return () => clearTimeout(timer)
  }, [onComplete])

  // SVG checkmark path
  const checkmarkPath = 'M5 13l4 4L19 7'
  const pathLength = 24 // Approximate path length for the checkmark

  return (
    <motion.div
      className="flex items-center justify-center"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{
        duration: 0.3,
        ease: [0.175, 0.885, 0.32, 1.275], // Spring easing
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Circle background */}
        <motion.circle
          cx="12"
          cy="12"
          r="11"
          stroke={color}
          strokeWidth="2"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.2 }}
          transition={{
            duration: 0.4,
            ease: [0.175, 0.885, 0.32, 1.275],
          }}
        />

        {/* Checkmark path */}
        <motion.path
          d={checkmarkPath}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{
            duration: 0.4,
            ease: [0.175, 0.885, 0.32, 1.275],
            delay: 0.1, // Start slightly after circle
          }}
        />
      </svg>
    </motion.div>
  )
}
