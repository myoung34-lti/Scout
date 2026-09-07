import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Job } from '@prisma/client'

const STATUS_LABEL: Record<Job['status'], string> = {
  OPEN: 'Open',
  ON_HOLD: 'On hold',
  CLOSED: 'Closed',
}

const STATUS_VARIANT: Record<Job['status'], 'success' | 'warning' | 'neutral'> = {
  OPEN: 'success',
  ON_HOLD: 'warning',
  CLOSED: 'neutral',
}

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

type JobWithCount = Job & {
  _count: { applications: number }
  recruiter: { id: string; name: string } | null
  sourcer: { id: string; name: string } | null
}

function arrangement(job: Job) {
  return [job.isOnsite && 'Onsite', job.isHybrid && 'Hybrid', job.isRemote && 'Remote']
    .filter(Boolean)
    .join(' / ')
}

export function JobsTable({
  jobs,
  hiresByJob,
}: {
  jobs: JobWithCount[]
  hiresByJob: Record<string, number>
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Job</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Candidates</TableHead>
          <TableHead className="text-right">Hires</TableHead>
          <TableHead>Recruiter</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => {
          // Client and team are Scout-specific and the mockup didn't know
          // about them — kept as a subtitle rather than dropped.
          const subtitle = [job.clientName, job.teamName].filter(Boolean).join(' · ')
          return (
            <TableRow key={job.id}>
              <TableCell className="max-w-[24rem] whitespace-normal">
                <Link
                  href={`/jobs/${job.id}`}
                  className="font-medium hover:text-primary hover:underline"
                >
                  {job.internalName}
                </Link>
                {subtitle && (
                  <span className="block text-xs text-muted-foreground">{subtitle}</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {job.location}
                {arrangement(job) && (
                  <span className="block text-xs">{arrangement(job)}</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[job.status]}>{STATUS_LABEL[job.status]}</Badge>
              </TableCell>
              <TableCell className="text-right">{job._count.applications}</TableCell>
              <TableCell className="text-right">{hiresByJob[job.id] ?? 0}</TableCell>
              <TableCell className="text-muted-foreground">
                {job.recruiter?.name ?? <span className="text-muted-foreground/60">Unassigned</span>}
                {job.sourcer && (
                  <span className="block text-xs">Sourcer: {job.sourcer.name}</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {dateFormatter.format(job.createdAt)}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
