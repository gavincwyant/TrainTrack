import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { requireSystemAdmin } from "@/lib/middleware/tenant"
import { prisma } from "@/lib/db"

interface TrainerWithWorkspace {
  id: string
  fullName: string
  email: string
  createdAt: Date
  workspace: {
    name: string
    _count?: {
      clientProfiles: number
      pendingClientProfiles: number
    }
  } | null
}

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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Admin Dashboard</h1>
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
      <div className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Recent Trainer Signups
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Trainer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Workspace
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Signed Up
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Clients
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {trainers && trainers.length > 0 ? (
                trainers.slice(0, 20).map((trainer: TrainerWithWorkspace) => (
                  <tr key={trainer.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {trainer.fullName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{trainer.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {trainer.workspace?.name || "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(trainer.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {trainer.workspace?._count?.clientProfiles || 0} approved
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {trainer.workspace?._count?.pendingClientProfiles || 0} pending
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link
                      href={`/admin/trainers/${trainer.id}`}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-medium"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
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
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-green-600 dark:text-green-400",
    purple: "text-purple-600 dark:text-purple-400",
  }

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <p className={`text-3xl font-bold mt-2 ${colorClasses[color]}`}>
        {value}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
    </div>
  )
}
