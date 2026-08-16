import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MapPin, Mail, Phone, ExternalLink, Users, Tag, FileText, ArrowLeft } from 'lucide-react'
import { getCandidate } from '@/lib/actions/candidates'
import { STAGE_LABELS, TERMINAL_STAGES, REJECTION_REASON_LABELS } from '@/lib/pipeline'
import { Badge } from '@/components/ui/badge'
import { ResumeUploader } from '@/components/candidates/resume-uploader'
import { CandidateRating } from '@/components/candidates/candidate-rating'
import { ActivityFeed } from '@/components/candidates/activity-feed'
import { TagInput } from '@/components/candidates/tag-input'
import { listTags } from '@/lib/actions/tags'
import { listJobs } from '@/lib/actions/jobs'
import { getCandidateDisplayTitle } from '@/lib/candidate-type'
import { CandidateTypeSelect } from '@/components/candidates/candidate-type-select'
import { AddToJobDialog } from '@/components/candidates/add-to-job-dialog'
import { TalentPoolToggle } from '@/components/candidates/talent-pool-toggle'
import { ApplicationPipelineStepper } from '@/components/candidates/application-pipeline-stepper'
import { EditCandidateDialog } from '@/components/candidates/edit-candidate-dialog'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})
const shortDateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

export default async function CandidateProfilePage({
  params,
}: {
  params: Promise<{ candidateId: string }>
}) {
  const { candidateId } = await params
  const [candidate, allTags, allJobs] = await Promise.all([
    getCandidate(candidateId),
    listTags(),
    listJobs(),
  ])

  if (!candidate) notFound()

  const activeJobIds = new Set(
    candidate.applications
      .filter((app) => !TERMINAL_STAGES.includes(app.stage))
      .map((app) => app.jobId)
  )
  const eligibleJobs = allJobs
    .filter((job) => job.status !== 'CLOSED' && !activeJobIds.has(job.id))
    .map((job) => ({ id: job.id, internalName: job.internalName }))

  const subtitleParts = [
    getCandidateDisplayTitle(candidate),
    candidate.currentCompany && `at ${candidate.currentCompany}`,
  ].filter(Boolean)

  const initials =
    `${candidate.firstName[0] ?? ''}${candidate.lastName[0] ?? ''}`.toUpperCase()

  return (
    <div className="space-y-6">
      <Link
        href="/candidates"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to all candidates
      </Link>

      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-muted text-xl font-semibold text-muted-foreground">
              {initials}
            </div>
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
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {candidate.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {candidate.location}
                  </span>
                )}
                {candidate.email && (
                  <a
                    href={`mailto:${candidate.email}`}
                    className="flex items-center gap-1.5 hover:text-foreground"
                  >
                    <Mail className="size-3.5" />
                    {candidate.email}
                  </a>
                )}
                {candidate.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="size-3.5" />
                    {candidate.phone}
                  </span>
                )}
                {candidate.linkedinUrl && (
                  <a
                    href={candidate.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-foreground"
                  >
                    <ExternalLink className="size-3.5" />
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-start gap-4">
            <div className="flex items-start gap-6 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Added</p>
                <p className="font-medium">
                  {shortDateFormatter.format(candidate.createdAt)}
                </p>
              </div>
              {candidate.owner && (
                <div>
                  <p className="text-xs text-muted-foreground">Owner</p>
                  <p className="font-medium">{candidate.owner.name}</p>
                </div>
              )}
            </div>
            <EditCandidateDialog
              candidate={{
                id: candidate.id,
                firstName: candidate.firstName,
                lastName: candidate.lastName,
                email: candidate.email,
                phone: candidate.phone,
                linkedinUrl: candidate.linkedinUrl,
                currentCompany: candidate.currentCompany,
                location: candidate.location,
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-lg border bg-background p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">
                Applications
              </h2>
              <AddToJobDialog
                candidateId={candidate.id}
                eligibleJobs={eligibleJobs}
              />
            </div>
            {candidate.applications.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Not assigned to any job.
              </p>
            ) : (
              <ul className="space-y-4">
                {candidate.applications.map((app) => (
                  <li key={app.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <Link
                        href={`/jobs/${app.jobId}`}
                        className="font-medium hover:underline"
                      >
                        {app.job.internalName}
                      </Link>
                      {app.stage === 'REJECTED' && (
                        <Badge variant="secondary">
                          {STAGE_LABELS.REJECTED}
                          {app.rejectionReason &&
                            ` · ${REJECTION_REASON_LABELS[app.rejectionReason]}`}
                        </Badge>
                      )}
                    </div>
                    {app.stage !== 'REJECTED' && (
                      <div className="mt-2">
                        <ApplicationPipelineStepper
                          applicationId={app.id}
                          currentStage={app.stage}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border bg-background p-4">
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              Activity
            </h2>
            <ActivityFeed
              candidateId={candidate.id}
              notes={candidate.notes}
              interviews={candidate.interviews}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-background p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="size-4" />
              Talent Pool
            </h2>
            <TalentPoolToggle
              candidateId={candidate.id}
              inTalentPool={candidate.inTalentPool}
              addedAt={candidate.talentPoolAddedAt}
              addedByName={candidate.talentPoolAddedBy?.name ?? null}
            />
          </div>

          <div className="rounded-lg border bg-background p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Tag className="size-4" />
              Type
            </h2>
            <CandidateTypeSelect
              candidateId={candidate.id}
              initialType={candidate.candidateType}
            />
          </div>

          <div className="rounded-lg border bg-background p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="size-4" />
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
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Tag className="size-4" />
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
