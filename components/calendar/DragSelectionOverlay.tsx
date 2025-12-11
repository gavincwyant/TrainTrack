"use client"

import { format } from "date-fns"
import { useEffect, useRef } from "react"

interface DragSelectionOverlayProps {
  bounds: {
    top: number
    height: number
    left: number
    width: number
  } | null
  startTime: Date | null
  endTime: Date | null
  isActive: boolean
  gutterInfo: { width: number; left: number }
  containerRef: React.RefObject<HTMLDivElement | null>
}

// Check if time is an exact hour (minutes === 0)
function isExactHour(date: Date): boolean {
  return date.getMinutes() === 0
}

// Get possible formats that the gutter might use for matching
function getGutterTimeVariants(date: Date): string[] {
  const hours = date.getHours()
  const hour12 = hours % 12 || 12
  const ampmUpper = hours >= 12 ? "PM" : "AM"
  const ampmLower = hours >= 12 ? "pm" : "am"

  // Return multiple possible formats the gutter might use
  return [
    `${hour12} ${ampmUpper}`,    // "7 AM"
    `${hour12} ${ampmLower}`,    // "7 am"
    `${hour12}${ampmUpper}`,     // "7AM"
    `${hour12}${ampmLower}`,     // "7am"
    `${hour12}:00 ${ampmUpper}`, // "7:00 AM"
    `${hour12}:00 ${ampmLower}`, // "7:00 am"
    format(date, "h a"),         // date-fns format
    format(date, "h:mm a"),      // date-fns format with minutes
  ]
}

export function DragSelectionOverlay({
  bounds,
  startTime,
  endTime,
  isActive,
  gutterInfo,
  containerRef,
}: DragSelectionOverlayProps) {
  const highlightedLabelsRef = useRef<HTMLElement[]>([])

  // Effect to highlight/unhighlight existing gutter labels for exact hours
  useEffect(() => {
    // Clean up previously highlighted labels
    highlightedLabelsRef.current.forEach(label => {
      label.classList.remove("drag-time-highlight")
    })
    highlightedLabelsRef.current = []

    if (!isActive || !startTime || !endTime || !containerRef.current) {
      return
    }

    // Find and highlight labels for exact hours
    // Try multiple selectors in case the structure varies
    let gutterLabels = containerRef.current.querySelectorAll(".rbc-time-gutter .rbc-label")
    if (gutterLabels.length === 0) {
      gutterLabels = containerRef.current.querySelectorAll(".rbc-time-gutter .rbc-timeslot-group .rbc-label")
    }
    if (gutterLabels.length === 0) {
      gutterLabels = containerRef.current.querySelectorAll(".rbc-label")
    }

    const startVariants = isExactHour(startTime) ? getGutterTimeVariants(startTime) : []
    const endVariants = isExactHour(endTime) ? getGutterTimeVariants(endTime) : []
    const allVariants = [...startVariants, ...endVariants]

    gutterLabels.forEach(label => {
      const labelText = label.textContent?.trim()
      if (labelText && allVariants.some(v => v.toLowerCase() === labelText.toLowerCase())) {
        label.classList.add("drag-time-highlight")
        highlightedLabelsRef.current.push(label as HTMLElement)
      }
    })

    // Cleanup on unmount or when selection changes
    return () => {
      highlightedLabelsRef.current.forEach(label => {
        label.classList.remove("drag-time-highlight")
      })
      highlightedLabelsRef.current = []
    }
  }, [isActive, startTime, endTime, containerRef])

  if (!isActive || !bounds || !startTime || !endTime) {
    return null
  }

  const showStartLabel = !isExactHour(startTime)
  const showEndLabel = !isExactHour(endTime)

  return (
    <>
      {/* Selection highlight box (no text inside) */}
      <div
        className="drag-selection-overlay active"
        style={{
          position: "fixed",
          top: bounds.top,
          left: bounds.left,
          width: bounds.width,
          height: bounds.height,
        }}
      />

      {/* Start time label - only show for non-exact hours */}
      {showStartLabel && (
        <div
          className="drag-time-label"
          style={{
            position: "fixed",
            top: bounds.top,
            left: gutterInfo.left,
            width: gutterInfo.width,
          }}
        >
          {format(startTime, "h:mm a")}
        </div>
      )}

      {/* End time label - only show for non-exact hours */}
      {showEndLabel && (
        <div
          className="drag-time-label drag-time-label-end"
          style={{
            position: "fixed",
            top: bounds.top + bounds.height,
            left: gutterInfo.left,
            width: gutterInfo.width,
          }}
        >
          {format(endTime, "h:mm a")}
        </div>
      )}
    </>
  )
}
