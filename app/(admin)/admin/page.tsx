import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { requireSystemAdmin } from "@/lib/middleware/tenant"
import { prisma } from "@/lib/db"

async function getAdminData() {
  await requireSystemAdmin()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - 7)

  const [
    totalTrainers,
    newTrainersThisMonth,
    newTrainersThisWeek,
    totalClients,
    totalWorkspaces,
    totalRevenue,
    trainers
  ] = await Promise.all([
    // Total trainers
    prisma.user.count({
      where: { role: "TRAINER" }
    }),

    // New trainers this month
    prisma.user.count({
      where: {
        role: "TRAINER",
        createdAt: { gte: startOfMonth }
      }
    }),

    // New trainers this week
    prisma.user.count({
      where: {
        role: "TRAINER",
        createdAt: { gte: startOfWeek }
      }
    }),

    // Total clients across all workspaces
    prisma.user.count({
      where: { role: "CLIENT" }
    }),

    // Total workspaces
    prisma.workspace.count(),

    // Total revenue from paid invoices
    prisma.invoice.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true }
    }),

    // Recent trainers
    prisma.user.findMany({
      where: { role: "TRAINER" },
      include: {
        workspace: {
          include: {
            _count: {
              select: {
                clientProfiles: true,
                pendingClientProfiles: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ])

  return {
    stats: {
      totalTrainers,
      newTrainersThisMonth,
      newTrainersThisWeek,
      totalClients,
      totalWorkspaces,
      totalRevenue: totalRevenue._sum.amount || 0
    },
    trainers
  }
}

export default async function AdminDashboard() {
  const { stats, trainers } = await getAdminData()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Trainers"
          value={stats.totalTrainers}
          subtitle={`${stats.newTrainersThisWeek} new this week`}
          color="blue"
        />
        <StatCard
          title="Total Clients"
          value={stats.totalClients}
          subtitle={`Across ${stats.totalWorkspaces} workspaces`}
          color="green"
        />
        <StatCard
          title="Platform Revenue"
          value={`$${Number(stats.totalRevenue).toFixed(2)}`}
          subtitle="Total paid invoices"
          color="purple"
        />
      </div>

      {/* Recent Trainers Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Trainer Signups
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trainer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Workspace
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Signed Up
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clients
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trainers && trainers.length > 0 ? (
                trainers.slice(0, 20).map((trainer) => (
                  <tr key={trainer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {trainer.fullName}
                    </div>
                    <div className="text-sm text-gray-500">{trainer.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {trainer.workspace?.name || "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDistanceToNow(new Date(trainer.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {trainer.workspace?._count?.clientProfiles || 0} approved
                    </div>
                    <div className="text-sm text-gray-500">
                      {trainer.workspace?._count?.pendingClientProfiles || 0} pending
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link
                      href={`/admin/trainers/${trainer.id}`}
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No trainers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  subtitle,
  color
}: {
  title: string
  value: string | number
  subtitle: string
  color: "blue" | "green" | "purple"
}) {
  const colorClasses = {
    blue: "text-blue-600",
    green: "text-green-600",
    purple: "text-purple-600",
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className={`text-3xl font-bold mt-2 ${colorClasses[color]}`}>
        {value}
      </p>
      <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
    </div>
  )
}
