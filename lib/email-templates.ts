import { prisma } from '@/lib/db'

// The active, selectable templates for the candidate profile's Compose
// Email dropdown.
export async function listActiveEmailTemplates() {
  return prisma.emailTemplate.findMany({
    where: { isActive: true },
    include: { currentVersion: true },
    orderBy: { name: 'asc' },
  })
}
