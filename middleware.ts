import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/login", "/signup"]
  const isPublicRoute = publicRoutes.includes(pathname)

  // API routes for auth
  const isAuthApi = pathname.startsWith("/api/auth")

  if (isPublicRoute || isAuthApi) {
    return NextResponse.next()
  }

  // Require authentication for all other routes
  if (!session) {
    const loginUrl = new URL("/login", req.url)
    return NextResponse.redirect(loginUrl)
  }

  // Role-based access control
  const isTrainerRoute = pathname.startsWith("/trainer")
  const isClientRoute = pathname.startsWith("/client")
  const userRole = session.user?.role

  if (isTrainerRoute && userRole !== "TRAINER") {
    return NextResponse.redirect(new URL("/client/dashboard", req.url))
  }

  if (isClientRoute && userRole !== "CLIENT") {
    return NextResponse.redirect(new URL("/trainer/dashboard", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
