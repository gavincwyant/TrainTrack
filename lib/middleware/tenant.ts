import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

/**
 * Require workspace context from authenticated session
 * Throws error if no workspace is found
 */
export async function requireWorkspace(): Promise<string> {
  const session = await auth()

  if (!session?.user?.workspaceId) {
    throw new Error("No workspace context found. User must belong to a workspace.")
  }

  return session.user.workspaceId
}

/**
 * Get workspace context from authenticated session
 * Returns null if no workspace found
 */
export async function getWorkspace(): Promise<string | null> {
  const session = await auth()
  return session?.user?.workspaceId || null
}

/**
 * Check if user is a trainer
 */
export async function isTrainer(): Promise<boolean> {
  const session = await auth()
  return session?.user?.role === "TRAINER"
}

/**
 * Check if user is a client
 */
export async function isClient(): Promise<boolean> {
  const session = await auth()
  return session?.user?.role === "CLIENT"
}

/**
 * Get authenticated user's ID
 */
export async function requireUserId(): Promise<string> {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("User not authenticated")
  }

  return session.user.id
}

/**
 * Models that require workspace scoping
 */
const TENANT_SCOPED_MODELS = [
  'Appointment',
  'WorkoutSession',
  'Invoice',
  'InvoiceLineItem',
  'ClientProfile',
  'AvailabilityBlock',
  'CustomMetricDefinition',
]

/**
 * Creates Prisma client with automatic tenant scoping middleware
 * Use this for operations that need automatic workspace filtering
 */
export function createTenantScopedPrisma(workspaceId: string) {
  const client = prisma.$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }: { model: string; args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
          if (TENANT_SCOPED_MODELS.includes(model)) {
            args.where = {
              ...(args.where as Record<string, unknown> || {}),
              workspaceId,
            }
          }
          return query(args)
        },
        async findFirst({ model, args, query }: { model: string; args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
          if (TENANT_SCOPED_MODELS.includes(model)) {
            args.where = {
              ...(args.where as Record<string, unknown> || {}),
              workspaceId,
            }
          }
          return query(args)
        },
        async findUnique({ model, args, query }: { model: string; args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
          if (TENANT_SCOPED_MODELS.includes(model)) {
            // For findUnique, we can't add to where, so we need to validate after
            const result = await query(args)
            if (result && typeof result === 'object' && 'workspaceId' in result && result.workspaceId !== workspaceId) {
              return null
            }
            return result
          }
          return query(args)
        },
        async create({ model, args, query }: { model: string; args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
          if (TENANT_SCOPED_MODELS.includes(model)) {
            args.data = {
              ...(args.data as Record<string, unknown>),
              workspaceId,
            }
          }
          return query(args)
        },
        async createMany({ model, args, query }: { model: string; args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
          if (TENANT_SCOPED_MODELS.includes(model)) {
            if (Array.isArray(args.data)) {
              args.data = args.data.map((item: Record<string, unknown>) => ({
                ...item,
                workspaceId,
              }))
            } else {
              args.data = {
                ...(args.data as Record<string, unknown> || {}),
                workspaceId,
              }
            }
          }
          return query(args)
        },
        async update({ model, args, query }: { model: string; args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
          if (TENANT_SCOPED_MODELS.includes(model)) {
            args.where = {
              ...(args.where as Record<string, unknown> || {}),
              workspaceId,
            } as Record<string, unknown>
          }
          return query(args)
        },
        async updateMany({ model, args, query }: { model: string; args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
          if (TENANT_SCOPED_MODELS.includes(model)) {
            args.where = {
              ...(args.where as Record<string, unknown> || {}),
              workspaceId,
            } as Record<string, unknown>
          }
          return query(args)
        },
        async delete({ model, args, query }: { model: string; args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
          if (TENANT_SCOPED_MODELS.includes(model)) {
            // Add workspace filter to where clause
            args.where = {
              ...(args.where as Record<string, unknown> || {}),
              workspaceId,
            } as Record<string, unknown>
          }
          return query(args)
        },
        async deleteMany({ model, args, query }: { model: string; args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
          if (TENANT_SCOPED_MODELS.includes(model)) {
            args.where = {
              ...(args.where as Record<string, unknown> || {}),
              workspaceId,
            } as Record<string, unknown>
          }
          return query(args)
        },
      },
    },
  })

  return client
}

/**
 * Utility to get tenant-scoped Prisma client for current session
 */
export async function getTenantPrisma() {
  const workspaceId = await requireWorkspace()
  return createTenantScopedPrisma(workspaceId)
}
