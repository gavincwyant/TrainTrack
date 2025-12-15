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

  // Fetch trainer settings for default rates
  const trainerSettings = await prisma.trainerSettings.findUnique({
    where: { trainerId: session.user.id },
  })

  const trainerDefaultGroupRate = trainerSettings?.defaultGroupSessionRate
  const trainerDefaultIndividualRate = trainerSettings?.defaultIndividualSessionRate

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{client.fullName}</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{client.email}</p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/trainer/clients/${id}/progress`}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
          >
            View Progress
          </Link>
          <Link
            href={`/trainer/clients/${id}/edit`}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Client Info */}
      <div className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Client Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-400">Full Name</p>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{client.fullName}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-400">Email</p>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{client.email}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-400">Phone</p>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{client.phone || "—"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-400">Billing Frequency</p>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
              {client.clientProfile.billingFrequency === "PER_SESSION"
                ? "Per Session"
                : client.clientProfile.billingFrequency === "MONTHLY"
                  ? "Monthly"
                  : "Prepaid"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-400">Individual Session Rate</p>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
              ${Number(client.clientProfile.sessionRate).toFixed(2)}
              {trainerDefaultIndividualRate &&
                Number(client.clientProfile.sessionRate) === Number(trainerDefaultIndividualRate) &&
                " (default)"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-400">Group Session Rate</p>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
              {client.clientProfile.groupSessionRate
                ? `$${Number(client.clientProfile.groupSessionRate).toFixed(2)}`
                : trainerDefaultGroupRate
                  ? `$${Number(trainerDefaultGroupRate).toFixed(2)} (default)`
                  : "Not set"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-400">Client Since</p>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
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
            <p className="text-sm font-medium text-gray-700 dark:text-gray-400">Notes</p>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{client.clientProfile.notes}</p>
          </div>
        )}
      </div>

      {/* Prepaid Balance Section */}
      {client.clientProfile.billingFrequency === "PREPAID" && (
        <div className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Prepaid Balance</h2>
            <Link
              href="/trainer/invoices"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              Manage Prepaid →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Balance</p>
              <p className={`mt-1 text-2xl font-bold ${
                Number(client.clientProfile.prepaidBalance || 0) <= 0
                  ? "text-red-600 dark:text-red-400"
                  : Number(client.clientProfile.prepaidBalance || 0) < Number(client.clientProfile.sessionRate)
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-green-600 dark:text-green-400"
              }`}>
                ${Number(client.clientProfile.prepaidBalance || 0).toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Target Balance</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                ${Number(client.clientProfile.prepaidTargetBalance || 0).toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Sessions Available</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                {Number(client.clientProfile.sessionRate) > 0
                  ? Math.floor(Number(client.clientProfile.prepaidBalance || 0) / Number(client.clientProfile.sessionRate))
                  : 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">at individual rate</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Workout Sessions */}
      <div className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Workouts</h2>
          <Link
            href={`/trainer/clients/${id}/progress`}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            View All Progress →
          </Link>
        </div>
        {workoutSessions.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">No workouts logged yet.</p>
        ) : (
          <div className="space-y-3">
            {workoutSessions.map((session) => (
              <div
                key={session.id}
                className="flex justify-between items-center p-3 border border-gray-200 dark:border-gray-700 rounded-md"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {new Date(session.date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
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
      <div className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Appointments</h2>
          <Link href="/trainer/calendar" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
            View Calendar →
          </Link>
        </div>
        {appointments.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">No appointments scheduled.</p>
        ) : (
          <div className="space-y-3">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex justify-between items-center p-3 border border-gray-200 dark:border-gray-700 rounded-md"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {new Date(appointment.startTime).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
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
                      ? "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300"
                      : appointment.status === "SCHEDULED"
                      ? "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300"
                      : appointment.status === "CANCELLED"
                      ? "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300"
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
      <div className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href={`/trainer/calendar?clientId=${id}`}
            className="p-4 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-center"
          >
            <p className="font-medium text-gray-900 dark:text-gray-100">Schedule Session</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Book a new appointment</p>
          </Link>
          <Link
            href="/trainer/workouts/log"
            className="p-4 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-center"
          >
            <p className="font-medium text-gray-900 dark:text-gray-100">Log Workout</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Record session details</p>
          </Link>
          <Link
            href={`/trainer/clients/${id}/progress`}
            className="p-4 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-center"
          >
            <p className="font-medium text-gray-900 dark:text-gray-100">View Progress</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Charts and analytics</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
