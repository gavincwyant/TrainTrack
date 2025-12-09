import { requireSystemAdmin } from "@/lib/middleware/tenant"
import { prisma } from "@/lib/db"
import UserForm from "../_components/UserForm"

async function getWorkspaces() {
  await requireSystemAdmin()

  const workspaces = await prisma.workspace.findMany({
    orderBy: { name: "asc" }
  })

  return workspaces
}

export default async function NewUserPage() {
  const workspaces = await getWorkspaces()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create New User</h1>
        <p className="text-gray-600 mt-2">Add a new user to the system</p>
      </div>

      <UserForm workspaces={workspaces} />
    </div>
  )
}
