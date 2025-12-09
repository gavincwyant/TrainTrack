import Link from "next/link"
import { formatDistanceToNow, format } from "date-fns"
import { requireSystemAdmin } from "@/lib/middleware/tenant"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"

async function getTrainerData(id: string) {
  await requireSystemAdmin()

  const trainer = await prisma.user.findUnique({
    where: {
      id,
      role: "TRAINER"
    },
    include: {
      workspace: true,
      trainerSettings: {
        select: {
          googleCalendarConnected: true,
          lastSyncedAt: true
        }
      }
    }
  })

  if (!trainer || !trainer.workspace) {
    notFound()
  }

  // Get workspace stats
  const [clients, pendingProfiles, appointments, invoices] = await Promise.all([
    // Approved clients
    prisma.user.findMany({
      where: {
        workspaceId: trainer.workspace.id,
        role: "CLIENT"
      },
      include: {
        clientProfile: {
          select: {
            sessionRate: true,
            billingFrequency: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    }),

    // Pending client profiles
    prisma.pendingClientProfile.findMany({
      where: {
        workspaceId: trainer.workspace.id
      },
      orderBy: { createdAt: "desc" }
    }),

    // Appointment stats
    prisma.appointment.groupBy({
      by: ["status"],
      where: { workspaceId: trainer.workspace.id },
      _count: true
    }),

    // Revenue stats
    prisma.invoice.aggregate({
      where: {
        workspaceId: trainer.workspace.id,
        status: "PAID"
      },
      _sum: { amount: true }
    })
  ])

  const stats = {
    totalClients: clients.length,
    pendingClients: pendingProfiles.length,
    totalAppointments: appointments.reduce((sum, g) => sum + g._count, 0),
    completedAppointments: appointments.find(g => g.status === "COMPLETED")?._count || 0,
    totalRevenue: invoices._sum.amount || 0
  }

  return {
    trainer,
    stats,
    clients,
    pendingProfiles
  }
}

export default async function TrainerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { trainer, stats, clients, pendingProfiles } = await getTrainerData(id)

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/admin"
        className="text-blue-600 hover:text-blue-900 font-medium text-sm"
      >
        ← Back to Dashboard
      </Link>

      {/* Trainer Profile */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {trainer.fullName}
        </h1>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Email:</span>{" "}
            <span className="text-gray-900">{trainer.email}</span>
          </div>
          <div>
            <span className="text-gray-500">Phone:</span>{" "}
            <span className="text-gray-900">{trainer.phone || "N/A"}</span>
          </div>
          <div>
            <span className="text-gray-500">Workspace:</span>{" "}
            <span className="text-gray-900">{trainer.workspace?.name || "N/A"}</span>
          </div>
          <div>
            <span className="text-gray-500">Signed Up:</span>{" "}
            <span className="text-gray-900">
              {format(new Date(trainer.createdAt), "MMM d, yyyy")}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Google Calendar:</span>{" "}
            <span className="text-gray-900">
              {trainer.trainerSettings?.googleCalendarConnected ? "Connected" : "Not Connected"}
            </span>
          </div>
          {trainer.trainerSettings?.lastSyncedAt && (
            <div>
              <span className="text-gray-500">Last Synced:</span>{" "}
              <span className="text-gray-900">
                {formatDistanceToNow(new Date(trainer.trainerSettings.lastSyncedAt), { addSuffix: true })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total Clients</p>
          <p className="text-2xl font-bold text-blue-600">{stats.totalClients}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Pending Clients</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pendingClients}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Appointments</p>
          <p className="text-2xl font-bold text-green-600">
            {stats.completedAppointments}/{stats.totalAppointments}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-2xl font-bold text-purple-600">
            ${Number(stats.totalRevenue).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Approved Clients ({clients.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Session Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Billing
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Added
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No clients yet
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id}>
                    <td className="px-6 py-4 text-sm text-gray-900">{client.fullName}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{client.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      ${Number(client.clientProfile?.sessionRate || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {client.clientProfile?.billingFrequency || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDistanceToNow(new Date(client.createdAt), { addSuffix: true })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Profiles Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Pending Client Profiles ({pendingProfiles.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Occurrences
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingProfiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No pending profiles
                  </td>
                </tr>
              ) : (
                pendingProfiles.map((profile) => (
                  <tr key={profile.id}>
                    <td className="px-6 py-4 text-sm text-gray-900">{profile.extractedName}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{profile.extractedEmail || "N/A"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 capitalize">{profile.source}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        profile.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                        profile.status === "approved" ? "bg-green-100 text-green-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {profile.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{profile.occurrenceCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
