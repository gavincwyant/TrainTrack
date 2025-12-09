import Link from "next/link"
import { TypingTitle } from "./_components/TypingTitle"
import { VideoPlayer } from "./_components/VideoPlayer"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--surface)]/95 backdrop-blur-sm border-b border-[var(--border)]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-[var(--text-primary)]">
            TrainTrack
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all hover:shadow-lg hover:shadow-blue-600/25"
            >
              Get Early Access
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Subtle gradient orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl"></div>
            <div className="absolute top-20 -right-4 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl"></div>
          </div>

          <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
            <div className="max-w-5xl mx-auto text-center">
              <TypingTitle />
              <p className="mt-8 text-xl sm:text-2xl text-[var(--text-secondary)] max-w-3xl mx-auto leading-relaxed font-light">
                A simple back-office app for personal trainers that automates scheduling,
                invoices, and revenue tracking—so tax season doesn&apos;t suck.
              </p>
              <div className="mt-12 flex flex-col sm:flex-row gap-5 justify-center items-center">
                <Link
                  href="/signup"
                  className="group relative w-full sm:w-auto px-10 py-5 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl hover:from-blue-700 hover:to-blue-600 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-600/30 hover:-translate-y-1 overflow-hidden"
                >
                  <span className="relative z-10 flex flex-col items-center">
                    <span>Get early access</span>
                    <span className="text-sm font-normal text-blue-100 mt-1">
                      Free for first 3–6 months
                    </span>
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Link>
                <a
                  href="#demo"
                  className="flex items-center gap-3 px-7 py-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-300 group rounded-2xl hover:bg-[var(--surface-secondary)]"
                >
                  <span className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--surface-secondary)] group-hover:bg-blue-500/10 transition-all duration-300 group-hover:scale-110">
                    <svg className="w-5 h-5 text-blue-600 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                  <span className="font-medium text-lg">Watch demo</span>
                </a>
              </div>
            </div>

            {/* Video Demo */}
            <div id="demo" className="mt-20 sm:mt-24 max-w-5xl mx-auto scroll-mt-24">
              <VideoPlayer videoSrc="/train_track_demo_v1.mp4" />
            </div>
          </div>
        </section>

        {/* Who It's For Section */}
        <section className="py-24 sm:py-32 bg-[var(--surface)]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-[var(--text-primary)] leading-tight">
                Built for real trainers, not big box gyms
              </h2>
              <p className="mt-6 text-xl text-[var(--text-secondary)] font-light">
                This app is designed for:
              </p>
            </div>
            <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-8">
              <div className="group flex flex-col items-center text-center p-8 rounded-3xl bg-[var(--surface-secondary)] border border-[var(--border)] hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 hover:-translate-y-1">
                <div className="w-20 h-20 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:bg-blue-500/15 transition-colors duration-300">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Independent personal trainers</h3>
              </div>
              <div className="group flex flex-col items-center text-center p-8 rounded-3xl bg-[var(--surface-secondary)] border border-[var(--border)] hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 hover:-translate-y-1">
                <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:bg-indigo-500/15 transition-colors duration-300">
                  <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Small studios and mobile gyms</h3>
              </div>
              <div className="group flex flex-col items-center text-center p-8 rounded-3xl bg-[var(--surface-secondary)] border border-[var(--border)] hover:border-purple-500/30 hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300 hover:-translate-y-1">
                <div className="w-20 h-20 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 group-hover:bg-purple-500/15 transition-colors duration-300">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Hybrid / online coaches across time zones</h3>
              </div>
            </div>
            <p className="mt-16 text-center text-lg text-[var(--text-secondary)] max-w-3xl mx-auto leading-relaxed">
              If you&apos;re booking <span className="font-semibold text-[var(--text-primary)]">10–50+ sessions a week</span> and
              bouncing between texts, spreadsheets, and payment apps, <span className="text-[var(--text-primary)]">this is for you.</span>
            </p>
          </div>
        </section>

        {/* Problem / Pain Section */}
        <section className="py-24 sm:py-32 relative overflow-hidden">
          {/* Subtle background accent */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-500/[0.02] to-transparent pointer-events-none"></div>

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl sm:text-5xl font-bold text-[var(--text-primary)] text-center mb-16 leading-tight">
                Right now, your &quot;system&quot; probably looks like:
              </h2>
              <div className="space-y-5">
                {[
                  "Sessions scattered across 3 different calendars",
                  "Clients texting to move sessions at the last minute",
                  "Venmo / Zelle / cash everywhere, nothing reconciled",
                  "A panic spreadsheet every time tax season rolls around",
                ].map((pain, index) => (
                  <div
                    key={index}
                    className="group flex items-start gap-5 p-6 bg-[var(--surface-secondary)] rounded-2xl border border-[var(--border)] hover:border-red-500/20 hover:shadow-lg transition-all duration-300"
                  >
                    <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/15 transition-colors">
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </span>
                    <p className="text-[var(--text-secondary)] text-lg leading-relaxed pt-1">{pain}</p>
                  </div>
                ))}
              </div>
              <div className="mt-14 text-center p-8 bg-[var(--surface-secondary)]/50 rounded-2xl border border-[var(--border)]">
                <p className="text-xl text-[var(--text-secondary)] leading-relaxed">
                  It works… until you get busy.{" "}
                  <span className="block mt-3 text-2xl font-semibold text-[var(--text-primary)]">
                    Then you&apos;re doing an extra 5–10 hours of unpaid admin every week.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Solution Section */}
        <section className="py-24 sm:py-32 bg-[var(--surface)]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center mb-20">
              <h2 className="text-4xl sm:text-5xl font-bold text-[var(--text-primary)] leading-tight">
                Your simple back office for training
              </h2>
              <p className="mt-6 text-xl text-[var(--text-secondary)] font-light">
                Our app keeps the boring stuff organized so you can focus on coaching:
              </p>
            </div>
            <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8 lg:gap-10">
              {/* Smart Scheduling */}
              <div className="group relative p-10 bg-[var(--surface)] rounded-3xl border-2 border-[var(--border)] shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-2">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:from-blue-500/20 group-hover:to-blue-600/20 transition-all duration-300">
                  <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Smart Scheduling</h3>
                <ul className="space-y-4 text-[var(--text-secondary)]">
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>See all your sessions in one calendar</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Handle recurring sessions and cancellations cleanly</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Avoid double-bookings and &quot;Wait… when were we meeting?&quot;</span>
                  </li>
                </ul>
              </div>

              {/* Invoices on Autopilot */}
              <div className="group relative p-10 bg-[var(--surface)] rounded-3xl border-2 border-[var(--border)] shadow-lg hover:shadow-2xl hover:shadow-green-500/10 hover:border-green-500/50 transition-all duration-300 hover:-translate-y-2">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-600/10 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:from-green-500/20 group-hover:to-green-600/20 transition-all duration-300">
                  <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Invoices on Autopilot</h3>
                <ul className="space-y-4 text-[var(--text-secondary)]">
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Auto-generate invoices from your schedule</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Track who&apos;s paid, who hasn&apos;t, and send reminders</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Support for packages, drop-ins, and recurring clients</span>
                  </li>
                </ul>
              </div>

              {/* Tax-Ready Reports */}
              <div className="group relative p-10 bg-[var(--surface)] rounded-3xl border-2 border-[var(--border)] shadow-lg hover:shadow-2xl hover:shadow-purple-500/10 hover:border-purple-500/50 transition-all duration-300 hover:-translate-y-2">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-600/10 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:from-purple-500/20 group-hover:to-purple-600/20 transition-all duration-300">
                  <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Tax-Ready Reports</h3>
                <ul className="space-y-4 text-[var(--text-secondary)]">
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Monthly and yearly revenue summaries</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Categorize income for taxes</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Export in a few clicks for your accountant or tax software</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof / Beta Section */}
        <section className="py-20 sm:py-24 bg-[var(--surface-secondary)]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
                  Shaped with real trainers
                </h2>
                <p className="mt-4 text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
                  We&apos;re working closely with independent trainers and mobile studios to build
                  something actually useful in the real world—not another giant &quot;gym management&quot; system.
                </p>
              </div>
              <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-lg p-8 sm:p-10">
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-6 text-center">
                  As an early user, you get:
                </h3>
                <div className="grid sm:grid-cols-3 gap-6">
                  <div className="flex flex-col items-center text-center p-4">
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-[var(--text-primary)] mb-1">3–6 months free</h4>
                    <p className="text-sm text-[var(--text-secondary)]">No credit card required to start</p>
                  </div>
                  <div className="flex flex-col items-center text-center p-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-[var(--text-primary)] mb-1">White-glove setup</h4>
                    <p className="text-sm text-[var(--text-secondary)]">We&apos;ll help import your clients & sessions</p>
                  </div>
                  <div className="flex flex-col items-center text-center p-4">
                    <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-[var(--text-primary)] mb-1">Direct line to the builder</h4>
                    <p className="text-sm text-[var(--text-secondary)]">Request features and get real support</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="relative py-32 sm:py-40 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40"></div>
          <div className="absolute top-10 left-10 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl"></div>

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl sm:text-6xl font-bold text-white mb-8 leading-tight">
                Ready to spend less time on admin?
              </h2>
              <Link
                href="/signup"
                className="group inline-block px-12 py-6 text-xl font-semibold text-blue-600 bg-white rounded-2xl hover:bg-gray-50 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-105"
              >
                <span className="flex items-center gap-2">
                  Apply for the free trainer beta
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </Link>
              <div className="mt-12 p-6 bg-white/10 backdrop-blur-md rounded-2xl max-w-2xl mx-auto border border-white/20">
                <p className="text-blue-50 text-lg leading-relaxed">
                  We&apos;re letting in a small group of trainers at a time so we can give real support
                  and keep improving the product with your feedback.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[var(--surface-secondary)] border-t border-[var(--border)] py-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-[var(--text-secondary)] text-sm">
              &copy; {new Date().getFullYear()} TrainTrack. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="/login" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-colors">
                Login
              </Link>
              <Link href="/signup" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-colors">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
