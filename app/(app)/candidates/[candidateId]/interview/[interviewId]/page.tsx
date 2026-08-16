import { notFound } from 'next/navigation'
import { getInterview } from '@/lib/actions/interviews'
import { INTERVIEW_TYPE_LABELS } from '@/lib/interview'
import { getActivePromptForInterviewType } from '@/lib/prompts'
import { InterviewPageShell } from '@/components/interviews/interview-page-shell'

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
  const firefliesPrompt = await getActivePromptForInterviewType(interview.type)

  return (
    <InterviewPageShell
      candidateId={candidate.id}
      candidateName={`${candidate.firstName} ${candidate.lastName}`}
      candidateRating={candidate.rating}
      subtitle={`${INTERVIEW_TYPE_LABELS[interview.type]} · ${interview.interviewer.name} · ${dateFormatter.format(interview.createdAt)}`}
      resume={candidate.resumes[0] ?? null}
      interviewId={interview.id}
      type={interview.type}
      hasFirefliesPrompt={firefliesPrompt !== null}
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
  )
}
