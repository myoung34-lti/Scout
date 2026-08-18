import Link from 'next/link'
import { ArrowLeft, Plus } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getJob } from '@/lib/actions/jobs'
import { getBoardApplications } from '@/lib/actions/pipeline'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PipelineBoard } from '@/components/kanban/pipeline-board'
import { ACTIVE_STAGES, FORMAL_INTERVIEW_STAGES } from '@/lib/pipeline'

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
    job.isOnsite && 'Onsite',
    job.isHybrid && 'Hybrid',
    job.isRemote && 'Remote',
  ].filter(Boolean)

  const totalCandidates = applications.filter((a) => a.stage !== 'HIRED').length
  const activeCandidates = applications.filter((a) =>
    ACTIVE_STAGES.includes(a.stage)
  ).length
  const formalInterviewCandidates = applications.filter((a) =>
    FORMAL_INTERVIEW_STAGES.includes(a.stage)
  ).length

  const summaryCards = [
    { label: 'Total Candidates', value: totalCandidates },
    { label: 'Active Candidates', value: activeCandidates },
    { label: 'Formal Interview Process', value: formalInterviewCandidates },
  ]

  return (
    <div className="space-y-6">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to all jobs
      </Link>

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
          {(job.clientName || job.teamName) && (
            <p className="text-sm text-muted-foreground">
              {[
                job.clientName && `Client: ${job.clientName}`,
                job.teamName && `Team: ${job.teamName}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button variant="outline" asChild>
            <Link href={`/jobs/${job.id}/edit`}>Edit Job</Link>
          </Button>
          <Button asChild>
            <Link href={`/candidates/new?jobId=${job.id}`}>
              <Plus />
              Add Candidate
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-lg border bg-background p-4">
            <p className="text-sm font-medium text-muted-foreground">
              {card.label}
            </p>
            <p className="mt-1 text-2xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>

      <PipelineBoard applications={applications} />

      {job.description && (
        <div className="rounded-lg border bg-background p-4">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">
            Description
          </h2>
          <p className="max-h-64 overflow-y-auto whitespace-pre-wrap">
            {job.description}
          </p>
        </div>
      )}
    </div>
  )
}
