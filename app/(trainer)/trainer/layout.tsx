import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import Link from "next/link"
import PendingAppointmentsBadge from "@/components/PendingAppointmentsBadge"
import { TrainerNav } from "./_components/TrainerNav"
import { TrainerLayoutClient } from "./_components/TrainerLayoutClient"
import { prisma } from "@/lib/db"

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "TRAINER") {
    redirect("/dashboard")
  }

  // Fetch trainer settings for dark mode preference
  const settings = await prisma.trainerSettings.findUnique({
    where: { trainerId: session.user.id },
    select: { darkModeEnabled: true },
  })

  const content = (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-950 shadow-sm dark:shadow-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/trainer/dashboard" className="text-xl font-bold text-gray-900 dark:text-white">
                TrainTrack
              </Link>
              <div className="hidden md:flex space-x-4">
                <Link
                  href="/trainer/dashboard"
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  href="/trainer/clients"
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Clients
                </Link>
                <Link
                  href="/trainer/calendar"
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Calendar
                </Link>
                <PendingAppointmentsBadge />
                <Link
                  href="/trainer/workouts"
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Workouts
                </Link>
                <Link
                  href="/trainer/metrics"
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Metrics
                </Link>
                <Link
                  href="/trainer/invoices"
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Invoices
                </Link>
                <Link
                  href="/trainer/analytics"
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Analytics
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <TrainerNav trainerName={session.user.name || "Trainer"} />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )

  return (
    <TrainerLayoutClient darkModeEnabled={settings?.darkModeEnabled ?? false}>
      {content}
    </TrainerLayoutClient>
  )
}
