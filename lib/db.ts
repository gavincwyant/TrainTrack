import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const connectionString = process.env.DATABASE_URL

// For Supabase pooler (port 6543), use minimal pool size since pooler handles it
// For direct connection or local, use normal pool
const isPooler = connectionString?.includes(':6543') || connectionString?.includes('pooler.supabase.com')

const pool = new Pool({
  connectionString,
  // When using Supabase pooler, limit client-side pool to avoid exhausting pooler connections
  max: isPooler ? 1 : 10,
  idleTimeoutMillis: isPooler ? 10000 : 30000,
})

const adapter = new PrismaPg(pool)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
