import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MapPin, Mail, Phone, ExternalLink, Users, Tag, FileText } from 'lucide-react'
import { BackButton } from '@/components/layout/back-button'
import { getCandidate } from '@/lib/actions/candidates'
import { STAGE_LABELS, TERMINAL_STAGES, rejectionReasonText, stageTone } from '@/lib/pipeline'
import { Badge } from '@/components/ui/badge'
import { ResumeUploader } from '@/components/candidates/resume-uploader'
import { CandidateRating } from '@/components/candidates/candidate-rating'
import { ActivityFeed } from '@/components/candidates/activity-feed'
import { AskScoutCard } from '@/components/candidates/ask-scout-card'
import { CandidateInsightsCard } from '@/components/candidates/candidate-insights-card'
import { ComposeEmailProvider } from '@/components/candidates/compose-email-provider'
import { TagInput } from '@/components/candidates/tag-input'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { ProfileTabs, ProfileTabsProvider } from '@/components/candidates/profile-tabs'
import { InsightsRailCard } from '@/components/candidates/insights-rail-card'
import { CandidateHeaderActions } from '@/components/candidates/candidate-header-actions'
import { listTags } from '@/lib/actions/tags'
import { listJobs } from '@/lib/actions/jobs'
import { listUsers } from '@/lib/actions/users'
import { getComposeEmailGlobals } from '@/lib/actions/compose-email-context'
import { requireSession } from '@/lib/session'
import { getCandidateDisplayTitle, findRelevantApplication } from '@/lib/candidate-type'
import { AddToJobDialog } from '@/components/candidates/add-to-job-dialog'
import { TalentPoolToggle } from '@/components/candidates/talent-pool-toggle'
import { ApplicationPipelineStepper } from '@/components/candidates/application-pipeline-stepper'
import { ExperienceCard } from '@/components/candidates/experience-card'
import type { WorkHistoryEntry } from '@/lib/actions/resume-parser'
import { INTERVIEW_STAGE_FOR_TYPE } from '@/lib/interview'
import type {
  PipelineStage,
  InterviewRecommendation,
  InterviewType,
  InterviewStatus,
} from '@prisma/client'

// The most recent completed interview of each type wins its stage's badge —
// `interviews` is expected pre-sorted newest-first (as getCandidate returns
// it), so the first match per stage encountered here is the latest one.
function stageOutcomesFor(
  applicationId: string,
  interviews: {
    applicationId: string | null
    type: InterviewType
    status: InterviewStatus
    recommendation: InterviewRecommendation | null
  }[]
): Partial<Record<PipelineStage, InterviewRecommendation>> {
  const outcomes: Partial<Record<PipelineStage, InterviewRecommendation>> = {}
  for (const interview of interviews) {
    if (interview.applicationId !== applicationId) continue
    if (interview.status !== 'COMPLETED' || !interview.recommendation) continue
    const stage = INTERVIEW_STAGE_FOR_TYPE[interview.type]
    if (!(stage in outcomes)) {
      outcomes[stage] = interview.recommendation
    }
  }
  return outcomes
}

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
  await requireSession()
  const [candidate, allTags, allJobs, allUsers, composeGlobals] = await Promise.all([
    getCandidate(candidateId),
    listTags(),
    listJobs(),
    listUsers(),
    getComposeEmailGlobals(),
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

  // Only pair "at {currentCompany}" with the display title when that title
  // is the candidate's Type/current title, not the job they're going for —
  // "{Job they're going for} · at {current employer}" reads like they
  // already work there, which is confusing when it's just their day job.
  const relevantApplication = findRelevantApplication(candidate)
  const subtitleParts = [
    getCandidateDisplayTitle(candidate),
    !relevantApplication && candidate.currentCompany && `at ${candidate.currentCompany}`,
  ].filter(Boolean)

  const initials =
    `${candidate.firstName[0] ?? ''}${candidate.lastName[0] ?? ''}`.toUpperCase()

  const latestActivityAt = [
    candidate.updatedAt,
    ...candidate.notes.map((n) => n.createdAt),
    ...candidate.interviews.map((i) => i.updatedAt),
    ...candidate.resumes.map((r) => r.uploadedAt),
  ].reduce((latest, d) => (d > latest ? d : latest), candidate.updatedAt)

  return (
    <ComposeEmailProvider
      candidateId={candidate.id}
      candidateEmail={candidate.email}
      candidateFirstName={candidate.firstName}
      candidateLastName={candidate.lastName}
      candidateCurrentCompany={candidate.currentCompany ?? ''}
      candidateCurrentTitle={candidate.currentTitle ?? ''}
      jobTitle={relevantApplication?.job.internalName ?? ''}
      jobLocation={relevantApplication?.job.location ?? ''}
      applicationId={relevantApplication?.id ?? null}
      recruiterName={composeGlobals.recruiterName}
      recruiterEmail={composeGlobals.recruiterEmail}
      staticVariables={composeGlobals.staticVariables}
      emailTemplates={composeGlobals.emailTemplates}
    >
    <ProfileTabsProvider>
    <div className="space-y-6">
      <BackButton />

      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-muted text-xl font-semibold text-muted-foreground">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="page-title">
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
                  <p className="text-xs text-muted-foreground">Recruiter</p>
                  <p className="font-medium">{candidate.owner.name}</p>
                </div>
              )}
            </div>
            <CandidateHeaderActions
              hasEmail={Boolean(candidate.email)}
              candidate={{
                id: candidate.id,
                firstName: candidate.firstName,
                lastName: candidate.lastName,
                email: candidate.email,
                phone: candidate.phone,
                linkedinUrl: candidate.linkedinUrl,
                currentCompany: candidate.currentCompany,
                currentTitle: candidate.currentTitle,
                location: candidate.location,
                source: candidate.source,
                ownerId: candidate.ownerId,
              }}
              users={allUsers}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Applications</CardTitle>
              <CardAction>
                <AddToJobDialog
                  candidateId={candidate.id}
                  eligibleJobs={eligibleJobs}
                />
              </CardAction>
            </CardHeader>
            <CardContent>
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
                        <Badge variant={stageTone('REJECTED')}>
                          {STAGE_LABELS.REJECTED}
                          {app.rejectionReason &&
                            ` · ${rejectionReasonText(app.rejectionReason, app.customRejectionReason)}`}
                        </Badge>
                      )}
                    </div>
                    {app.stage !== 'REJECTED' && (
                      <div className="mt-2">
                        <ApplicationPipelineStepper
                          applicationId={app.id}
                          currentStage={app.stage}
                          stageOutcomes={stageOutcomesFor(app.id, candidate.interviews)}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            </CardContent>
          </Card>

          <ProfileTabs
            activity={
              <Card>
                <CardContent>
                  <ActivityFeed
                    candidateId={candidate.id}
                    notes={candidate.notes}
                    interviews={candidate.interviews}
                    emails={candidate.emails}
                    applications={candidate.applications}
                  />
                </CardContent>
              </Card>
            }
            insights={
              <Card>
                <CardContent>
                  <CandidateInsightsCard
                    candidateId={candidate.id}
                    insight={candidate.insight}
                    latestActivityAt={latestActivityAt}
                  />
                </CardContent>
              </Card>
            }
            askScout={
              <Card>
                <CardContent>
                  <AskScoutCard
                    candidateId={candidate.id}
                    messages={candidate.askScoutMessages}
                    currentUserName={composeGlobals.recruiterName}
                  />
                </CardContent>
              </Card>
            }
          />
        </div>

        <div className="space-y-4">
          <InsightsRailCard
            hasInsight={Boolean(candidate.insight)}
            generatedAt={
              candidate.insight ? shortDateFormatter.format(candidate.insight.generatedAt) : null
            }
            isStale={Boolean(
              candidate.insight && latestActivityAt > candidate.insight.generatedAt
            )}
          />

          <div className="rounded-xl border border-border bg-card shadow-xs p-4">
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

          <ExperienceCard
            workHistory={candidate.workHistory as WorkHistoryEntry[] | null}
            yearsExperience={candidate.yearsExperience}
            resumeHref={
              candidate.resumes.length > 0 ? `/api/resumes/${candidate.resumes[0].id}` : null
            }
          />

          <div className="rounded-xl border border-border bg-card shadow-xs p-4">
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

          <div className="rounded-xl border border-border bg-card shadow-xs p-4">
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
    </ProfileTabsProvider>
    </ComposeEmailProvider>
  )
}
