import type { User } from '@prisma/client'
import { encode } from 'next-auth/jwt'

/**
 * Create a NextAuth session token for testing
 */
export async function createSessionToken(user: {
  id: string
  email: string
  name: string | null
  role: string
  workspaceId: string | null
}): Promise<string> {
  const token = await encode({
    token: {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      workspaceId: user.workspaceId,
      userId: user.id,
    },
    secret: process.env.NEXTAUTH_SECRET || 'test-secret-key',
    salt: 'authjs.session-token',
  })

  return token
}

/**
 * Create auth headers for API requests in tests
 */
export async function createAuthHeaders(
  userId: string,
  userEmail: string,
  userName: string | null,
  userRole: string,
  workspaceId: string | null
): Promise<Record<string, string>> {
  const token = await createSessionToken({
    id: userId,
    email: userEmail,
    name: userName,
    role: userRole,
    workspaceId,
  })

  return {
    Cookie: `next-auth.session-token=${token}`,
  }
}

/**
 * Create auth headers from a User object
 */
export async function createAuthHeadersFromUser(
  user: User
): Promise<Record<string, string>> {
  return createAuthHeaders(
    user.id,
    user.email,
    user.fullName,
    user.role,
    user.workspaceId
  )
}

/**
 * Mock authenticated fetch request
 */
export async function authenticatedFetch(
  url: string,
  user: User,
  options: RequestInit = {}
): Promise<Response> {
  const headers = await createAuthHeadersFromUser(user)

  return fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  })
}
