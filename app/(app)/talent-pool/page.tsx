import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { NOT_DELETED } from '@/lib/candidate-visibility'
import { listJobs } from '@/lib/actions/jobs'
import { TERMINAL_STAGES } from '@/lib/pipeline'
import { getCandidateDisplayTitle } from '@/lib/candidate-type'
import { StarRating } from '@/components/candidates/star-rating'
import { Bookmark, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AddToJobDialog } from '@/components/candidates/add-to-job-dialog'
import { RemoveFromTalentPoolButton } from '@/components/candidates/remove-from-talent-pool-button'

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

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
        ...NOT_DELETED,
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
        <h1 className="page-title">Talent Pool</h1>
        <p className="text-sm text-muted-foreground">
          Candidates you&apos;re keeping warm for future roles, whether or
          not they&apos;re currently attached to a job.
        </p>
      </div>

      <form className="flex max-w-md gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={query}
            placeholder="Search by name or email…"
            aria-label="Search the talent pool"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {candidates.length === 0 ? (
        <div className="rounded-xl border border-border bg-card shadow-xs">
          <EmptyState
            icon={Bookmark}
            title={query ? 'No matches in the talent pool' : 'No one in the talent pool yet'}
            description={
              query
                ? 'Try a different name or email.'
                : 'Add candidates you want to keep warm for future roles from their profile.'
            }
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Title / Location</TableHead>
                <TableHead>Recruiter</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Added to pool</TableHead>
                <TableHead className="w-10" aria-label="Actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map((c) => {
                const activeJobIds = new Set(
                  c.applications
                    .filter((app) => !TERMINAL_STAGES.includes(app.stage))
                    .map((app) => app.jobId)
                )
                const eligibleJobs = allJobs
                  .filter((job) => job.status !== 'CLOSED' && !activeJobIds.has(job.id))
                  .map((job) => ({ id: job.id, internalName: job.internalName }))
                const initials =
                  `${c.firstName.charAt(0)}${c.lastName.charAt(0)}`.toUpperCase()

                return (
                  <TableRow key={c.id}>
                    <TableCell className="max-w-[22rem] whitespace-normal">
                      <div className="flex items-start gap-2.5">
                        <span
                          aria-hidden
                          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground"
                        >
                          {initials}
                        </span>
                        <span className="min-w-0">
                          <Link
                            href={`/candidates/${c.id}`}
                            className="font-medium hover:text-primary hover:underline"
                          >
                            {c.firstName} {c.lastName}
                          </Link>
                          {c.tags.length > 0 && (
                            <span className="mt-1 flex flex-wrap gap-1">
                              {c.tags.slice(0, 3).map((ct) => (
                                <Badge
                                  key={ct.tagId}
                                  variant="outline"
                                  className="text-[10px] font-normal"
                                >
                                  {ct.tag.displayLabel}
                                </Badge>
                              ))}
                              {c.tags.length > 3 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +{c.tags.length - 3}
                                </span>
                              )}
                            </span>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[16rem] truncate text-muted-foreground">
                      {getCandidateDisplayTitle(c) ?? c.email ?? '—'}
                      {c.location && <span className="block text-xs">{c.location}</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.owner?.name ?? '—'}
                    </TableCell>
                    <TableCell>
                      <StarRating value={c.rating} size="sm" />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.talentPoolAddedAt
                        ? dateFormatter.format(c.talentPoolAddedAt)
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        <AddToJobDialog candidateId={c.id} eligibleJobs={eligibleJobs} />
                        <RemoveFromTalentPoolButton candidateId={c.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
