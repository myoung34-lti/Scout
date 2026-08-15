'use server'

import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'

export async function listUsers() {
  await requireSession()
  return prisma.user.findMany({ orderBy: { name: 'asc' } })
}
