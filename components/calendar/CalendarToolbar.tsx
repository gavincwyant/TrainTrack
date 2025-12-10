"use client"

import { useState, useEffect } from "react"
import { ToolbarProps, View, NavigateAction } from "react-big-calendar"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CalendarToolbar(props: ToolbarProps<any, object>) {
  const { label, onNavigate, onView, view } = props
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const views: View[] = ["month", "week", "day", "agenda"]

  if (isMobile) {
    // Reorder views to put mobile-friendly options first
    const mobileViews: View[] = ["day", "agenda", "week", "month"]

    return (
      <div className="flex flex-col gap-3 pb-4">
        {/* Row 1: Date Label - centered, prominent */}
        <h2 className="text-xl font-bold text-center text-[var(--text-primary)]">
          {label}
        </h2>

        {/* Row 2: View Switcher - segmented control style */}
        <div className="flex rounded-xl border-2 border-[var(--border)] overflow-hidden">
          {mobileViews.map((v) => (
            <button
              key={v}
              onClick={() => onView(v)}
              className={`flex-1 py-2.5 min-h-[44px] text-sm font-medium transition-all duration-200 ${
                view === v
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white"
                  : "bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {/* Row 3: Navigation */}
        <div className="flex justify-between items-center gap-2">
          <button
            onClick={() => onNavigate("PREV" as NavigateAction)}
            className="p-3 min-h-[44px] min-w-[44px] border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] rounded-xl hover:bg-[var(--surface-secondary)] transition-all duration-200 flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => onNavigate("TODAY" as NavigateAction)}
            className="px-6 py-2.5 min-h-[44px] border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] rounded-xl hover:bg-[var(--surface-secondary)] transition-all duration-200 font-medium"
          >
            Today
          </button>
          <button
            onClick={() => onNavigate("NEXT" as NavigateAction)}
            className="p-3 min-h-[44px] min-w-[44px] border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] rounded-xl hover:bg-[var(--surface-secondary)] transition-all duration-200 flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  // Desktop: Return default-style toolbar layout
  return (
    <div className="rbc-toolbar">
      <span className="rbc-btn-group">
        <button type="button" onClick={() => onNavigate("TODAY" as NavigateAction)}>
          Today
        </button>
        <button type="button" onClick={() => onNavigate("PREV" as NavigateAction)}>
          Back
        </button>
        <button type="button" onClick={() => onNavigate("NEXT" as NavigateAction)}>
          Next
        </button>
      </span>
      <span className="rbc-toolbar-label">{label}</span>
      <span className="rbc-btn-group">
        {views.map((v) => (
          <button
            key={v}
            type="button"
            className={view === v ? "rbc-active" : ""}
            onClick={() => onView(v)}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </span>
    </div>
  )
}
