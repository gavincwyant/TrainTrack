"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { ClientMobileNav } from "./ClientMobileNav"
import { ClientNav } from "./ClientNav"

type Props = {
  userEmail: string
  clientName: string
}

export function ClientHeader({ userEmail, clientName }: Props) {
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
          bg-white dark:bg-gray-900 shadow dark:shadow-gray-800/50
          ${isMobile ? "fixed top-0 left-0 right-0 z-40 transition-transform duration-300" : ""}
          ${isMobile && hideHeader ? "-translate-y-full" : "translate-y-0"}
        `}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Mobile Navigation */}
              <ClientMobileNav userEmail={userEmail} />

              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">TrainTrack</h1>
              </div>
              <div className="hidden md:ml-6 md:flex md:space-x-8">
                <Link
                  href="/client/dashboard"
                  className="border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  href="/client/appointments"
                  className="border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Appointments
                </Link>
                <Link
                  href="/client/workouts"
                  className="border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Workouts
                </Link>
                <Link
                  href="/client/invoices"
                  className="border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Invoices
                </Link>
              </div>
            </div>
            <div className="hidden md:flex items-center">
              <ClientNav clientName={clientName} />
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
