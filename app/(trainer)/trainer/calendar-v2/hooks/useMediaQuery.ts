'use client'

import { useState, useEffect } from 'react'

interface UseMediaQueryReturn {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

export function useMediaQuery(): UseMediaQueryReturn {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    // Check if window is defined (SSR safety)
    if (typeof window === 'undefined') {
      return
    }

    // Define media queries
    const mobileQuery = window.matchMedia('(max-width: 768px)')
    const tabletQuery = window.matchMedia('(min-width: 769px) and (max-width: 1024px)')

    // Handler to update state
    const updateMatches = () => {
      setIsMobile(mobileQuery.matches)
      setIsTablet(tabletQuery.matches)
    }

    // Set initial values
    updateMatches()

    // Add listeners for changes
    mobileQuery.addEventListener('change', updateMatches)
    tabletQuery.addEventListener('change', updateMatches)

    // Cleanup listeners
    return () => {
      mobileQuery.removeEventListener('change', updateMatches)
      tabletQuery.removeEventListener('change', updateMatches)
    }
  }, [])

  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
  }
}
