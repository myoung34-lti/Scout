'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { CandidateRating } from '@/components/candidates/candidate-rating'
import { ResumePanel } from '@/components/interviews/resume-panel'
import {
  InterviewWorkspace,
  type InterviewWorkspaceHandle,
} from '@/components/interviews/interview-workspace'
import type { Resume, InterviewRecommendation, InterviewStatus, InterviewType } from '@prisma/client'

export function InterviewPageShell({
  candidateId,
  candidateName,
  candidateRating,
  subtitle,
  resume,
  interviewId,
  type,
  hasFirefliesPrompt,
  status,
  initialNotes,
  initialFireflies,
  initialRecommendation,
  initialRecommendationNotes,
  initialCompensationNotes,
  initialApplicationId,
  applications,
}: {
  candidateId: string
  candidateName: string
  candidateRating: number | null
  subtitle: string
  resume: Resume | null
  interviewId: string
  type: InterviewType
  hasFirefliesPrompt: boolean
  status: InterviewStatus
  initialNotes: string
  initialFireflies: string
  initialRecommendation: InterviewRecommendation | null
  initialRecommendationNotes: string
  initialCompensationNotes: string
  initialApplicationId: string | null
  applications: { id: string; internalName: string }[]
}) {
  const router = useRouter()
  const workspaceRef = useRef<InterviewWorkspaceHandle>(null)

  // Same unsaved-changes guard as before, but it now leaves for a known
  // destination. router.back() could drop you outside Scout entirely if the
  // interview was opened from a link or a fresh tab.
  function leaveTo(href: string) {
    if (workspaceRef.current?.hasUnsavedChanges()) {
      const proceed = window.confirm('You have unsaved changes. Leave without saving?')
      if (!proceed) return
    }
    router.push(href)
  }

  return (
    <div className="space-y-4">
      {/* Hand-rolled rather than the shared Breadcrumb because every link
          here has to pass through the unsaved-changes guard. */}
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <li className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => leaveTo('/candidates')}
              className="transition-colors hover:text-foreground"
            >
              Candidates
            </button>
            <ChevronRight className="size-3.5 shrink-0 opacity-50" aria-hidden />
          </li>
          <li className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => leaveTo(`/candidates/${candidateId}`)}
              className="transition-colors hover:text-foreground"
            >
              {candidateName}
            </button>
            <ChevronRight className="size-3.5 shrink-0 opacity-50" aria-hidden />
          </li>
          <li>
            <span className="font-medium text-foreground" aria-current="page">
              {subtitle}
            </span>
          </li>
        </ol>
      </nav>

      <div>
        <div className="flex items-center gap-3">
          <h1 className="page-title">{candidateName}</h1>
          <CandidateRating candidateId={candidateId} initialRating={candidateRating} />
        </div>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ResumePanel candidateId={candidateId} resume={resume} />
        <InterviewWorkspace
          ref={workspaceRef}
          interviewId={interviewId}
          type={type}
          hasFirefliesPrompt={hasFirefliesPrompt}
          status={status}
          initialNotes={initialNotes}
          initialFireflies={initialFireflies}
          initialRecommendation={initialRecommendation}
          initialRecommendationNotes={initialRecommendationNotes}
          initialCompensationNotes={initialCompensationNotes}
          initialApplicationId={initialApplicationId}
          applications={applications}
        />
      </div>
    </div>
  )
}
