'use client'

import { motion } from 'framer-motion'
import { Calendar, Plus } from 'lucide-react'

interface EmptyStateProps {
  message?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  message = 'No appointments scheduled',
  actionLabel = 'Schedule First Session',
  onAction,
}: EmptyStateProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-20 px-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.175, 0.885, 0.32, 1.275] }}
    >
      {/* Animated calendar illustration */}
      <motion.div
        className="relative mb-6"
        initial={{ scale: 0.8, rotate: -5 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.175, 0.885, 0.32, 1.275] }}
      >
        {/* Decorative background circles */}
        <motion.div
          className="absolute inset-0 -z-10"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1.2, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div
            className="w-32 h-32 rounded-full"
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
            }}
          />
        </motion.div>

        <motion.div
          className="absolute -top-2 -right-2 -z-10"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div
            className="w-20 h-20 rounded-full"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(59, 130, 246, 0.08) 100%)',
            }}
          />
        </motion.div>

        {/* Calendar icon */}
        <motion.div
          className="relative flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg"
          whileHover={{ scale: 1.05, rotate: 3 }}
          transition={{ duration: 0.3 }}
          style={{
            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)',
          }}
        >
          <Calendar className="w-12 h-12 text-white" strokeWidth={2} />

          {/* Animated plus indicator */}
          <motion.div
            className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.5, delay: 0.6, ease: [0.175, 0.885, 0.32, 1.275] }}
          >
            <Plus className="w-5 h-5 text-blue-600" strokeWidth={3} />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Message */}
      <motion.h3
        className="text-xl font-semibold text-gray-900 dark:text-white mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {message}
      </motion.h3>

      <motion.p
        className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center max-w-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        Get started by scheduling your first appointment with a client
      </motion.p>

      {/* CTA button */}
      {onAction && (
        <motion.button
          className="group relative overflow-hidden rounded-xl px-6 py-3 font-semibold text-white shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            boxShadow: 'var(--shadow-glow-blue)',
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          whileHover={{ scale: 1.05, boxShadow: '0 8px 32px rgba(59, 130, 246, 0.4)' }}
          whileTap={{ scale: 0.98 }}
          onClick={onAction}
        >
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 -z-10"
            initial={{ x: '-100%' }}
            whileHover={{ x: '100%' }}
            transition={{ duration: 0.6 }}
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
            }}
          />

          <span className="relative flex items-center gap-2">
            <Plus className="w-5 h-5" strokeWidth={2.5} />
            {actionLabel}
          </span>
        </motion.button>
      )}

      {/* Decorative dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-blue-200 dark:bg-blue-900"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.6, scale: 1 }}
            transition={{ delay: 0.7 + i * 0.1, duration: 0.3 }}
          />
        ))}
      </div>
    </motion.div>
  )
}
