"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"

type Props = {
  videoSrc?: string      // For self-hosted video
  vimeoId?: string       // For Vimeo embed
  thumbnailSrc?: string  // Optional custom thumbnail
}

export function VideoPlayer({ videoSrc, vimeoId, thumbnailSrc }: Props) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasEnded, setHasEnded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Listen for Vimeo player events via postMessage
  useEffect(() => {
    if (!vimeoId || !isPlaying) return

    const handleMessage = (event: MessageEvent) => {
      // Vimeo sends messages from their domain
      if (event.origin !== "https://player.vimeo.com") return

      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data
        if (data.event === "ended") {
          setIsPlaying(false)
          setHasEnded(true)
        }
      } catch {
        // Ignore non-JSON messages
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [vimeoId, isPlaying])

  const handlePlayClick = () => {
    setIsPlaying(true)
    setHasEnded(false)

    if (videoRef.current) {
      videoRef.current.play()
    }
  }

  const handleVideoEnd = () => {
    setIsPlaying(false)
    setHasEnded(true)
  }

  const handleReplay = () => {
    setHasEnded(false)
    setIsPlaying(true)

    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.play()
    }
  }

  return (
    <div className="relative aspect-video bg-gradient-to-br from-[var(--surface-secondary)] to-[var(--border)] rounded-3xl border-2 border-[var(--border)] shadow-2xl dark:shadow-black/40 overflow-hidden group">
      {!isPlaying && !hasEnded && (
        <>
          {/* Thumbnail image or gradient background */}
          {thumbnailSrc ? (
            <img
              src={thumbnailSrc}
              alt="Video thumbnail"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 dark:from-blue-400/10 dark:to-indigo-400/10"></div>
          )}
          {/* Overlay for better play button visibility on thumbnails */}
          {thumbnailSrc && (
            <div className="absolute inset-0 bg-black/20"></div>
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <button
              onClick={handlePlayClick}
              className="w-24 h-24 rounded-full bg-blue-600 dark:bg-blue-500 shadow-2xl dark:shadow-blue-500/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-500/50 dark:focus:ring-blue-400/50"
              aria-label="Play video"
            >
              <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            <p className="mt-6 text-[var(--text-secondary)] font-medium text-lg">Watch the demo</p>
          </div>
          {/* Decorative browser chrome elements */}
          <div className="absolute top-4 left-4 w-3 h-3 rounded-full bg-red-500 dark:bg-red-400"></div>
          <div className="absolute top-4 left-10 w-3 h-3 rounded-full bg-yellow-500 dark:bg-yellow-400"></div>
          <div className="absolute top-4 left-16 w-3 h-3 rounded-full bg-green-500 dark:bg-green-400"></div>
        </>
      )}

      {hasEnded && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/95 via-blue-700/95 to-indigo-800/95 dark:from-blue-700/95 dark:via-blue-800/95 dark:to-indigo-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
          <h3 className="text-3xl sm:text-4xl font-bold text-white mb-4 text-center">
            Ready to simplify your training business?
          </h3>
          <p className="text-blue-100 dark:text-blue-50 text-lg mb-8 text-center max-w-2xl">
            Join our free beta and get 2–3 months of access with white-glove onboarding
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/signup"
              className="px-8 py-4 text-lg font-semibold text-blue-600 dark:text-blue-700 bg-white dark:bg-gray-50 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-100 transition-all duration-300 hover:shadow-2xl hover:scale-105 flex items-center gap-2"
            >
              Get early access
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <button
              onClick={handleReplay}
              className="px-8 py-4 text-lg font-semibold text-white border-2 border-white/30 dark:border-white/40 rounded-xl hover:bg-white/10 dark:hover:bg-white/15 transition-all duration-300 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Watch again
            </button>
          </div>
        </div>
      )}

      {/* Vimeo iframe - only render when playing */}
      {vimeoId && isPlaying && (
        <iframe
          ref={iframeRef}
          src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1&title=0&byline=0&portrait=0&api=1`}
          className="absolute inset-0 w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      )}

      {/* Self-hosted video */}
      {videoSrc && (
        <video
          ref={videoRef}
          controls={isPlaying}
          className={`w-full h-full object-cover ${isPlaying && !vimeoId ? "visible" : "invisible"}`}
          onEnded={handleVideoEnd}
          preload="metadata"
        >
          <source src={videoSrc} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      )}
    </div>
  )
}
