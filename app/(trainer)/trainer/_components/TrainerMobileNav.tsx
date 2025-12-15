"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MobileDrawer, MobileDrawerTrigger } from "@/components/mobile"
import { SettingsModal } from "./SettingsModal"
import { handleSignOut } from "./actions"

type Props = {
  trainerName: string
  isSystemAdmin?: boolean
}

const navLinks = [
  { href: "/trainer/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/trainer/clients", label: "Clients", icon: UsersIcon },
  { href: "/trainer/calendar", label: "Calendar", icon: CalendarIcon },
  { href: "/trainer/pending", label: "Pending", icon: ClockIcon, showBadge: true },
  { href: "/trainer/workouts", label: "Workouts", icon: DumbbellIcon },
  { href: "/trainer/metrics", label: "Metrics", icon: ChartIcon },
  { href: "/trainer/invoices", label: "Invoices", icon: ReceiptIcon },
  { href: "/trainer/analytics", label: "Analytics", icon: BarChartIcon },
]

export function TrainerMobileNav({ trainerName, isSystemAdmin = false }: Props) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const pathname = usePathname()

  // Fetch pending count
  useEffect(() => {
    let isMounted = true

    const fetchPendingCount = async () => {
      try {
        const [appointmentsRes, profilesRes] = await Promise.all([
          fetch("/api/pending-appointments"),
          fetch("/api/pending-client-profiles"),
        ])

        const [appointmentsData, profilesData] = await Promise.all([
          appointmentsRes.json(),
          profilesRes.json(),
        ])

        const appointmentsCount = appointmentsRes.ok ? (appointmentsData.pendingAppointments?.length || 0) : 0
        const profilesCount = profilesRes.ok ? (profilesData.pendingProfiles?.length || 0) : 0

        if (isMounted) {
          setPendingCount(appointmentsCount + profilesCount)
        }
      } catch (error) {
        console.error("Failed to fetch pending count:", error)
      }
    }

    fetchPendingCount()
    const interval = setInterval(fetchPendingCount, 30000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  const handleSettingsClick = () => {
    setIsSettingsModalOpen(true)
    setIsDrawerOpen(false)
  }

  const onSignOut = async () => {
    setIsDrawerOpen(false)
    await handleSignOut()
  }

  return (
    <>
      <MobileDrawerTrigger onClick={() => setIsDrawerOpen(true)} />

      <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
        {/* Logo/Brand */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
            TrainTrack
          </span>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {trainerName}
          </p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/")
            const Icon = link.icon

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsDrawerOpen(false)}
                className={`
                  flex items-center px-3 py-3 rounded-lg text-sm font-medium
                  min-h-[44px] transition-colors
                  ${isActive
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }
                `}
              >
                <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
                <span className="flex-1">{link.label}</span>
                {link.showBadge && pendingCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </Link>
            )
          })}

          {/* Divider */}
          <div className="my-4 border-t border-gray-200 dark:border-gray-700" />

          {/* Settings */}
          <button
            onClick={handleSettingsClick}
            className="flex items-center w-full px-3 py-3 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] transition-colors"
          >
            <SettingsIcon className="h-5 w-5 mr-3 flex-shrink-0" />
            Settings
          </button>

          {/* Plan */}
          <Link
            href="/trainer/plan"
            onClick={() => setIsDrawerOpen(false)}
            className="flex items-center px-3 py-3 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] transition-colors"
          >
            <DocumentIcon className="h-5 w-5 mr-3 flex-shrink-0" />
            Plan
          </Link>

          {/* Admin (conditional) */}
          {isSystemAdmin && (
            <>
              <div className="my-4 border-t border-gray-200 dark:border-gray-700" />
              <Link
                href="/admin"
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center px-3 py-3 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] transition-colors"
              >
                <ShieldIcon className="h-5 w-5 mr-3 flex-shrink-0" />
                <span className="flex-1">Admin Dashboard</span>
                <span className="px-1.5 py-0.5 text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
                  ADMIN
                </span>
              </Link>
            </>
          )}
        </nav>

        {/* Sign Out - Bottom */}
        <div className="px-2 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onSignOut}
            className="flex items-center w-full px-3 py-3 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] transition-colors"
          >
            <LogoutIcon className="h-5 w-5 mr-3 flex-shrink-0" />
            Sign Out
          </button>
        </div>
      </MobileDrawer>

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </>
  )
}

// Icon Components
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function DumbbellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h2v12H4zM18 6h2v12h-2zM6 8h2v8H6zM16 8h2v8h-2zM8 10h8v4H8z" />
    </svg>
  )
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function ReceiptIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
    </svg>
  )
}

function BarChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  )
}
