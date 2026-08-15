import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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

export function JobListTable({ jobs }: { jobs: Job[] }) {
  if (jobs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No jobs yet. Create one to get started.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Internal name</TableHead>
          <TableHead>External name</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow key={job.id}>
            <TableCell>
              <Link
                href={`/jobs/${job.id}`}
                className="font-medium hover:underline"
              >
                {job.internalName}
              </Link>
            </TableCell>
            <TableCell>{job.externalName}</TableCell>
            <TableCell>{job.location}</TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANT[job.status]}>
                {STATUS_LABEL[job.status]}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
