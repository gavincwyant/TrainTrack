"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { signIn, signOut, useSession } from "next-auth/react"

const signupSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

type SignupFormData = z.infer<typeof signupSchema>

export default function SignupPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Signup failed")
      }

      router.push("/login?registered=true")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const { data: session } = useSession()

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true)
    setError(null)
    try {
      if (session) {
        await signOut({ redirect: false })
      }
      await signIn("google", { callbackUrl: "/trainer/dashboard" })
    } catch {
      setError("Failed to sign in with Google")
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Hero/Value Prop */}
      <div className="relative lg:w-[55%] bg-[#0a1628] overflow-hidden">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0f2744] to-[#0a1628]" />

        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-gradient-to-r from-amber-500/20 to-orange-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-gradient-to-l from-blue-500/15 to-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />

        <div className="relative z-10 flex flex-col justify-between min-h-[400px] lg:min-h-screen p-8 lg:p-12 xl:p-16">
          {/* Logo */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/25 group-hover:shadow-orange-500/40 transition-shadow">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-semibold text-white tracking-tight">TrainTrack</span>
            </Link>
          </div>

          {/* Main Content */}
          <div className="py-8 lg:py-0">
            {/* Beta Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 mb-6">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-300 text-sm font-medium tracking-wide">Free Beta Access</span>
            </div>

            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-[1.1] tracking-tight mb-6">
              Run your training
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500">
                business smarter
              </span>
            </h1>

            <p className="text-lg text-slate-400 max-w-md mb-10 leading-relaxed">
              The all-in-one platform for personal trainers. Scheduling, invoicing, and client management—automated.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-3 mb-12">
              {[
                { icon: "📅", text: "Smart Scheduling" },
                { icon: "💰", text: "Auto Invoicing" },
                { icon: "👥", text: "Client Portal" },
              ].map((feature, i) => (
                <div
                  key={feature.text}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <span>{feature.icon}</span>
                  <span className="text-sm text-slate-300 font-medium">{feature.text}</span>
                </div>
              ))}
            </div>

            {/* Testimonial */}
            <div className="relative max-w-md">
              <div className="absolute -left-4 -top-2 text-6xl text-amber-500/20 font-serif">&ldquo;</div>
              <blockquote className="relative z-10">
                <p className="text-slate-300 italic leading-relaxed">
                  TrainTrack saved me 6+ hours a week on admin. I can finally focus on what I love—training my clients.
                </p>
                <footer className="mt-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-semibold text-sm">
                    MK
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm">Marcus K.</div>
                    <div className="text-slate-500 text-sm">Personal Trainer, Austin TX</div>
                  </div>
                </footer>
              </blockquote>
            </div>
          </div>

          {/* Social Proof Footer */}
          <div className="flex items-center gap-4 pt-6 border-t border-white/10">
            <div className="flex -space-x-2">
              {[
                { initials: "JD", gradient: "from-violet-400 to-purple-500" },
                { initials: "SR", gradient: "from-rose-400 to-pink-500" },
                { initials: "AK", gradient: "from-cyan-400 to-blue-500" },
                { initials: "TM", gradient: "from-amber-400 to-orange-500" },
                { initials: "+", gradient: "from-slate-400 to-slate-500" },
              ].map((avatar, i) => (
                <div
                  key={i}
                  className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatar.gradient} flex items-center justify-center text-white text-xs font-semibold ring-2 ring-[#0a1628]`}
                >
                  {avatar.initials}
                </div>
              ))}
            </div>
            <div className="text-sm">
              <span className="text-white font-semibold">50+ trainers</span>
              <span className="text-slate-500"> already onboard</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-white dark:bg-[#0f1419]">
        <div className="w-full max-w-[400px]">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">TrainTrack</span>
            </Link>
          </div>

          {/* Header */}
          <div className="text-center lg:text-left mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              Start for free
            </h2>
            <p className="mt-2 text-gray-600 dark:text-slate-400">
              No credit card required. Set up in 2 minutes.
            </p>
          </div>

          {/* Google Button - Primary CTA */}
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={isGoogleLoading}
            className="group relative w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl bg-white dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 text-gray-700 dark:text-white font-medium hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 dark:focus:ring-offset-[#0f1419] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>{isGoogleLoading ? "Connecting..." : "Continue with Google"}</span>
            <span className="text-xs text-gray-400 dark:text-slate-500 font-normal">— fastest</span>
          </button>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-[#0f1419] text-gray-500 dark:text-slate-500">
                or use email
              </span>
            </div>
          </div>

          {/* Email Form */}
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                  Full name
                </label>
                <input
                  {...register("fullName")}
                  type="text"
                  placeholder="Jane Smith"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 dark:focus:border-amber-500 transition-colors"
                />
                {errors.fullName && (
                  <p className="mt-1.5 text-sm text-red-500">{errors.fullName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                  Email
                </label>
                <input
                  {...register("email")}
                  type="email"
                  autoComplete="email"
                  placeholder="jane@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 dark:focus:border-amber-500 transition-colors"
                />
                {errors.email && (
                  <p className="mt-1.5 text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <input
                  {...register("password")}
                  type="password"
                  autoComplete="new-password"
                  placeholder="8+ characters"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 dark:focus:border-amber-500 transition-colors"
                />
                {errors.password && (
                  <p className="mt-1.5 text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 dark:focus:ring-offset-[#0f1419] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                "Create free account"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 space-y-4">
            <p className="text-center text-sm text-gray-600 dark:text-slate-400">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-amber-600 dark:text-amber-400 hover:text-amber-500 transition-colors">
                Sign in
              </Link>
            </p>

            <p className="text-center text-xs text-gray-500 dark:text-slate-500 leading-relaxed">
              By signing up, you agree to our{" "}
              <Link href="/terms" className="underline underline-offset-2 hover:text-gray-700 dark:hover:text-slate-300 transition-colors">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-gray-700 dark:hover:text-slate-300 transition-colors">
                Privacy Policy
              </Link>
            </p>
          </div>

          {/* Mobile Social Proof */}
          <div className="lg:hidden mt-10 pt-8 border-t border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-center gap-3">
              <div className="flex -space-x-2">
                {[
                  { initials: "JD", gradient: "from-violet-400 to-purple-500" },
                  { initials: "SR", gradient: "from-rose-400 to-pink-500" },
                  { initials: "AK", gradient: "from-cyan-400 to-blue-500" },
                ].map((avatar, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatar.gradient} flex items-center justify-center text-white text-xs font-semibold ring-2 ring-white dark:ring-[#0f1419]`}
                  >
                    {avatar.initials}
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                <span className="font-semibold text-gray-900 dark:text-white">50+ trainers</span> already onboard
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
