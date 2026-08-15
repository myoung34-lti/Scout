import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getJob } from '@/lib/actions/jobs'
import { getBoardApplications } from '@/lib/actions/pipeline'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PipelineBoard } from '@/components/kanban/pipeline-board'

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Open',
  ON_HOLD: 'On hold',
  CLOSED: 'Closed',
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>
}) {
  const { jobId } = await params
  const [job, applications] = await Promise.all([
    getJob(jobId),
    getBoardApplications(jobId),
  ])

  if (!job) notFound()

  const arrangementParts = [
    job.isRemote && 'Remote',
    job.isHybrid && 'Hybrid',
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{job.internalName}</h1>
            <Badge>{STATUS_LABEL[job.status]}</Badge>
          </div>
          <p className="text-muted-foreground">
            {job.externalName} · {job.location}
            {arrangementParts.length > 0 && ` · ${arrangementParts.join(' / ')}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={`/candidates/new?jobId=${job.id}`}>Add Candidate</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/jobs/${job.id}/edit`}>Edit</Link>
          </Button>
        </div>
      </div>

      <PipelineBoard applications={applications} />

      <div className="space-y-5 rounded-lg border bg-background p-4">
        {job.whoWereLookingFor && (
          <div>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              Who We&apos;re Looking For
            </h2>
            <p className="whitespace-pre-wrap">{job.whoWereLookingFor}</p>
          </div>
        )}

        {job.primaryResponsibilities.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              Primary Responsibilities
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              {job.primaryResponsibilities.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {job.mustHaves.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              Some Must-Haves
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              {job.mustHaves.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {job.otherInformation && (
          <div>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              Other Information
            </h2>
            <p className="whitespace-pre-wrap">{job.otherInformation}</p>
          </div>
        )}
      </div>
    </div>
  )
}
