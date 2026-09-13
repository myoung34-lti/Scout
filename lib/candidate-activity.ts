import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'

/**
 * When something last actually happened to each candidate.
 *
 * "Activity" is the definition already used by Home's Needs Attention list: a
 * stage move, a note, or an email that was really sent — a composed-but-queued
 * email doesn't count, which is why this reads sentAt rather than createdAt.
 * Falls back to when the candidate was added, so a record nobody has touched
 * sorts as old rather than as unknown.
 *
 * One raw query rather than three grouped ones: this runs on the default view
 * of the candidates list, which already opens a lot of connections against a
 * pooler capped at 17.
 *
 * Sorting the whole filtered set means computing this for every match, not
 * just the visible page. That is fine at Scout's size (~900 candidates) and is
 * the reason the sort path pages in JS. If this table ever reaches tens of
 * thousands, this becomes a maintained column on Candidate instead.
 */
export async function getLastActivityMap(
  candidateIds: string[]
): Promise<Map<string, Date>> {
  if (candidateIds.length === 0) return new Map()

  const rows = await prisma.$queryRaw<{ id: string; lastActivityAt: Date }[]>`
    SELECT
      c.id,
      GREATEST(
        c."createdAt",
        COALESCE(
          (SELECT MAX(n."createdAt") FROM "ActivityNote" n WHERE n."candidateId" = c.id),
          c."createdAt"
        ),
        COALESCE(
          (SELECT MAX(e."sentAt") FROM "CandidateEmail" e
            WHERE e."candidateId" = c.id AND e."status" = 'SENT'),
          c."createdAt"
        ),
        COALESCE(
          (SELECT MAX(h."changedAt") FROM "StageHistory" h
             JOIN "Application" a ON a."id" = h."applicationId"
            WHERE a."candidateId" = c.id),
          c."createdAt"
        )
      ) AS "lastActivityAt"
    FROM "Candidate" c
    WHERE c."id" IN (${Prisma.join(candidateIds)})
  `

  return new Map(rows.map((r) => [r.id, r.lastActivityAt]))
}

/** "3 days ago" style, for a column people scan rather than read precisely. */
export function relativeDays(from: Date, now = new Date()): string {
  const days = Math.floor((now.getTime() - from.getTime()) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`
  const years = Math.floor(days / 365)
  return `${years} year${years === 1 ? '' : 's'} ago`
}
