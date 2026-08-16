'use client'

import Link from 'next/link'
import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { CandidateRating } from '@/components/candidates/candidate-rating'
import { ResumePanel } from '@/components/interviews/resume-panel'
import {
  InterviewWorkspace,
  type InterviewWorkspaceHandle,
} from '@/components/interviews/interview-workspace'
import type { Resume, InterviewRecommendation, InterviewStatus } from '@prisma/client'

export function InterviewPageShell({
  candidateId,
  candidateName,
  candidateRating,
  subtitle,
  resume,
  interviewId,
  status,
  initialNotes,
  initialFireflies,
  initialRecommendation,
  initialApplicationId,
  applications,
}: {
  candidateId: string
  candidateName: string
  candidateRating: number | null
  subtitle: string
  resume: Resume | null
  interviewId: string
  status: InterviewStatus
  initialNotes: string
  initialFireflies: string
  initialRecommendation: InterviewRecommendation | null
  initialApplicationId: string | null
  applications: { id: string; internalName: string }[]
}) {
  const router = useRouter()
  const workspaceRef = useRef<InterviewWorkspaceHandle>(null)

  function handleBack(e: React.MouseEvent) {
    e.preventDefault()
    if (workspaceRef.current?.hasUnsavedChanges()) {
      const proceed = window.confirm('You have unsaved changes. Leave without saving?')
      if (!proceed) return
    }
    router.push(`/candidates/${candidateId}`)
  }

  return (
    <div className="space-y-4">
      <Link
        href={`/candidates/${candidateId}`}
        onClick={handleBack}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to profile
      </Link>

      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{candidateName}</h1>
          <CandidateRating candidateId={candidateId} initialRating={candidateRating} />
        </div>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ResumePanel candidateId={candidateId} resume={resume} />
        <InterviewWorkspace
          ref={workspaceRef}
          interviewId={interviewId}
          status={status}
          initialNotes={initialNotes}
          initialFireflies={initialFireflies}
          initialRecommendation={initialRecommendation}
          initialApplicationId={initialApplicationId}
          applications={applications}
        />
      </div>
    </div>
  )
}
