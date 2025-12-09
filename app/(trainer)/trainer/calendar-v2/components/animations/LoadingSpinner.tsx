'use client'

interface LoadingSpinnerProps {
  size?: number
  color?: string
}

export function LoadingSpinner({
  size = 20,
  color = '#3b82f6', // Primary blue
}: LoadingSpinnerProps) {
  return (
    <div
      className="inline-block rounded-full border-2 border-transparent border-t-current animate-spin"
      style={{
        width: size,
        height: size,
        borderTopColor: color,
        borderRightColor: `${color}40`, // 25% opacity
        animationDuration: '600ms',
      }}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}
