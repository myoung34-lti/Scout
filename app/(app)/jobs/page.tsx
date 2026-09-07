import Link from 'next/link'
import { Plus, Briefcase } from 'lucide-react'
import {
  listJobs,
  countJobsByStatus,
  countHiresByJob,
  listDistinctLocations,
} from '@/lib/actions/jobs'
import { JobsTable } from '@/components/jobs/jobs-table'
import { JobFilterBar } from '@/components/jobs/job-filter-bar'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import type { JobStatus } from '@prisma/client'

export const metadata = { title: 'Jobs' }

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; location?: string }>
}) {
  const { status, q, location } = await searchParams
  // No status param at all (a fresh visit) defaults to Open — "All" gets
  // its own explicit param value so it isn't indistinguishable from that
  // default once you actually want to see every job.
  const statusFilter: JobStatus | undefined =
    status === undefined
      ? 'OPEN'
      : status === 'OPEN' || status === 'ON_HOLD' || status === 'CLOSED'
        ? (status as JobStatus)
        : undefined

  const locationFilter = location && location !== 'ALL' ? location : undefined

  const [jobs, counts, hiresByJob, locations] = await Promise.all([
    listJobs(statusFilter, { query: q, location: locationFilter }),
    countJobsByStatus(),
    countHiresByJob(),
    listDistinctLocations(),
  ])

  const filters: { label: string; value: string; status?: JobStatus; count: number }[] = [
    { label: 'All Jobs', value: 'ALL', status: undefined, count: counts.ALL },
    { label: 'Open', value: 'OPEN', status: 'OPEN', count: counts.OPEN },
    { label: 'On hold', value: 'ON_HOLD', status: 'ON_HOLD', count: counts.ON_HOLD },
    { label: 'Closed', value: 'CLOSED', status: 'CLOSED', count: counts.CLOSED },
  ]

  const preserved = new URLSearchParams()
  if (q) preserved.set('q', q)
  if (locationFilter) preserved.set('location', locationFilter)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Jobs</h1>
          <p className="text-sm text-muted-foreground">
            Manage open roles and track progress.
          </p>
        </div>
        <Button asChild>
          <Link href="/jobs/new">
            <Plus />
            Add Job
          </Link>
        </Button>
      </div>

      <div className="flex w-full items-center gap-1 overflow-x-auto border-b border-border">
        {filters.map((f) => {
          const params = new URLSearchParams(preserved)
          params.set('status', f.value)
          const active = statusFilter === f.status
          return (
            <Link
              key={f.value}
              href={`/jobs?${params.toString()}`}
              aria-current={active ? 'page' : undefined}
              className={`-mb-px shrink-0 border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors ${
                active
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
              <span className="ml-1.5 tabular-nums text-muted-foreground/70">{f.count}</span>
            </Link>
          )
        })}
      </div>

      <JobFilterBar locations={locations} />

      {jobs.length === 0 ? (
        <div className="rounded-xl border border-border bg-card shadow-xs">
          <EmptyState
            icon={Briefcase}
            title="No jobs match these filters"
            description="Try a different status, clear the search, or add a new job."
            action={
              <Button asChild size="sm">
                <Link href="/jobs/new">
                  <Plus />
                  Add Job
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <JobsTable jobs={jobs} hiresByJob={hiresByJob} />
        </div>
      )}
    </div>
  )
}
