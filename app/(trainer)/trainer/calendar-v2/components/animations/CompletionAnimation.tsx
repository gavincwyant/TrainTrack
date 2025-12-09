'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ConfettiEffect } from './ConfettiEffect'
import { CheckmarkAnimation } from './CheckmarkAnimation'

interface CompletionAnimationProps {
  onComplete?: () => void
  intensity?: 'subtle' | 'full'
}

export function CompletionAnimation({ onComplete, intensity = 'subtle' }: CompletionAnimationProps) {
  const [stage, setStage] = useState<'checkmark' | 'gradient' | 'confetti' | 'fadeout'>('checkmark')
  const [showCheckmark, setShowCheckmark] = useState(true)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    // Check for prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Stage 1: Button transforms to checkmark (0-300ms)
    const checkmarkTimer = setTimeout(() => {
      setStage('gradient')
    }, 300)

    // Stage 2: Green gradient wash (300-600ms)
    const gradientTimer = setTimeout(() => {
      setStage('confetti')
      if (!prefersReducedMotion) {
        setShowConfetti(true)
      }
    }, 600)

    // Stage 3: Confetti burst (600-1000ms)
    const confettiTimer = setTimeout(() => {
      setStage('fadeout')
      setShowCheckmark(false)
    }, 1000)

    // Stage 4: Card fades out (1000-1500ms)
    const fadeoutTimer = setTimeout(() => {
      onComplete?.()
    }, 1500)

    // Haptic feedback on mobile
    if ('vibrate' in navigator && !prefersReducedMotion) {
      navigator.vibrate(50)
    }

    return () => {
      clearTimeout(checkmarkTimer)
      clearTimeout(gradientTimer)
      clearTimeout(confettiTimer)
      clearTimeout(fadeoutTimer)
    }
  }, [onComplete])

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
      {/* Stage 1 & 2: Checkmark Animation */}
      <AnimatePresence>
        {showCheckmark && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{
              duration: 0.3,
              ease: [0.175, 0.885, 0.32, 1.275], // Spring easing
            }}
          >
            <CheckmarkAnimation size={64} onComplete={() => {}} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stage 2: Green gradient wash */}
      <AnimatePresence>
        {(stage === 'gradient' || stage === 'confetti' || stage === 'fadeout') && (
          <motion.div
            className="absolute inset-0 rounded-xl"
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 0.15, 0.1],
              background: [
                'linear-gradient(135deg, rgba(59, 130, 246, 0) 0%, rgba(16, 185, 129, 0) 100%)',
                'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(16, 185, 129, 0.3) 100%)',
                'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.2) 100%)',
              ],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.3,
              ease: 'easeInOut',
            }}
            style={{
              willChange: 'opacity',
            }}
          />
        )}
      </AnimatePresence>

      {/* Stage 3: Confetti burst */}
      {showConfetti && (
        <ConfettiEffect
          intensity={intensity}
          onComplete={() => setShowConfetti(false)}
        />
      )}

      {/* Stage 4: Fadeout effect (applied to parent card) */}
      <AnimatePresence>
        {stage === 'fadeout' && (
          <motion.div
            className="absolute inset-0 bg-white rounded-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.5,
              ease: 'easeInOut',
            }}
            style={{
              willChange: 'opacity',
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
