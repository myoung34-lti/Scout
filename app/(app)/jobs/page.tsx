import Link from 'next/link'
import { listJobs } from '@/lib/actions/jobs'
import { JobListTable } from '@/components/jobs/job-list-table'
import { Button } from '@/components/ui/button'
import type { JobStatus } from '@prisma/client'

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const statusFilter =
    status === 'OPEN' || status === 'ON_HOLD' || status === 'CLOSED'
      ? (status as JobStatus)
      : undefined

  const jobs = await listJobs(statusFilter)

  const filters: { label: string; value?: JobStatus }[] = [
    { label: 'All', value: undefined },
    { label: 'Open', value: 'OPEN' },
    { label: 'On hold', value: 'ON_HOLD' },
    { label: 'Closed', value: 'CLOSED' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Jobs</h1>
        <Button asChild>
          <Link href="/jobs/new">New Job</Link>
        </Button>
      </div>

      <div className="flex gap-2">
        {filters.map((f) => (
          <Link
            key={f.label}
            href={f.value ? `/jobs?status=${f.value}` : '/jobs'}
            className={`rounded-md px-3 py-1 text-sm ${
              statusFilter === f.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <JobListTable jobs={jobs} />
    </div>
  )
}
