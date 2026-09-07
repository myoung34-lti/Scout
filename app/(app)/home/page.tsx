import Link from 'next/link'
import { ArrowRight, Briefcase, UserPlus, Plus } from 'lucide-react'
import { getHomeSnapshot } from '@/lib/actions/home'
import {
  getReportingHeadlineStats,
  getHeadlineCurrentPeriodDefinition,
} from '@/lib/reporting/reporting-service'
import { STAGE_LABELS, stageTone } from '@/lib/pipeline'
import type { StageTone } from '@/lib/pipeline'
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

export default async function HomePage() {
  const [snapshot, stats] = await Promise.all([
    getHomeSnapshot(),
    getReportingHeadlineStats(),
  ])

  const firstName = snapshot.userName?.split(' ')[0]
  const busiest = Math.max(1, ...snapshot.stageCounts.map((s) => s.count))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">
            {firstName ? `Welcome back, ${firstName}` : 'Home'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Where things stand across your pipeline today.
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
          label="Candidates Added"
          stat={stats.added}
          definition={getHeadlineCurrentPeriodDefinition('CANDIDATES_ADDED')}
        />
        <StatCard
          label="Candidates Interviewed"
          stat={stats.interviewed}
          definition={getHeadlineCurrentPeriodDefinition('CANDIDATES_INTERVIEWED')}
        />
        <StatCard
          label="Candidates Hired"
          stat={stats.hired}
          definition={getHeadlineCurrentPeriodDefinition('CANDIDATES_HIRED')}
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
            {snapshot.activeTotal === 0 ? (
              <EmptyState
                title="Nobody in process"
                description="Add a candidate to an open job to start the pipeline."
              />
            ) : (
              <ul className="space-y-2.5">
                {snapshot.stageCounts.map(({ stage, count }) => (
                  <li key={stage}>
                    <Link
                      href="/pipeline"
                      className="group flex items-center gap-3 text-sm"
                    >
                      <span className="w-40 shrink-0 truncate text-muted-foreground group-hover:text-foreground">
                        {STAGE_LABELS[stage]}
                      </span>
                      {/* Bar length is relative to the busiest stage, so the
                          shape of the funnel is legible at a glance. */}
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Roles with nobody in process</CardTitle>
          </CardHeader>
          <CardContent>
            {snapshot.unstaffedJobs.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="Every open role has candidates"
                description={`All ${snapshot.openJobCount} open roles have someone in process.`}
                className="py-8"
              />
            ) : (
              <ul className="space-y-2">
                {snapshot.unstaffedJobs.map((job) => (
                  <li key={job.id}>
                    <Link
                      href={`/jobs/${job.id}`}
                      className="block rounded-lg border border-border p-2.5 transition-colors hover:border-primary/50"
                    >
                      <span className="block truncate text-sm font-medium">
                        {job.internalName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {job.location}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recently added</CardTitle>
          <CardAction>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/candidates">
                All candidates
                <ArrowRight />
              </Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {snapshot.recentCandidates.length === 0 ? (
            <EmptyState title="No candidates yet" className="py-8" />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {snapshot.recentCandidates.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/candidates/${c.id}`}
                    className="flex h-full flex-col rounded-lg border border-border p-3 transition-colors hover:border-primary/50"
                  >
                    <span className="truncate text-sm font-medium">{c.name}</span>
                    {c.subtitle && (
                      <span className="truncate text-xs text-muted-foreground">
                        {c.subtitle}
                      </span>
                    )}
                    <span className="mt-1 text-xs text-muted-foreground">
                      Added {dateFormatter.format(c.addedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
