'use client'

import { useState } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { toast } from 'sonner'
import { transitionStage } from '@/lib/actions/pipeline'
import { StageColumn } from '@/components/kanban/stage-column'
import { RejectionReasonDialog } from '@/components/kanban/rejection-reason-dialog'
import { ComposeEmailDialog } from '@/components/candidates/compose-email-dialog'
import { ALL_STAGES, STAGE_LABELS, EMAIL_PROMPT_STAGES } from '@/lib/pipeline'
import type {
  Application,
  Candidate,
  Job,
  PipelineStage,
  RejectionReason,
} from '@prisma/client'

// Job minus its description: the board never shows a job posting, and
// carrying it duplicates the same text into every card's payload. Narrowing
// the type here is what keeps that honest — anything that starts needing the
// description fails to compile rather than silently re-inflating the board.
export type BoardJob = Omit<Job, 'description'>

export type ApplicationWithCandidate = Application & {
  candidate: Candidate
  job?: BoardJob
}

type EmailTemplate = {
  id: string
  name: string
  currentVersion: { id: string; subject: string; bodyHtml: string } | null
}

export function PipelineBoard({
  applications,
  stages = ALL_STAGES,
  recruiterName,
  recruiterEmail,
  staticVariables,
  emailTemplates,
}: {
  applications: ApplicationWithCandidate[]
  stages?: PipelineStage[]
  recruiterName: string
  recruiterEmail: string
  staticVariables: Record<string, string>
  emailTemplates: EmailTemplate[]
}) {
  const [items, setItems] = useState(applications)
  const [pendingRejection, setPendingRejection] = useState<{
    applicationId: string
    previousStage: PipelineStage
  } | null>(null)
  const [composeFor, setComposeFor] = useState<ApplicationWithCandidate | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function commitTransition(
    applicationId: string,
    toStage: PipelineStage,
    previousStage: PipelineStage,
    rejectionReason?: RejectionReason,
    customRejectionReason?: string
  ) {
    transitionStage(applicationId, toStage, rejectionReason, customRejectionReason)
      .then(() => {
        if (!EMAIL_PROMPT_STAGES.includes(toStage) && toStage !== 'REJECTED') return
        const application = items.find((a) => a.id === applicationId)
        if (!application) return
        const message =
          toStage === 'REJECTED' ? 'Candidate rejected.' : `Moved to ${STAGE_LABELS[toStage]}.`
        toast(message, {
          action: { label: 'Send email', onClick: () => setComposeFor(application) },
        })
      })
      .catch(() => {
        setItems((prev) =>
          prev.map((a) =>
            a.id === applicationId ? { ...a, stage: previousStage } : a
          )
        )
        toast.error('Failed to move candidate. Please try again.')
      })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const applicationId = active.id as string
    const toStage = over.id as PipelineStage

    const current = items.find((a) => a.id === applicationId)
    if (!current || current.stage === toStage) return

    const previousStage = current.stage
    setItems((prev) =>
      prev.map((a) => (a.id === applicationId ? { ...a, stage: toStage } : a))
    )

    if (toStage === 'REJECTED') {
      setPendingRejection({ applicationId, previousStage })
      return
    }

    commitTransition(applicationId, toStage, previousStage)
  }

  function handleRejectionResolved(reason?: RejectionReason, customReason?: string) {
    if (!pendingRejection) return
    const { applicationId, previousStage } = pendingRejection
    setPendingRejection(null)
    setItems((prev) =>
      prev.map((a) =>
        a.id === applicationId
          ? {
              ...a,
              rejectionReason: reason ?? null,
              customRejectionReason: customReason ?? null,
            }
          : a
      )
    )
    commitTransition(applicationId, 'REJECTED', previousStage, reason, customReason)
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <StageColumn
            key={stage}
            stage={stage}
            applications={items.filter((a) => a.stage === stage)}
          />
        ))}
      </div>
      <RejectionReasonDialog
        open={pendingRejection !== null}
        onResolve={handleRejectionResolved}
      />
      {composeFor && (
        <ComposeEmailDialog
          candidateId={composeFor.candidate.id}
          candidateEmail={composeFor.candidate.email}
          candidateFirstName={composeFor.candidate.firstName}
          candidateLastName={composeFor.candidate.lastName}
          candidateCurrentCompany={composeFor.candidate.currentCompany ?? ''}
          candidateCurrentTitle={composeFor.candidate.currentTitle ?? ''}
          jobTitle={composeFor.job?.internalName ?? ''}
          jobLocation={composeFor.job?.location ?? ''}
          applicationId={composeFor.id}
          recruiterName={recruiterName}
          recruiterEmail={recruiterEmail}
          staticVariables={staticVariables}
          emailTemplates={emailTemplates}
          open
          onOpenChange={(next) => {
            if (!next) setComposeFor(null)
          }}
          showTrigger={false}
        />
      )}
    </DndContext>
  )
}
