"use client"

import { useState, useEffect } from "react"

export function TypingTitle() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showCursor, setShowCursor] = useState(true)
  const [hideCursor, setHideCursor] = useState(false)
  const [isMobile, setIsMobile] = useState(true)

  const line1 = "Less admin."
  const line2 = "More training."
  const fullText = line1 + " " + line2
  const typingSpeed = isMobile ? 110 : 80 // milliseconds per character
  const pauseAtDot = 1200 // pause after "Less admin." in milliseconds
  const cursorLingerTime = 1500 // how long cursor blinks after completion

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    // Typing animation
    if (currentIndex < fullText.length) {
      // Add pause after "Less admin." (index 11 is the period, we pause after typing it)
      const delay = currentIndex === 11 ? pauseAtDot : typingSpeed

      const timeout = setTimeout(() => {
        setCurrentIndex(currentIndex + 1)
      }, delay)

      return () => clearTimeout(timeout)
    } else {
      // Once complete, hide cursor after lingering
      const hideTimeout = setTimeout(() => {
        setHideCursor(true)
      }, cursorLingerTime)

      return () => clearTimeout(hideTimeout)
    }
  }, [currentIndex])

  useEffect(() => {
    // Blinking cursor effect
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev)
    }, 530)

    return () => clearInterval(cursorInterval)
  }, [])

  // Get the visible portion of each line
  const visibleLine1 = fullText.slice(0, Math.min(currentIndex, line1.length))
  const visibleLine2 = currentIndex > line1.length + 1
    ? fullText.slice(line1.length + 1, currentIndex)
    : ""

  // Determine if cursor should be on line 1 or line 2
  const cursorOnLine1 = currentIndex <= line1.length + 1
  const isComplete = currentIndex >= fullText.length

  const cursor = !hideCursor && (
    <span className="relative inline-block w-0 h-0">
      <span
        className={`absolute left-0 top-[-0.9em] w-0.5 h-[1em] bg-blue-600 dark:bg-blue-400 transition-opacity duration-100 ${
          showCursor ? "opacity-100" : "opacity-0"
        }`}
      />
    </span>
  )

  return (
    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-[var(--text-primary)] tracking-tight leading-tight">
      <span className="block sm:inline">
        {visibleLine1}
        {cursorOnLine1 && !isComplete && cursor}
        <span className="invisible">{line1.slice(currentIndex)}</span>
      </span>
      <span className="hidden sm:inline"> </span>
      <span className="block sm:inline bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 dark:from-blue-500 dark:via-blue-400 dark:to-indigo-500 bg-clip-text text-transparent">
        {visibleLine2}
        {(!cursorOnLine1 || isComplete) && cursor}
        <span className="invisible">{line2.slice(visibleLine2.length)}</span>
      </span>
    </h1>
  )
}
