import Link from 'next/link'
import { Plus } from 'lucide-react'
import { listJobs, countJobsByStatus } from '@/lib/actions/jobs'
import { JobList } from '@/components/jobs/job-list'
import { Button } from '@/components/ui/button'
import type { JobStatus } from '@prisma/client'

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  // No status param at all (a fresh visit) defaults to Open — "All" gets
  // its own explicit param value so it isn't indistinguishable from that
  // default once you actually want to see every job.
  const statusFilter: JobStatus | undefined =
    status === undefined
      ? 'OPEN'
      : status === 'OPEN' || status === 'ON_HOLD' || status === 'CLOSED'
        ? (status as JobStatus)
        : undefined

  const [jobs, counts] = await Promise.all([listJobs(statusFilter), countJobsByStatus()])

  const filters: { label: string; value: string; status?: JobStatus; count: number }[] = [
    { label: 'All', value: 'ALL', status: undefined, count: counts.ALL },
    { label: 'Open', value: 'OPEN', status: 'OPEN', count: counts.OPEN },
    { label: 'On hold', value: 'ON_HOLD', status: 'ON_HOLD', count: counts.ON_HOLD },
    { label: 'Closed', value: 'CLOSED', status: 'CLOSED', count: counts.CLOSED },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Jobs</h1>
        <Button asChild>
          <Link href="/jobs/new">
            <Plus />
            Add Job
          </Link>
        </Button>
      </div>

      <div className="flex gap-2">
        {filters.map((f) => (
          <Link
            key={f.label}
            href={`/jobs?status=${f.value}`}
            className={`rounded-md px-3 py-1 text-sm ${
              statusFilter === f.status
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {f.label} ({f.count})
          </Link>
        ))}
      </div>

      <JobList jobs={jobs} />
    </div>
  )
}
