import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

// Cache on globalThis in every environment, not just dev. Vercel reuses a
// warm serverless container across requests — without this, each request
// to that same warm container would open a brand-new connection pool
// instead of reusing one, quickly exhausting the Supabase pooler's limit.
globalForPrisma.prisma = prisma
