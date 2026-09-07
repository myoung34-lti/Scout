import Link from 'next/link'
import {
  ArrowRight,
  Briefcase,
  ClipboardCheck,
  Clock,
  Plus,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react'
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
const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

const ACTIVITY_LABEL: Record<'stage' | 'note' | 'email' | 'applied', string> = {
  stage: 'Stage moved',
  note: 'Note added',
  email: 'Email sent',
  applied: 'Applied',
}

// Both scrolling regions share a height so the two cards line up on desktop
// without either growing unbounded as data accumulates.
const SCROLL_REGION = 'max-h-[19rem] overflow-y-auto'

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
    <div className="space-y-5">
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
          icon={<Briefcase />}
          stat={{ current: snapshot.jobsAssigned }}
          href="/jobs?status=ALL"
          caption="Open + on hold · you as recruiter"
        />
        <StatCard
          label="Candidates In Process"
          icon={<Users />}
          stat={{ current: snapshot.inProcess }}
          href={inProcessHref}
          caption="Assigned to you · Intro → Offer"
        />
        <StatCard
          label="Hires This Quarter"
          icon={<Trophy />}
          stat={{ current: snapshot.hiresThisQuarter }}
          caption={`${snapshot.quarterLabel} to date · your candidates`}
        />
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-12">
        <Card className="h-full lg:col-span-7">
          <CardHeader>
            <CardTitle>Your Pipeline</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/pipeline">
                  Open pipeline
                  <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
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
              <ul className="flex flex-1 flex-col justify-center gap-3">
                {snapshot.funnel.map(({ stage, count }) => (
                  <li key={stage}>
                    <Link href="/pipeline" className="group flex items-center gap-3 text-sm">
                      <span className="w-40 shrink-0 truncate text-muted-foreground group-hover:text-foreground">
                        {STAGE_LABELS[stage]}
                      </span>
                      {/* One accent for every stage — the number carries the
                          difference, colour would only add noise. */}
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <span
                          className="block h-full rounded-full bg-primary"
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

        <Card className="h-full lg:col-span-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Your Interviews
              {snapshot.scorecardsDueTotal > 0 && (
                <span className="text-muted-foreground tabular-nums">
                  · {snapshot.scorecardsDueTotal}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          {/* One scroll region for both sections, so Scorecards Due is always
              what you see first and Upcoming never pushes it out of view. */}
          <CardContent className={SCROLL_REGION}>
            {snapshot.openInterviews.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title="No scorecards due"
                description="Interviews you've started but not submitted will appear here."
                className="py-6"
              />
            ) : (
              <div className="space-y-1.5">
                <p className="section-label sticky top-0 z-10 flex items-center gap-1.5 bg-card py-1 text-warning">
                  <Clock className="size-3.5" />
                  Scorecards Due · {snapshot.scorecardsDueTotal}
                </p>
                {snapshot.openInterviews.map((i) => (
                  <Link
                    key={i.id}
                    href={`/candidates/${i.candidateId}/interview/${i.id}`}
                    className="flex items-center gap-3 rounded-lg border border-warning-border bg-warning-soft/40 p-2.5 transition-colors hover:border-warning"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {i.candidateName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {INTERVIEW_TYPE_LABELS[i.type as InterviewType]}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-xs">
                      <span className="block font-medium tabular-nums text-warning">
                        {i.daysOpen}d overdue
                      </span>
                      <span className="block text-muted-foreground">
                        {dateFormatter.format(i.createdAt)}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
            <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
              Upcoming interviews need a scheduled date on Interview — not recorded yet.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Needs Attention
            {snapshot.stalledTotal > 0 && (
              <span className="text-muted-foreground tabular-nums">
                · {snapshot.stalledTotal}
              </span>
            )}
          </CardTitle>
          <CardAction>
            <Button variant="ghost" size="sm" asChild>
              <Link href={inProcessHref}>
                View all
                <ArrowRight />
              </Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {snapshot.stalled.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="Nothing needs attention"
              description="Every candidate assigned to you has had a stage move, note, or email in the last week."
              className="py-8"
            />
          ) : (
            <div className="max-h-[17rem] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b border-border-strong text-left">
                    {['Candidate', 'Job', 'Current Stage', 'Days Since Activity', 'Last Activity'].map(
                      (h) => (
                        <th
                          key={h}
                          className="whitespace-nowrap py-2 pr-4 text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {snapshot.stalled.map((s) => (
                    <tr key={s.candidateId + s.jobName} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-4">
                        <Link
                          href={`/candidates/${s.candidateId}`}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {s.name}
                        </Link>
                      </td>
                      <td className="max-w-[16rem] truncate py-2.5 pr-4 text-muted-foreground">
                        {s.jobName}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge variant={stageTone(s.stage)}>{STAGE_LABELS[s.stage]}</Badge>
                      </td>
                      <td className="py-2.5 pr-4 tabular-nums">{s.daysQuiet}d</td>
                      <td className="whitespace-nowrap py-2.5 text-muted-foreground">
                        <span className="block">{shortDate.format(s.lastActivityAt)}</span>
                        <span className="block text-xs">
                          {ACTIVITY_LABEL[s.lastActivityKind]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
