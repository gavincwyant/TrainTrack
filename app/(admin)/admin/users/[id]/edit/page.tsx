import { requireSystemAdmin } from "@/lib/middleware/tenant"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import UserForm from "../../_components/UserForm"

async function getUser(id: string) {
  await requireSystemAdmin()

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      workspace: true,
      clientProfile: true,
      trainerSettings: true
    }
  })

  if (!user) {
    notFound()
  }

  const workspaces = await prisma.workspace.findMany({
    orderBy: { name: "asc" }
  })

  return { user, workspaces }
}

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user, workspaces } = await getUser(id)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Edit User</h1>
        <p className="text-gray-600 mt-2">Update user information and settings</p>
      </div>

      <UserForm user={user} workspaces={workspaces} />
    </div>
  )
}
