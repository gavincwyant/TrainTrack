'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ConfettiParticle {
  id: string
  x: number
  y: number
  rotation: number
  delay: number
}

interface ConfettiEffectProps {
  onComplete?: () => void
  intensity?: 'subtle' | 'full'
}

export function ConfettiEffect({ onComplete, intensity = 'subtle' }: ConfettiEffectProps) {
  const [particles, setParticles] = useState<ConfettiParticle[]>([])
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Generate particles based on intensity
    const particleCount = intensity === 'subtle' ? 8 : 20
    const generatedParticles: ConfettiParticle[] = []

    for (let i = 0; i < particleCount; i++) {
      generatedParticles.push({
        id: `particle-${i}`,
        x: Math.random() * 100, // Random X position (0-100%)
        y: Math.random() * 100, // Random Y position (0-100%)
        rotation: Math.random() * 360, // Random initial rotation
        delay: Math.random() * 0.2, // Stagger animation start (0-200ms)
      })
    }

    setParticles(generatedParticles)

    // Auto-cleanup after animation completes
    const timer = setTimeout(() => {
      setIsVisible(false)
      onComplete?.()
    }, 800 + 200) // 800ms animation + 200ms buffer

    return () => clearTimeout(timer)
  }, [intensity, onComplete])

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute w-2 h-2 rounded-sm"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                backgroundColor: '#10b981', // Success green
              }}
              initial={{
                scale: 0,
                rotate: 0,
                opacity: 1,
              }}
              animate={{
                scale: [0, 1.5, 2],
                rotate: [0, 180],
                opacity: [1, 1, 0],
                x: [(Math.random() - 0.5) * 100, (Math.random() - 0.5) * 200],
                y: [0, (Math.random() - 0.5) * 200],
              }}
              transition={{
                duration: 0.8,
                delay: particle.delay,
                ease: [0.175, 0.885, 0.32, 1.275], // Spring easing
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  )
}
