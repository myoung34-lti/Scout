import Link from 'next/link'
import { ArrowRight, CalendarClock, Clock, UserPlus, Plus } from 'lucide-react'
import { getHomeSnapshot } from '@/lib/actions/home'
import { STAGE_LABELS, stageTone, IN_PROCESS_STAGES } from '@/lib/pipeline'
import type { StageTone } from '@/lib/pipeline'
import { INTERVIEW_TYPE_LABELS } from '@/lib/interview'
import type { InterviewType } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { StatCard } from '@/components/reporting/stat-card'

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

const TONE_BAR: Record<StageTone, string> = {
  neutral: 'bg-muted-foreground/40',
  info: 'bg-info',
  warning: 'bg-warning',
  success: 'bg-success',
  danger: 'bg-danger',
}

const ACTIVITY_LABEL: Record<'stage' | 'note' | 'email' | 'applied', string> = {
  stage: 'stage move',
  note: 'note',
  email: 'email',
  applied: 'applied',
}

// Marks something the dashboard will show once a deferred schema change
// lands — so a gap reads as planned rather than broken.
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
  const busiest = Math.max(1, ...snapshot.funnel.map((s) => s.count))
  const funnelTotal = snapshot.funnel.reduce((sum, s) => sum + s.count, 0)

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
          label="Jobs Assigned"
          stat={{ current: snapshot.jobsAssigned }}
          href="/jobs?status=ALL"
          caption="Open + on hold · you as recruiter"
        />
        <StatCard
          label="Candidates In Process"
          stat={{ current: snapshot.inProcess }}
          href={inProcessHref}
          caption="Assigned to you · Intro → Offer"
        />
        <StatCard
          label="Hires This Quarter"
          stat={{ current: snapshot.hiresThisQuarter }}
          caption={`${snapshot.quarterLabel} to date · your candidates`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>In process</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/pipeline">
                  Open pipeline
                  <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {funnelTotal === 0 ? (
              <EmptyState
                title="Nobody in process"
                description="Assign yourself as recruiter on a job to see its pipeline here."
                className="py-8"
                action={
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/jobs?status=ALL">Browse jobs</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-2.5">
                {snapshot.funnel.map(({ stage, count }) => (
                  <li key={stage}>
                    <Link href="/pipeline" className="group flex items-center gap-3 text-sm">
                      <span className="w-40 shrink-0 truncate text-muted-foreground group-hover:text-foreground">
                        {STAGE_LABELS[stage]}
                      </span>
                      {/* Bars are relative to the busiest stage, so the shape
                          of the funnel reads at a glance. */}
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <span
                          className={`block h-full rounded-full ${TONE_BAR[stageTone(stage)]}`}
                          style={{ width: `${Math.round((count / busiest) * 100)}%` }}
                        />
                      </span>
                      <span className="w-8 shrink-0 text-right font-medium tabular-nums">
                        {count}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              Everyone in process on the jobs you&rsquo;re the recruiter for.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your interviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <PlannedPanel needs="a scheduled date/time on Interview">
              Upcoming interviews, ordered by when they happen. Interviews are already
              assigned to a recruiter, but nothing records <em>when</em> one is scheduled.
            </PlannedPanel>

            {snapshot.openInterviews.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="No unsubmitted drafts"
                description="Interviews you've started but not submitted will appear here."
                className="py-6"
              />
            ) : (
              <div>
                <p className="section-label mb-2">Drafts · started, not submitted</p>
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
                        <span className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                          <span className="truncate">
                            {INTERVIEW_TYPE_LABELS[i.type as InterviewType]} ·{' '}
                            {dateFormatter.format(i.createdAt)}
                          </span>
                          <span className="shrink-0 tabular-nums">{i.daysOpen}d open</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Oldest draft first.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No activity in over a week</CardTitle>
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
              title="Nothing has gone quiet"
              description="Every candidate assigned to you has had a stage move, note, or email in the last week."
              className="py-8"
            />
          ) : (
            <ul className="divide-y divide-border">
              {snapshot.stalled.map((s) => (
                <li key={s.candidateId + s.jobName}>
                  <Link
                    href={`/candidates/${s.candidateId}`}
                    className="flex items-center gap-4 py-2.5 transition-colors hover:text-primary"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{s.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {s.jobName}
                      </span>
                    </span>
                    <Badge variant={stageTone(s.stage)}>{STAGE_LABELS[s.stage]}</Badge>
                    <span className="w-56 shrink-0 text-right text-xs text-muted-foreground">
                      <span className="block font-medium tabular-nums text-foreground">
                        {s.daysQuiet}d quiet
                      </span>
                      <span className="block">
                        last {ACTIVITY_LABEL[s.lastActivityKind]} ·{' '}
                        {dateFormatter.format(s.lastActivityAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Activity counts a stage move, a note, or an email sent to the candidate.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
