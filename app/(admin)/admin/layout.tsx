import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { AdminMobileNav } from "./_components/AdminMobileNav"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  // Redirect non-authenticated users
  if (!session?.user) {
    redirect("/login")
  }

  // Redirect non-admins to their dashboard
  if (!session.user.isSystemAdmin) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Admin Navigation */}
      <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Mobile Navigation */}
              <AdminMobileNav userName={session.user.name || "Admin"} />

              <Link href="/admin" className="flex items-center">
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100">TrainTrack</span>
                <span className="ml-2 px-2 py-1 text-xs font-semibold bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 rounded">
                  ADMIN
                </span>
              </Link>
              <div className="ml-10 hidden md:flex items-center space-x-8">
                <Link
                  href="/admin"
                  className="text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  href="/admin/users"
                  className="text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
                >
                  Users
                </Link>
                <Link
                  href="/trainer/dashboard"
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Trainer View
                </Link>
              </div>
            </div>
            <div className="hidden md:flex items-center">
              <span className="text-sm text-gray-700 dark:text-gray-300">{session.user.name}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
