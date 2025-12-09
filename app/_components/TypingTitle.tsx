"use client"

import { useState, useEffect } from "react"

export function TypingTitle() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showCursor, setShowCursor] = useState(true)
  const [hideCursor, setHideCursor] = useState(false)

  const fullText = "Less admin. More training."
  const typingSpeed = 90 // milliseconds per character
  const pauseAtDot = 1200 // pause after "Less admin." in milliseconds
  const cursorLingerTime = 2000 // how long cursor blinks after completion

  useEffect(() => {
    // Typing animation
    if (currentIndex < fullText.length) {
      // Add pause after "Less admin." (index 12 is the period)
      const delay = currentIndex === 12 ? pauseAtDot : typingSpeed

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

  const isComplete = currentIndex >= fullText.length

  // Cap cursor position at a specific character (e.g., at the last period)
  const cursorPosition = Math.min(currentIndex, fullText.length - 2)

  return (
    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-[var(--text-primary)] tracking-tight leading-tight relative">
      <span className="relative inline-block">
        {"Less admin. "}
        <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 bg-clip-text text-transparent">
          More training.
        </span>
      </span>

      {/* Overlay that reveals text character by character */}
      <span className="absolute inset-0 bg-[var(--surface)]" style={{
        clipPath: currentIndex >= fullText.length
          ? 'inset(0 0 0 100%)'
          : `inset(0 0 0 ${(currentIndex / fullText.length) * 100}%)`
      }} />

      {/* Cursor that moves with the reveal */}
      {!hideCursor && (
        <span
          className={`absolute top-0 w-0.5 h-full bg-blue-600 transition-opacity duration-100 ${
            showCursor ? "opacity-100" : "opacity-0"
          }`}
          style={{
            left: `calc(${(cursorPosition / fullText.length) * 100}%)`
          }}
        />
      )}
    </h1>
  )
}
