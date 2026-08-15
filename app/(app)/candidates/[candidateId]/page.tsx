import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCandidate } from '@/lib/actions/candidates'
import { Badge } from '@/components/ui/badge'
import { STAGE_LABELS } from '@/lib/pipeline'
import { ResumeUploader } from '@/components/candidates/resume-uploader'
import { CandidateRating } from '@/components/candidates/candidate-rating'
import { ActivityFeed } from '@/components/candidates/activity-feed'
import { TagInput } from '@/components/candidates/tag-input'
import { listTags } from '@/lib/actions/tags'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export default async function CandidateProfilePage({
  params,
}: {
  params: Promise<{ candidateId: string }>
}) {
  const { candidateId } = await params
  const [candidate, allTags] = await Promise.all([
    getCandidate(candidateId),
    listTags(),
  ])

  if (!candidate) notFound()

  const subtitleParts = [
    candidate.currentTitle,
    candidate.currentCompany && `at ${candidate.currentCompany}`,
    candidate.location,
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">
            {candidate.firstName} {candidate.lastName}
          </h1>
          <CandidateRating
            candidateId={candidate.id}
            initialRating={candidate.rating}
          />
        </div>
        {subtitleParts.length > 0 && (
          <p className="text-muted-foreground">{subtitleParts.join(' · ')}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {candidate.email && <span>{candidate.email}</span>}
          {candidate.phone && <span>{candidate.phone}</span>}
          {candidate.linkedinUrl && (
            <a
              href={candidate.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              LinkedIn
            </a>
          )}
          {candidate.owner && <span>Owner: {candidate.owner.name}</span>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-lg border bg-background p-4">
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              Applications
            </h2>
            {candidate.applications.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Not assigned to any job.
              </p>
            ) : (
              <ul className="space-y-2">
                {candidate.applications.map((app) => (
                  <li
                    key={app.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <Link
                      href={`/jobs/${app.jobId}`}
                      className="font-medium hover:underline"
                    >
                      {app.job.internalName}
                    </Link>
                    <Badge variant="secondary">
                      {STAGE_LABELS[app.stage]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border bg-background p-4">
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              Activity
            </h2>
            <ActivityFeed candidateId={candidate.id} notes={candidate.notes} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-background p-4">
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              Resumes
            </h2>
            {candidate.resumes.length > 0 && (
              <ul className="mb-3 space-y-2">
                {candidate.resumes.map((resume) => (
                  <li
                    key={resume.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <a
                      href={`/api/resumes/${resume.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate hover:underline"
                    >
                      {resume.fileName}
                    </a>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {dateFormatter.format(resume.uploadedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <ResumeUploader candidateId={candidate.id} />
          </div>

          <div className="rounded-lg border bg-background p-4">
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              Tags
            </h2>
            <TagInput
              candidateId={candidate.id}
              tags={candidate.tags.map((ct) => ({
                tagId: ct.tagId,
                label: ct.tag.displayLabel,
              }))}
              allTags={allTags}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
