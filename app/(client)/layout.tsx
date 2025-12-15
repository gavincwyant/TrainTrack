import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ClientHeader } from "./_components/ClientHeader"

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "CLIENT") {
    redirect("/trainer/dashboard")
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <ClientHeader
        userEmail={session.user.email || ""}
        clientName={session.user.name || session.user.email || "Client"}
      />
      <main className="max-w-7xl mx-auto py-6 md:px-6 lg:px-8 px-4 text-gray-900 dark:text-gray-100">
        {children}
      </main>
    </div>
  )
}
