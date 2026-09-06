import { timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { deliverCandidateEmail } from '@/lib/email-send'

// Recovers a row stuck in SENDING if a prior invocation crashed mid-send
// (e.g. the instance was killed after claiming but before Gmail responded).
const STUCK_SENDING_THRESHOLD_MS = 5 * 60 * 1000
const MAX_BATCH_SIZE = 25

function isAuthorized(request: Request): boolean {
  const provided = request.headers.get('x-cron-secret')
  const expected = process.env.CRON_SHARED_SECRET
  if (!provided || !expected) return false

  const providedBuf = Buffer.from(provided)
  const expectedBuf = Buffer.from(expected)
  if (providedBuf.length !== expectedBuf.length) return false
  return timingSafeEqual(providedBuf, expectedBuf)
}

// Triggered by a Google Cloud Scheduler job every few minutes, never by a
// logged-in user — proxy.ts exempts this path from the normal Supabase
// session gate, so this header check is the actual authorization.
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const staleCutoff = new Date(now.getTime() - STUCK_SENDING_THRESHOLD_MS)

  const due = await prisma.candidateEmail.findMany({
    where: {
      OR: [
        { status: 'SCHEDULED', scheduledFor: { lte: now } },
        { status: 'SENDING', updatedAt: { lt: staleCutoff } },
      ],
    },
    take: MAX_BATCH_SIZE,
    orderBy: { scheduledFor: 'asc' },
  })

  const results: { id: string; ok: boolean }[] = []

  for (const email of due) {
    // Atomic claim — Gmail's send API has no idempotency key, so this must
    // happen before the send, not after. If another invocation already
    // claimed this row, count is 0 and we skip it.
    const claim = await prisma.candidateEmail.updateMany({
      where: { id: email.id, status: { in: ['SCHEDULED', 'SENDING'] } },
      data: { status: 'SENDING', attempts: { increment: 1 } },
    })
    if (claim.count === 0) continue

    try {
      const result = await deliverCandidateEmail({
        senderId: email.senderId,
        candidateId: email.candidateId,
        subject: email.subject,
        bodyHtml: email.bodyHtml,
        applicationId: email.applicationId,
        emailTemplateVersionId: email.emailTemplateVersionId,
        existingCandidateEmailId: email.id,
      })
      if ('error' in result) throw new Error(result.error)
      results.push({ id: email.id, ok: true })
    } catch (err) {
      console.error('send-scheduled-emails: delivery failed for', email.id, err)
      await prisma.candidateEmail.update({
        where: { id: email.id },
        data: {
          status: 'FAILED',
          failureReason: err instanceof Error ? err.message : String(err),
        },
      })
      results.push({ id: email.id, ok: false })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
