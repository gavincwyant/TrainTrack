import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"

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
        async findMany({ model, operation, args, query }) {
          if (TENANT_SCOPED_MODELS.includes(model)) {
            args.where = {
              ...args.where,
              workspaceId,
            }
          }
          return query(args)
        },
        async findFirst({ model, operation, args, query }) {
          if (TENANT_SCOPED_MODELS.includes(model)) {
            args.where = {
              ...args.where,
              workspaceId,
            }
          }
          return query(args)
        },
        async findUnique({ model, operation, args, query }) {
          if (TENANT_SCOPED_MODELS.includes(model)) {
            // For findUnique, we can't add to where, so we need to validate after
            const result = await query(args)
            if (result && (result as any).workspaceId !== workspaceId) {
              return null
            }
            return result
          }
          return query(args)
        },
        async create({ model, operation, args, query }) {
          if (TENANT_SCOPED_MODELS.includes(model)) {
            args.data = {
              ...args.data,
              workspaceId,
            }
          }
          return query(args)
        },
        async createMany({ model, operation, args, query }) {
          if (TENANT_SCOPED_MODELS.includes(model)) {
            if (Array.isArray(args.data)) {
              args.data = args.data.map((item: any) => ({
                ...item,
                workspaceId,
              }))
            } else {
              args.data = {
                ...args.data,
                workspaceId,
              }
            }
          }
          return query(args)
        },
        async update({ model, operation, args, query }) {
          if (TENANT_SCOPED_MODELS.includes(model)) {
            args.where = {
              ...args.where,
              workspaceId,
            }
          }
          return query(args)
        },
        async updateMany({ model, operation, args, query }) {
          if (TENANT_SCOPED_MODELS.includes(model)) {
            args.where = {
              ...args.where,
              workspaceId,
            }
          }
          return query(args)
        },
        async delete({ model, operation, args, query }) {
          if (TENANT_SCOPED_MODELS.includes(model)) {
            // Verify workspace before delete
            const record = await prisma[model as any].findUnique({
              where: args.where,
              select: { workspaceId: true },
            })
            if (!record || record.workspaceId !== workspaceId) {
              throw new Error('Record not found or access denied')
            }
          }
          return query(args)
        },
        async deleteMany({ model, operation, args, query }) {
          if (TENANT_SCOPED_MODELS.includes(model)) {
            args.where = {
              ...args.where,
              workspaceId,
            }
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
