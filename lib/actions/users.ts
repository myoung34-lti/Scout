'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { ALL_ROLES } from '@/lib/role'
import type { Role } from '@prisma/client'

export async function listUsers() {
  await requireSession()
  return prisma.user.findMany({ orderBy: { name: 'asc' } })
}

export async function updateUserRole(userId: string, role: Role) {
  await requireSession()

  if (!ALL_ROLES.includes(role)) {
    throw new Error('Invalid role')
  }

  await prisma.user.update({ where: { id: userId }, data: { role } })

  revalidatePath('/admin')
}

export async function updateUserName(userId: string, name: string) {
  await requireSession()

  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error('Name is required')
  }

  await prisma.user.update({ where: { id: userId }, data: { name: trimmed } })

  revalidatePath('/admin')
}
