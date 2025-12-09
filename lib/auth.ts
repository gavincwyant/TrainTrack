import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/db"
import { compare } from "bcryptjs"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        try {
          const { email, password } = loginSchema.parse(credentials)

          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              fullName: true,
              passwordHash: true,
              role: true,
              workspaceId: true,
              isSystemAdmin: true,
              workspace: true,
            },
          })

          if (!user) {
            console.log("User not found:", email)
            return null
          }

          const isValid = await compare(password, user.passwordHash)

          if (!isValid) {
            console.log("Invalid password for user:", email)
            return null
          }

          console.log("Auth successful for user:", email, "role:", user.role)

          return {
            id: user.id,
            email: user.email,
            name: user.fullName,
            role: user.role,
            workspaceId: user.workspaceId,
            isSystemAdmin: user.isSystemAdmin,
          }
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl

      // Public routes
      const publicRoutes = ["/", "/login", "/signup"]
      if (publicRoutes.includes(pathname)) {
        return true
      }

      // Require auth for all other routes
      if (!auth?.user) {
        return false
      }

      // Role-based access control
      const isAdminRoute = pathname.startsWith("/admin")
      const isTrainerRoute = pathname.startsWith("/trainer")
      const isClientRoute = pathname.startsWith("/client")

      if (isAdminRoute && !auth.user.isSystemAdmin) {
        return false
      }

      if (isTrainerRoute && auth.user.role !== "TRAINER") {
        return false
      }

      if (isClientRoute && auth.user.role !== "CLIENT") {
        return false
      }

      return true
    },
    jwt({ token, user }) {
      if (user && user.id) {
        token.role = user.role
        token.workspaceId = user.workspaceId
        token.userId = user.id
        token.isSystemAdmin = user.isSystemAdmin
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.workspaceId = token.workspaceId as string | null
        session.user.id = token.userId as string
        session.user.isSystemAdmin = token.isSystemAdmin as boolean
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
})
