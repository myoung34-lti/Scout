import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { Job } from '@prisma/client'

const STATUS_LABEL: Record<Job['status'], string> = {
  OPEN: 'Open',
  ON_HOLD: 'On hold',
  CLOSED: 'Closed',
}

const STATUS_VARIANT: Record<Job['status'], 'default' | 'secondary' | 'outline'> = {
  OPEN: 'default',
  ON_HOLD: 'secondary',
  CLOSED: 'outline',
}

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

type JobWithCount = Job & { _count: { applications: number } }

export function JobList({ jobs }: { jobs: JobWithCount[] }) {
  if (jobs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No jobs yet. Create one to get started.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <Link
          key={job.id}
          href={`/jobs/${job.id}`}
          className="block rounded-lg border bg-background p-5 transition-colors hover:border-primary/50"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">{job.internalName}</h2>
              <p className="truncate text-sm text-muted-foreground">
                {job.externalName} · {job.location}
              </p>
            </div>
            <Badge variant={STATUS_VARIANT[job.status]} className="shrink-0">
              {STATUS_LABEL[job.status]}
            </Badge>
          </div>

          {(job.isRemote || job.isHybrid) && (
            <div className="mt-3 flex gap-1.5">
              {job.isRemote && <Badge variant="outline">Remote</Badge>}
              {job.isHybrid && <Badge variant="outline">Hybrid</Badge>}
            </div>
          )}

          {job.whoWereLookingFor && (
            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
              {job.whoWereLookingFor}
            </p>
          )}

          <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
            <span>
              {job._count.applications}{' '}
              {job._count.applications === 1 ? 'candidate' : 'candidates'} in
              pipeline
            </span>
            <span>Posted {dateFormatter.format(job.createdAt)}</span>
          </div>
        </Link>
      ))}
    </div>
  )
}
