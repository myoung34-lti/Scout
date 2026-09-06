'use server'

import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { listActiveEmailTemplates } from '@/lib/email-templates'
import { listEmailVariables } from '@/lib/email-variables'

// The pieces of Compose Email context that are global (same for every
// candidate/application), not per-card — reused by the candidate profile
// page, the per-job pipeline board, and the cross-job pipeline board,
// instead of each repeating the same three lookups.
export async function getComposeEmailGlobals() {
  const authUser = await requireSession()

  const [currentUser, emailTemplates, emailVariables] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: authUser.id } }),
    listActiveEmailTemplates(),
    listEmailVariables(),
  ])

  return {
    recruiterName: currentUser.name,
    recruiterEmail: currentUser.email,
    staticVariables: Object.fromEntries(emailVariables.map((v) => [v.key, v.value])),
    emailTemplates: emailTemplates.map((t) => ({
      id: t.id,
      name: t.name,
      currentVersion: t.currentVersion,
    })),
  }
}

export type ComposeEmailGlobals = Awaited<ReturnType<typeof getComposeEmailGlobals>>
