"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"

export default function PendingAppointmentsBadge() {
  const [count, setCount] = useState(0)

  const fetchCount = useCallback(async () => {
    try {
      const response = await fetch("/api/pending-appointments")
      const data = await response.json()
      if (response.ok) {
        setCount(data.pendingAppointments?.length || 0)
      }
    } catch (error) {
      // Silently fail - don't show errors in navigation
      console.error("Failed to fetch pending appointments count:", error)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCount()
    // Refresh count every 30 seconds
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [fetchCount])

  return (
    <Link
      href="/trainer/pending-appointments"
      className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium relative"
    >
      Pending
      {count > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
          {count}
        </span>
      )}
    </Link>
  )
}
