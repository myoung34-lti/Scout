import { notFound } from 'next/navigation'
import { getInterview } from '@/lib/actions/interviews'
import { INTERVIEW_TYPE_LABELS } from '@/lib/interview'
import { ResumePanel } from '@/components/interviews/resume-panel'
import { InterviewWorkspace } from '@/components/interviews/interview-workspace'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ candidateId: string; interviewId: string }>
}) {
  const { candidateId, interviewId } = await params
  const interview = await getInterview(interviewId)

  if (!interview || interview.candidateId !== candidateId) notFound()

  const { candidate } = interview

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">
          {candidate.firstName} {candidate.lastName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {INTERVIEW_TYPE_LABELS[interview.type]} · {interview.interviewer.name} ·{' '}
          {dateFormatter.format(interview.createdAt)}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ResumePanel
          candidateId={candidate.id}
          resume={candidate.resumes[0] ?? null}
        />
        <InterviewWorkspace
          interviewId={interview.id}
          candidateId={candidate.id}
          status={interview.status}
          initialNotes={interview.notes ?? ''}
          initialFireflies={interview.firefliesSummary ?? ''}
          initialRecommendation={interview.recommendation}
          initialApplicationId={interview.applicationId}
          applications={candidate.applications.map((app) => ({
            id: app.id,
            internalName: app.job.internalName,
          }))}
        />
      </div>
    </div>
  )
}
