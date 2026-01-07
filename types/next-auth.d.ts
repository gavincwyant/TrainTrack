import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      workspaceId: string | null
      isSystemAdmin: boolean
      onboardingComplete: boolean
    } & DefaultSession["user"]
  }

  interface User {
    role: string
    workspaceId: string | null
    isSystemAdmin: boolean
    onboardingComplete: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    workspaceId: string | null
    userId: string
    isSystemAdmin: boolean
    onboardingComplete: boolean
  }
}
