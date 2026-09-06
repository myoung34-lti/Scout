'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { getFreshAccessToken, getGmailSignature } from '@/lib/google/gmail'
import { deliverCandidateEmail, type DeliverCandidateEmailResult } from '@/lib/email-send'

export type SendCandidateEmailResult = DeliverCandidateEmailResult

export async function sendCandidateEmail(
  candidateId: string,
  data: {
    subject: string
    bodyHtml: string
    applicationId?: string | null
    emailTemplateVersionId?: string | null
  }
): Promise<SendCandidateEmailResult> {
  const authUser = await requireSession()
  return deliverCandidateEmail({ senderId: authUser.id, candidateId, ...data })
}

export type ScheduleCandidateEmailResult = { error: string } | { ok: true }

export async function scheduleCandidateEmail(
  candidateId: string,
  data: {
    subject: string
    bodyHtml: string
    applicationId?: string | null
    emailTemplateVersionId?: string | null
    scheduledFor: Date
  }
): Promise<ScheduleCandidateEmailResult> {
  const authUser = await requireSession()

  const [sender, candidate] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: authUser.id } }),
    prisma.candidate.findUniqueOrThrow({ where: { id: candidateId } }),
  ])

  if (!sender.googleRefreshToken) {
    return {
      error: 'Sign out and sign back in to connect your Google account for sending email.',
    }
  }
  if (!candidate.email) {
    return { error: 'This candidate has no email address on file.' }
  }
  if (!data.subject.trim()) {
    return { error: 'Subject is required.' }
  }
  if (data.scheduledFor.getTime() <= Date.now()) {
    return { error: 'Scheduled time must be in the future.' }
  }

  await prisma.candidateEmail.create({
    data: {
      candidateId,
      applicationId: data.applicationId || null,
      senderId: sender.id,
      toAddress: candidate.email,
      subject: data.subject,
      bodyHtml: data.bodyHtml,
      emailTemplateVersionId: data.emailTemplateVersionId || null,
      status: 'SCHEDULED',
      scheduledFor: data.scheduledFor,
    },
  })

  revalidatePath(`/candidates/${candidateId}`)
  return { ok: true }
}

export async function cancelScheduledEmail(
  candidateEmailId: string
): Promise<{ error: string } | { ok: true }> {
  const user = await requireSession()

  const email = await prisma.candidateEmail.findUniqueOrThrow({
    where: { id: candidateEmailId },
  })

  // Atomic count-checked update, not read-then-write — avoids racing a
  // cron pass that might be claiming this exact row for delivery right now.
  const { count } = await prisma.candidateEmail.updateMany({
    where: { id: candidateEmailId, status: 'SCHEDULED' },
    data: { status: 'CANCELED' },
  })
  if (count === 0) {
    return { error: 'This email has already been sent or canceled.' }
  }

  await prisma.activityNote.create({
    data: {
      candidateId: email.candidateId,
      authorId: user.id,
      body: `Canceled scheduled email: ${email.subject}`,
    },
  })

  revalidatePath(`/candidates/${email.candidateId}`)
  return { ok: true }
}

export type GmailSignatureResult = { error: string } | { signature: string }

// Fetched on demand when Compose Email opens, not stored — Gmail is the
// single source of truth for what a recruiter's signature actually is.
export async function getMyGmailSignature(): Promise<GmailSignatureResult> {
  const authUser = await requireSession()
  const sender = await prisma.user.findUniqueOrThrow({ where: { id: authUser.id } })

  if (!sender.googleRefreshToken) {
    return { error: 'Sign out and sign back in to connect your Google account.' }
  }

  try {
    const accessToken = await getFreshAccessToken(sender.googleRefreshToken)
    const signature = await getGmailSignature(accessToken, sender.email)
    return { signature }
  } catch (err) {
    console.error('getMyGmailSignature failed:', err instanceof Error ? err.message : err)
    return { error: 'Sign out and sign back in to sync your Gmail signature.' }
  }
}
