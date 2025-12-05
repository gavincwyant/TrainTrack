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
        <h1 className="text-3xl font-bold text-gray-900">Welcome back, {session.user.name}!</h1>
        <p className="mt-2 text-gray-600">Here&apos;s what&apos;s happening with your training business</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Total Clients</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{clientCount}</div>
          <Link href="/trainer/clients" className="mt-2 text-sm text-blue-600 hover:text-blue-700">
            View all clients →
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Upcoming Sessions</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{upcomingAppointments.length}</div>
          <Link href="/trainer/calendar" className="mt-2 text-sm text-blue-600 hover:text-blue-700">
            View calendar →
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">This Month&apos;s Workouts</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{recentWorkouts.length}</div>
          <Link href="/trainer/workouts" className="mt-2 text-sm text-blue-600 hover:text-blue-700">
            View workouts →
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/trainer/clients/new"
            className="flex items-center justify-center px-4 py-3 border-2 border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 font-medium"
          >
            + Add New Client
          </Link>
          <Link
            href="/trainer/calendar"
            className="flex items-center justify-center px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
          >
            Schedule Session
          </Link>
          <Link
            href="/trainer/availability"
            className="flex items-center justify-center px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
          >
            Set Availability
          </Link>
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Appointments</h2>
          <Link href="/trainer/calendar" className="text-sm text-blue-600 hover:text-blue-700">
            View all
          </Link>
        </div>
        {upcomingAppointments.length === 0 ? (
          <p className="text-gray-600 text-center py-4">No upcoming appointments</p>
        ) : (
          <div className="space-y-3">
            {upcomingAppointments.map((appointment: AppointmentWithClient) => (
              <div
                key={appointment.id}
                className="flex justify-between items-center p-3 border border-gray-200 rounded-md"
              >
                <div>
                  <div className="font-medium text-gray-900">{appointment.client.fullName}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(appointment.startTime).toLocaleDateString()} at{" "}
                    {new Date(appointment.startTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <Link
                  href={`/trainer/appointments/${appointment.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Workouts */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Workout Sessions</h2>
          <Link href="/trainer/workouts" className="text-sm text-blue-600 hover:text-blue-700">
            View all
          </Link>
        </div>
        {recentWorkouts.length === 0 ? (
          <p className="text-gray-600 text-center py-4">No workout sessions logged yet</p>
        ) : (
          <div className="space-y-3">
            {recentWorkouts.map((workout: WorkoutWithClient) => (
              <div
                key={workout.id}
                className="flex justify-between items-center p-3 border border-gray-200 rounded-md"
              >
                <div>
                  <div className="font-medium text-gray-900">{workout.client.fullName}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(workout.date).toLocaleDateString()}
                  </div>
                </div>
                <Link
                  href={`/trainer/workouts/${workout.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
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
