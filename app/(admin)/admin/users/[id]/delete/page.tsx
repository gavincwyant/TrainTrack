import { requireSystemAdmin } from "@/lib/middleware/tenant"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import DeleteUserForm from "./_components/DeleteUserForm"

async function getUser(id: string) {
  await requireSystemAdmin()

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      workspace: true,
    }
  })

  if (!user) {
    notFound()
  }

  // Get counts separately
  const [ownedWorkspaces, clientProfiles, appointments, workoutSessions, invoices] = await Promise.all([
    prisma.workspace.count({ where: { trainerId: id } }),
    prisma.clientProfile.count({ where: { userId: id } }),
    prisma.appointment.count({ where: { OR: [{ trainerId: id }, { clientId: id }] } }),
    prisma.workoutSession.count({ where: { OR: [{ trainerId: id }, { clientId: id }] } }),
    prisma.invoice.count({ where: { workspaceId: user.workspaceId || undefined } }),
  ])

  const userWithCounts = {
    ...user,
    _count: {
      ownedWorkspaces,
      clientProfile: clientProfiles,
      appointments,
      workoutSessions,
      invoices,
    }
  }

  return userWithCounts
}

export default async function DeleteUserPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getUser(id)

  const hasRelatedData =
    user._count.ownedWorkspaces > 0 ||
    user._count.clientProfile > 0 ||
    user._count.appointments > 0 ||
    user._count.workoutSessions > 0 ||
    user._count.invoices > 0

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-red-600 dark:text-red-400">Delete User</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          This action cannot be undone. Please be careful.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">User Information</h2>
          <div className="mt-4 space-y-2 text-sm text-gray-900 dark:text-gray-100">
            <div>
              <span className="font-medium">Name:</span> {user.fullName}
            </div>
            <div>
              <span className="font-medium">Email:</span> {user.email}
            </div>
            <div>
              <span className="font-medium">Role:</span>{" "}
              <span className={`px-2 py-1 text-xs font-semibold rounded ${
                user.role === "TRAINER"
                  ? "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300"
                  : "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300"
              }`}>
                {user.role}
              </span>
            </div>
            {user.workspace && (
              <div>
                <span className="font-medium">Workspace:</span> {user.workspace.name}
              </div>
            )}
          </div>
        </div>

        {hasRelatedData && (
          <div className="bg-yellow-50 dark:bg-yellow-950/50 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
            <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
              Warning: This user has related data
            </h3>
            <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
              {user._count.ownedWorkspaces > 0 && (
                <li>• Owns {user._count.ownedWorkspaces} workspace(s)</li>
              )}
              {user._count.clientProfile > 0 && (
                <li>• Has a client profile</li>
              )}
              {user._count.appointments > 0 && (
                <li>• Has {user._count.appointments} appointment(s)</li>
              )}
              {user._count.workoutSessions > 0 && (
                <li>• Has {user._count.workoutSessions} workout session(s)</li>
              )}
              {user._count.invoices > 0 && (
                <li>• Has {user._count.invoices} invoice(s)</li>
              )}
            </ul>
            <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-2">
              Deleting this user will also delete all related data.
            </p>
          </div>
        )}

        <DeleteUserForm userId={user.id} userName={user.fullName} />
      </div>
    </div>
  )
}
