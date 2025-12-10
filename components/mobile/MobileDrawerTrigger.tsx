"use client"

type MobileDrawerTriggerProps = {
  onClick: () => void
  className?: string
}

export function MobileDrawerTrigger({ onClick, className = "" }: MobileDrawerTriggerProps) {
  return (
    <button
      onClick={onClick}
      className={`
        md:hidden
        p-2 rounded-md
        text-gray-600 dark:text-gray-300
        hover:text-gray-900 dark:hover:text-gray-100
        hover:bg-gray-100 dark:hover:bg-gray-800
        transition-colors
        min-h-[44px] min-w-[44px]
        flex items-center justify-center
        ${className}
      `}
      aria-label="Open menu"
      aria-expanded="false"
      aria-controls="mobile-menu"
    >
      <svg
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
    </button>
  )
}
