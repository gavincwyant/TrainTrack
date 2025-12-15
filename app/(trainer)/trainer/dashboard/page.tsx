import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import Link from "next/link"
import { Appointment, User, WorkoutSession } from "@prisma/client"

type AppointmentWithClient = Appointment & {
  client: User
}

type WorkoutWithClient = WorkoutSession & {
  client: User
}

export default async function TrainerDashboardPage() {
  const session = await auth()

  if (!session?.user?.workspaceId) {
    return <div>No workspace found</div>
  }

  // Fetch dashboard statistics
  const [clientCount, upcomingAppointments, recentWorkouts] = await Promise.all([
    prisma.user.count({
      where: {
        workspaceId: session.user.workspaceId,
        role: "CLIENT",
      },
    }),
    prisma.appointment.findMany({
      where: {
        workspaceId: session.user.workspaceId,
        trainerId: session.user.id,
        startTime: {
          gte: new Date(),
        },
        status: "SCHEDULED",
      },
      include: {
        client: true,
      },
      orderBy: {
        startTime: "asc",
      },
      take: 5,
    }),
    prisma.workoutSession.findMany({
      where: {
        workspaceId: session.user.workspaceId,
        trainerId: session.user.id,
      },
      include: {
        client: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
  ])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Welcome back, {session.user.name}!</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Here&apos;s what&apos;s happening with your training business</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Clients</div>
          <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{clientCount}</div>
          <Link href="/trainer/clients" className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
            View all clients →
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Upcoming Sessions</div>
          <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{upcomingAppointments.length}</div>
          <Link href="/trainer/calendar" className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
            View calendar →
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">This Month&apos;s Workouts</div>
          <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{recentWorkouts.length}</div>
          <Link href="/trainer/workouts" className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
            View workouts →
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/trainer/clients/new"
            className="flex items-center justify-center px-4 py-3 border-2 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/30 font-medium"
          >
            + Add New Client
          </Link>
          <Link
            href="/trainer/calendar"
            className="flex items-center justify-center px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 font-medium"
          >
            Schedule Session
          </Link>
          <Link
            href="/trainer/invoices"
            className="flex items-center justify-center px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 font-medium"
          >
            View Invoices
          </Link>
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Upcoming Appointments</h2>
          <Link href="/trainer/calendar" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
            View all
          </Link>
        </div>
        {upcomingAppointments.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 text-center py-4">No upcoming appointments</p>
        ) : (
          <div className="space-y-3">
            {upcomingAppointments.map((appointment: AppointmentWithClient) => (
              <div
                key={appointment.id}
                className="flex justify-between items-center p-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-md"
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{appointment.client.fullName}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(appointment.startTime).toLocaleDateString()} at{" "}
                    {new Date(appointment.startTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <Link
                  href={`/trainer/appointments/${appointment.id}`}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Workouts */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Workout Sessions</h2>
          <Link href="/trainer/workouts" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
            View all
          </Link>
        </div>
        {recentWorkouts.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 text-center py-4">No workout sessions logged yet</p>
        ) : (
          <div className="space-y-3">
            {recentWorkouts.map((workout: WorkoutWithClient) => (
              <div
                key={workout.id}
                className="flex justify-between items-center p-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-md"
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{workout.client.fullName}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(workout.date).toLocaleDateString()}
                  </div>
                </div>
                <Link
                  href={`/trainer/workouts/${workout.id}`}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
