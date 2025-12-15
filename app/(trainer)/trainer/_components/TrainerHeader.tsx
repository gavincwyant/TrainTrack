"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import PendingAppointmentsBadge from "@/components/PendingAppointmentsBadge"
import { TrainerNav } from "./TrainerNav"
import { TrainerMobileNav } from "./TrainerMobileNav"

type Props = {
  trainerName: string
  isSystemAdmin: boolean
}

export function TrainerHeader({ trainerName, isSystemAdmin }: Props) {
  const [hideHeader, setHideHeader] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const lastScrollY = useRef(0)

  useEffect(() => {
    // Check if mobile on mount and resize
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    if (!isMobile) {
      setHideHeader(false)
      return
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY

      // Always show when near top
      if (currentScrollY < 50) {
        setHideHeader(false)
        lastScrollY.current = currentScrollY
        return
      }

      // Scrolling down - hide
      if (currentScrollY > lastScrollY.current + 10) {
        setHideHeader(true)
      }
      // Scrolling up - show
      else if (currentScrollY < lastScrollY.current - 10) {
        setHideHeader(false)
      }

      lastScrollY.current = currentScrollY
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [isMobile])

  return (
    <>
      {/* Spacer to prevent content jump when header is fixed on mobile */}
      {isMobile && <div className="h-16" />}

      <nav
        className={`
          bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700
          ${isMobile ? "fixed top-0 left-0 right-0 z-40 transition-transform duration-300" : ""}
          ${isMobile && hideHeader ? "-translate-y-full" : "translate-y-0"}
        `}
      >
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4 md:space-x-8">
              {/* Mobile hamburger menu */}
              <TrainerMobileNav
                trainerName={trainerName}
                isSystemAdmin={isSystemAdmin}
              />
              <Link href="/trainer/dashboard" className="text-xl font-bold text-gray-900 dark:text-gray-100">
                TrainTrack
              </Link>
              <div className="hidden md:flex space-x-4">
                <Link
                  href="/trainer/dashboard"
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  href="/trainer/clients"
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Clients
                </Link>
                <Link
                  href="/trainer/calendar"
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Calendar
                </Link>
                <PendingAppointmentsBadge />
                <Link
                  href="/trainer/workouts"
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Workouts
                </Link>
                <Link
                  href="/trainer/metrics"
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Metrics
                </Link>
                <Link
                  href="/trainer/invoices"
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Invoices
                </Link>
                <Link
                  href="/trainer/analytics"
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Analytics
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <TrainerNav trainerName={trainerName} isSystemAdmin={isSystemAdmin} />
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
