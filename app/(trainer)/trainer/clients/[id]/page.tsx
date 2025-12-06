import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import Link from "next/link"
import { notFound } from "next/navigation"

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params

  if (!session?.user?.workspaceId) {
    return <div>No workspace found</div>
  }

  const client = await prisma.user.findFirst({
    where: {
      id,
      workspaceId: session.user.workspaceId,
      role: "CLIENT",
    },
    include: {
      clientProfile: true,
    },
  })

  if (!client || !client.clientProfile) {
    notFound()
  }

  // Fetch recent appointments
  const appointments = await prisma.appointment.findMany({
    where: {
      clientId: id,
      workspaceId: session.user.workspaceId,
    },
    orderBy: {
      startTime: "desc",
    },
    take: 5,
  })

  // Fetch recent workout sessions
  const workoutSessions = await prisma.workoutSession.findMany({
    where: {
      clientId: id,
      workspaceId: session.user.workspaceId,
    },
    orderBy: {
      date: "desc",
    },
    take: 5,
  })

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{client.fullName}</h1>
          <p className="mt-2 text-gray-600">{client.email}</p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/trainer/clients/${id}/progress`}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            View Progress
          </Link>
          <Link
            href={`/trainer/clients/${id}/edit`}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Client Info */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Client Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-gray-700">Full Name</p>
            <p className="mt-1 text-sm text-gray-900">{client.fullName}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Email</p>
            <p className="mt-1 text-sm text-gray-900">{client.email}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Phone</p>
            <p className="mt-1 text-sm text-gray-900">{client.phone || "—"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Billing Frequency</p>
            <p className="mt-1 text-sm text-gray-900">
              {client.clientProfile.billingFrequency === "PER_SESSION"
                ? "Per Session"
                : "Monthly"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Session Rate</p>
            <p className="mt-1 text-sm text-gray-900">
              ${client.clientProfile.sessionRate.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Client Since</p>
            <p className="mt-1 text-sm text-gray-900">
              {new Date(client.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        {client.clientProfile.notes && (
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-700">Notes</p>
            <p className="mt-1 text-sm text-gray-900">{client.clientProfile.notes}</p>
          </div>
        )}
      </div>

      {/* Recent Workout Sessions */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Workouts</h2>
          <Link
            href={`/trainer/clients/${id}/progress`}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            View All Progress →
          </Link>
        </div>
        {workoutSessions.length === 0 ? (
          <p className="text-gray-600">No workouts logged yet.</p>
        ) : (
          <div className="space-y-3">
            {workoutSessions.map((session) => (
              <div
                key={session.id}
                className="flex justify-between items-center p-3 border border-gray-200 rounded-md"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {new Date(session.date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-sm text-gray-600">
                    {Array.isArray(session.exercises) && session.exercises.length > 0
                      ? `${session.exercises.length} exercises logged`
                      : "No exercises"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Appointments */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Appointments</h2>
          <Link href="/trainer/calendar" className="text-sm text-blue-600 hover:text-blue-700">
            View Calendar →
          </Link>
        </div>
        {appointments.length === 0 ? (
          <p className="text-gray-600">No appointments scheduled.</p>
        ) : (
          <div className="space-y-3">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex justify-between items-center p-3 border border-gray-200 rounded-md"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {new Date(appointment.startTime).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date(appointment.startTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    -{" "}
                    {new Date(appointment.endTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    appointment.status === "COMPLETED"
                      ? "bg-green-100 text-green-800"
                      : appointment.status === "SCHEDULED"
                      ? "bg-blue-100 text-blue-800"
                      : appointment.status === "CANCELLED"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {appointment.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href={`/trainer/calendar?clientId=${id}`}
            className="p-4 border border-gray-300 rounded-md hover:bg-gray-50 text-center"
          >
            <p className="font-medium text-gray-900">Schedule Session</p>
            <p className="text-sm text-gray-600">Book a new appointment</p>
          </Link>
          <Link
            href="/trainer/workouts/log"
            className="p-4 border border-gray-300 rounded-md hover:bg-gray-50 text-center"
          >
            <p className="font-medium text-gray-900">Log Workout</p>
            <p className="text-sm text-gray-600">Record session details</p>
          </Link>
          <Link
            href={`/trainer/clients/${id}/progress`}
            className="p-4 border border-gray-300 rounded-md hover:bg-gray-50 text-center"
          >
            <p className="font-medium text-gray-900">View Progress</p>
            <p className="text-sm text-gray-600">Charts and analytics</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
