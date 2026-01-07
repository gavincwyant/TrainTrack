import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { prisma } from "@/lib/db"
import { compare } from "bcryptjs"
import { z } from "zod"
import { PrismaClient } from "@prisma/client"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
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
              onboardingComplete: true,
              workspace: true,
            },
          })

          if (!user) {
            console.log("User not found:", email)
            return null
          }

          if (!user.passwordHash) {
            console.log("User has no password (OAuth user):", email)
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
            onboardingComplete: user.onboardingComplete,
          }
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Handle Google OAuth sign in
      if (account?.provider === "google" && user.email) {
        try {
          // Check if user exists by email
          let existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: { workspace: true },
          })

          if (existingUser) {
            // Link Google ID if not already linked
            if (!existingUser.googleId && account.providerAccountId) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: { googleId: account.providerAccountId },
              })
            }
          } else {
            // Create new user with Google OAuth
            const defaultWorkspaceName = `${user.name || "My"}'s Training`

            existingUser = await prisma.$transaction(async (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">) => {
              const newUser = await tx.user.create({
                data: {
                  email: user.email!,
                  fullName: user.name || "Trainer",
                  role: "TRAINER",
                  googleId: account.providerAccountId,
                  profileImage: user.image,
                  onboardingComplete: false,
                },
              })

              const workspace = await tx.workspace.create({
                data: {
                  name: defaultWorkspaceName,
                  trainerId: newUser.id,
                },
              })

              const updatedUser = await tx.user.update({
                where: { id: newUser.id },
                data: { workspaceId: workspace.id },
                include: { workspace: true },
              })

              return updatedUser
            })
          }

          // Add custom fields to the user object for JWT
          user.id = existingUser.id
          user.role = existingUser.role
          user.workspaceId = existingUser.workspaceId
          user.isSystemAdmin = existingUser.isSystemAdmin
          user.onboardingComplete = existingUser.onboardingComplete
        } catch (error) {
          console.error("Error in Google signIn callback:", error)
          return false
        }
      }

      return true
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl

      // Allow all auth API routes (needed for OAuth callbacks)
      if (pathname.startsWith("/api/auth")) {
        return true
      }

      // Public routes
      const publicRoutes = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/terms", "/privacy"]
      if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + "?"))) {
        return true
      }

      // Require auth for all other routes
      if (!auth?.user) {
        return false
      }

      // Allow onboarding route for authenticated users
      if (pathname.startsWith("/onboarding")) {
        return true
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
    jwt({ token, user, trigger, session }) {
      if (user && user.id) {
        token.role = user.role
        token.workspaceId = user.workspaceId
        token.userId = user.id
        token.isSystemAdmin = user.isSystemAdmin
        token.onboardingComplete = user.onboardingComplete
      }

      // Handle session updates
      if (trigger === "update" && session) {
        if (session.onboardingComplete !== undefined) {
          token.onboardingComplete = session.onboardingComplete
        }
      }

      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.workspaceId = token.workspaceId as string | null
        session.user.id = token.userId as string
        session.user.isSystemAdmin = token.isSystemAdmin as boolean
        session.user.onboardingComplete = token.onboardingComplete as boolean
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
