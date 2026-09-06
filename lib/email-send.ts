import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { getFreshAccessToken, sendGmailMessage } from '@/lib/google/gmail'

export type DeliverCandidateEmailInput = {
  senderId: string
  candidateId: string
  subject: string
  bodyHtml: string
  applicationId?: string | null
  emailTemplateVersionId?: string | null
  // Present only when delivering an already-queued row (the scheduled/cron
  // path) — updates that row to SENT instead of creating a new one, and
  // skips re-validating things already checked when it was scheduled.
  existingCandidateEmailId?: string
}

export type DeliverCandidateEmailResult = { error: string } | { ok: true }

// The actual Gmail-send + audit-log core, shared by the interactive
// "send now" action and the cron-triggered scheduled sender. Deliberately
// not a `'use server'` action and does not call requireSession() — callers
// are responsible for authorizing themselves (a logged-in session for the
// interactive path, the shared-secret check for the cron route).
export async function deliverCandidateEmail(
  input: DeliverCandidateEmailInput
): Promise<DeliverCandidateEmailResult> {
  const [sender, candidate] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: input.senderId } }),
    prisma.candidate.findUniqueOrThrow({ where: { id: input.candidateId } }),
  ])

  if (!sender.googleRefreshToken) {
    return {
      error: 'Sign out and sign back in to connect your Google account for sending email.',
    }
  }
  if (!candidate.email) {
    return { error: 'This candidate has no email address on file.' }
  }
  if (!input.subject.trim()) {
    return { error: 'Subject is required.' }
  }

  try {
    const accessToken = await getFreshAccessToken(sender.googleRefreshToken)
    await sendGmailMessage({
      accessToken,
      fromEmail: sender.email,
      fromName: sender.name,
      to: candidate.email,
      subject: input.subject,
      html: input.bodyHtml,
    })
  } catch (err) {
    console.error('deliverCandidateEmail failed:', err)
    return { error: 'Failed to send email. Please try again.' }
  }

  // The send already succeeded at this point — logging failures shouldn't
  // be reported to the caller as a send failure, but they're worth knowing
  // about, so this isn't silently swallowed either.
  try {
    const sentAt = new Date()
    await prisma.$transaction([
      input.existingCandidateEmailId
        ? prisma.candidateEmail.update({
            where: { id: input.existingCandidateEmailId },
            data: { status: 'SENT', sentAt },
          })
        : prisma.candidateEmail.create({
            data: {
              candidateId: input.candidateId,
              applicationId: input.applicationId || null,
              senderId: sender.id,
              toAddress: candidate.email,
              subject: input.subject,
              bodyHtml: input.bodyHtml,
              emailTemplateVersionId: input.emailTemplateVersionId || null,
              status: 'SENT',
              sentAt,
            },
          }),
      prisma.activityNote.create({
        data: {
          candidateId: input.candidateId,
          authorId: sender.id,
          body: `Emailed: ${input.subject}`,
        },
      }),
    ])
  } catch (err) {
    console.error('deliverCandidateEmail: send succeeded but logging failed:', err)
  }

  revalidatePath(`/candidates/${input.candidateId}`)
  return { ok: true }
}
