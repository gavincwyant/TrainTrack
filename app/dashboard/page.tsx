import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function DashboardRedirect() {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  // Redirect based on user role
  if (session.user.role === "TRAINER") {
    redirect("/trainer/dashboard")
  } else if (session.user.role === "CLIENT") {
    redirect("/client/dashboard")
  }

  // Fallback
  redirect("/login")
}
