import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { TrainerHeader } from "./_components/TrainerHeader"

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "TRAINER") {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <TrainerHeader
        trainerName={session.user.name || "Trainer"}
        isSystemAdmin={session.user.isSystemAdmin}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
