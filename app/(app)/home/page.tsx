import Link from 'next/link'
import { ArrowRight, CalendarClock, Clock, UserPlus, Plus, UsersRound } from 'lucide-react'
import { getHomeSnapshot } from '@/lib/actions/home'
import { STAGE_LABELS, stageTone, IN_PROCESS_STAGES } from '@/lib/pipeline'
import { INTERVIEW_TYPE_LABELS } from '@/lib/interview'
import type { InterviewType } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { StatCard } from '@/components/reporting/stat-card'

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

// Marks a panel whose real data needs a schema change we've deliberately
// deferred, so it reads as "not built yet" rather than "broken" or, worse,
// as real data.
function PlannedPanel({ needs, children }: { needs: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border-strong bg-muted/40 p-4">
      <Badge variant="warning" className="mb-2">
        Not built yet
      </Badge>
      <p className="text-sm text-muted-foreground">{children}</p>
      <p className="mt-2 text-xs text-muted-foreground">Needs: {needs}</p>
    </div>
  )
}

export default async function HomePage() {
  const snapshot = await getHomeSnapshot()
  const firstName = snapshot.userName?.split(' ')[0]

  // Exactly the predicate behind the In Process number, so the card and the
  // list it opens can't disagree.
  const inProcessHref = `/candidates?recruiterId=${snapshot.userId}&${IN_PROCESS_STAGES.map(
    (s) => `stage=${s}`
  ).join('&')}`

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">
            {firstName ? `Welcome back, ${firstName}` : 'Home'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Your candidates, and what needs moving today.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/jobs/new">
              <Plus />
              Add Job
            </Link>
          </Button>
          <Button asChild>
            <Link href="/candidates/new">
              <UserPlus />
              Add Candidate
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="In Process"
          stat={{ current: snapshot.inProcess }}
          href={inProcessHref}
          caption="Assigned to you · Intro → Offer"
        />
        <StatCard
          label="Interviewed"
          stat={snapshot.interviewed30d}
          caption="Your candidates · last 30 days"
        />
        <StatCard
          label="Hired"
          stat={snapshot.hired30d}
          caption="Your candidates · last 30 days"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Not moved in over a week</CardTitle>
            <CardAction>
              {snapshot.stalledTotal > snapshot.stalled.length && (
                <span className="text-xs text-muted-foreground">
                  showing {snapshot.stalled.length} of {snapshot.stalledTotal}
                </span>
              )}
            </CardAction>
          </CardHeader>
          <CardContent>
            {snapshot.stalled.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="Nothing is stuck"
                description="Every candidate assigned to you has moved stage in the last week."
                className="py-8"
              />
            ) : (
              <ul className="divide-y divide-border">
                {snapshot.stalled.map((s) => (
                  <li key={s.candidateId + s.jobName}>
                    <Link
                      href={`/candidates/${s.candidateId}`}
                      className="flex items-center gap-3 py-2.5 transition-colors hover:text-primary"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{s.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {s.jobName}
                        </span>
                      </span>
                      <Badge variant={stageTone(s.stage)}>{STAGE_LABELS[s.stage]}</Badge>
                      <span className="w-20 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                        {s.daysStalled}d ago
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your interviews</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/pipeline">
                  Pipeline
                  <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-3">
            <PlannedPanel needs="a scheduled date/time on Interview">
              Upcoming interviews, ordered by when they happen. Interviews are already
              assigned to a recruiter today, but nothing records <em>when</em> one is
              scheduled — so &ldquo;upcoming&rdquo; can&rsquo;t be ordered yet.
            </PlannedPanel>

            {snapshot.openInterviews.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="No open interviews"
                description="Interviews assigned to you that aren't complete will appear here."
                className="py-6"
              />
            ) : (
              <div>
                <p className="section-label mb-2">Assigned to you, not yet completed</p>
                <ul className="space-y-1.5">
                  {snapshot.openInterviews.map((i) => (
                    <li key={i.id}>
                      <Link
                        href={`/candidates/${i.candidateId}/interview/${i.id}`}
                        className="block rounded-lg border border-border p-2.5 transition-colors hover:border-primary/50"
                      >
                        <span className="block truncate text-sm font-medium">
                          {i.candidateName}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {INTERVIEW_TYPE_LABELS[i.type as InterviewType]} · started{' '}
                          {dateFormatter.format(i.createdAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Jobs by recruiter</CardTitle>
          <CardAction>
            <UsersRound className="size-4 text-muted-foreground" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <PlannedPanel needs="sourcer and recruiter fields on Job">
            Open roles grouped by the recruiter and sourcer they&rsquo;re assigned to, so
            you can see coverage across the team at a glance. Jobs currently have no
            owner of any kind — recruiter only exists on candidates and interviews.
          </PlannedPanel>
        </CardContent>
      </Card>
    </div>
  )
}
