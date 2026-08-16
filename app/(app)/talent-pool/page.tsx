import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { listJobs } from '@/lib/actions/jobs'
import { TERMINAL_STAGES } from '@/lib/pipeline'
import { getCandidateDisplayTitle } from '@/lib/candidate-type'
import { StarRating } from '@/components/candidates/star-rating'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AddToJobDialog } from '@/components/candidates/add-to-job-dialog'
import { RemoveFromTalentPoolButton } from '@/components/candidates/remove-from-talent-pool-button'

export default async function TalentPoolPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  await requireSession()
  const { q } = await searchParams
  const query = typeof q === 'string' ? q.trim() : undefined

  const [candidates, allJobs] = await Promise.all([
    prisma.candidate.findMany({
      where: {
        inTalentPool: true,
        ...(query
          ? {
              OR: [
                { firstName: { contains: query, mode: 'insensitive' } },
                { lastName: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        owner: true,
        tags: { include: { tag: true } },
        applications: { include: { job: true } },
      },
      orderBy: { talentPoolAddedAt: 'desc' },
    }),
    listJobs(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Talent Pool</h1>
        <p className="text-sm text-muted-foreground">
          Candidates you&apos;re keeping warm for future roles, whether or
          not they&apos;re currently attached to a job.
        </p>
      </div>

      <form className="flex max-w-sm gap-2">
        <Input name="q" defaultValue={query} placeholder="Search by name or email…" />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No candidates in the Talent Pool yet.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-background">
          {candidates.map((c) => {
            const activeJobIds = new Set(
              c.applications
                .filter((app) => !TERMINAL_STAGES.includes(app.stage))
                .map((app) => app.jobId)
            )
            const eligibleJobs = allJobs
              .filter((job) => job.status !== 'CLOSED' && !activeJobIds.has(job.id))
              .map((job) => ({ id: job.id, internalName: job.internalName }))

            return (
              <li key={c.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/candidates/${c.id}`}
                      className="font-medium hover:underline"
                    >
                      {c.firstName} {c.lastName}
                    </Link>
                    <StarRating value={c.rating} size="sm" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getCandidateDisplayTitle(c) ?? c.email ?? '—'}
                    {c.location && ` · ${c.location}`}
                    {c.owner && ` · Recruiter: ${c.owner.name}`}
                  </p>
                  {c.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {c.tags.map((ct) => (
                        <Badge key={ct.tagId} variant="outline">
                          {ct.tag.displayLabel}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <AddToJobDialog candidateId={c.id} eligibleJobs={eligibleJobs} />
                  <RemoveFromTalentPoolButton candidateId={c.id} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
