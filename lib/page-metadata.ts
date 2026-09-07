import { cache } from 'react'
import { prisma } from '@/lib/db'

// generateMetadata runs separately from the page component, so naively
// reusing the page's getter would fetch the whole entity twice. These select
// only what a browser tab needs, and cache() collapses repeats within a
// single request.
//
// No session check here: these run during the render of routes the proxy
// already gates (an unauthenticated request to /candidates/* is redirected to
// /login before any page code runs), and they expose nothing the page itself
// doesn't already show.

export const candidateTitle = cache(async (candidateId: string) => {
  const c = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: { firstName: true, lastName: true },
  })
  return c ? `${c.firstName} ${c.lastName}` : null
})

export const jobTitle = cache(async (jobId: string) => {
  const j = await prisma.job.findUnique({
    where: { id: jobId },
    select: { internalName: true },
  })
  return j?.internalName ?? null
})

export const promptTitle = cache(async (promptId: string) => {
  const p = await prisma.prompt.findUnique({
    where: { id: promptId },
    select: { name: true },
  })
  return p?.name ?? null
})

export const emailTemplateTitle = cache(async (templateId: string) => {
  const t = await prisma.emailTemplate.findUnique({
    where: { id: templateId },
    select: { name: true },
  })
  return t?.name ?? null
})

export const interviewTitle = cache(async (interviewId: string) => {
  const i = await prisma.interview.findUnique({
    where: { id: interviewId },
    select: { type: true, candidate: { select: { firstName: true, lastName: true } } },
  })
  return i ? `${i.candidate.firstName} ${i.candidate.lastName}` : null
})

/** Falls back to the section name so a tab is never just "Scout". */
export function pageTitle(specific: string | null, section: string) {
  return specific ? `${specific} · ${section}` : section
}
