"use client"

import { useState, useRef } from "react"
import Link from "next/link"

export function VideoPlayer({ videoSrc }: { videoSrc: string }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasEnded, setHasEnded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handlePlayClick = () => {
    if (videoRef.current) {
      videoRef.current.play()
      setIsPlaying(true)
      setHasEnded(false)
    }
  }

  const handleVideoEnd = () => {
    setIsPlaying(false)
    setHasEnded(true)
  }

  const handleReplay = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.play()
      setIsPlaying(true)
      setHasEnded(false)
    }
  }

  return (
    <div className="relative aspect-video bg-gradient-to-br from-[var(--surface-secondary)] to-[var(--border)] rounded-3xl border-2 border-[var(--border)] shadow-2xl overflow-hidden group">
      {!isPlaying && !hasEnded && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5"></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <button
              onClick={handlePlayClick}
              className="w-24 h-24 rounded-full bg-blue-600 shadow-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-500/50"
              aria-label="Play video"
            >
              <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            <p className="mt-6 text-[var(--text-secondary)] font-medium text-lg">Watch the demo</p>
          </div>
          {/* Decorative browser chrome elements */}
          <div className="absolute top-4 left-4 w-3 h-3 rounded-full bg-red-500"></div>
          <div className="absolute top-4 left-10 w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="absolute top-4 left-16 w-3 h-3 rounded-full bg-green-500"></div>
        </>
      )}

      {hasEnded && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/95 via-blue-700/95 to-indigo-800/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
          <h3 className="text-3xl sm:text-4xl font-bold text-white mb-4 text-center">
            Ready to simplify your training business?
          </h3>
          <p className="text-blue-100 text-lg mb-8 text-center max-w-2xl">
            Join our free beta and get 3–6 months of access with white-glove onboarding
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/signup"
              className="px-8 py-4 text-lg font-semibold text-blue-600 bg-white rounded-xl hover:bg-gray-50 transition-all duration-300 hover:shadow-2xl hover:scale-105 flex items-center gap-2"
            >
              Get early access
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <button
              onClick={handleReplay}
              className="px-8 py-4 text-lg font-semibold text-white border-2 border-white/30 rounded-xl hover:bg-white/10 transition-all duration-300 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Watch again
            </button>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        controls={isPlaying}
        className={`w-full h-full object-cover ${isPlaying ? "visible" : "invisible"}`}
        onEnded={handleVideoEnd}
        preload="metadata"
      >
        <source src={videoSrc} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  )
}
