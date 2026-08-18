'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { ChevronRight, Trash2, Check, X, CircleHelp } from 'lucide-react'
import { transitionStage } from '@/lib/actions/pipeline'
import { Button } from '@/components/ui/button'
import { RejectionReasonDialog } from '@/components/kanban/rejection-reason-dialog'
import { STAGE_LABELS, STEPPER_STAGES } from '@/lib/pipeline'
import { recommendationOutcome } from '@/lib/interview'
import type { PipelineStage, RejectionReason, InterviewRecommendation } from '@prisma/client'

const OUTCOME_ICON_CLASS: Record<'pass' | 'maybe' | 'fail', string> = {
  pass: 'bg-emerald-500 text-white',
  maybe: 'bg-amber-500 text-white',
  fail: 'bg-red-500 text-white',
}

function OutcomeBadge({ recommendation }: { recommendation: InterviewRecommendation }) {
  const outcome = recommendationOutcome(recommendation)
  const Icon = outcome === 'pass' ? Check : outcome === 'maybe' ? CircleHelp : X
  return (
    <span
      className={`absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full ring-2 ring-background ${OUTCOME_ICON_CLASS[outcome]}`}
    >
      <Icon className="size-2.5" strokeWidth={3} />
    </span>
  )
}

export function ApplicationPipelineStepper({
  applicationId,
  currentStage,
  stageOutcomes,
}: {
  applicationId: string
  currentStage: PipelineStage
  stageOutcomes?: Partial<Record<PipelineStage, InterviewRecommendation>>
}) {
  const [pending, startTransition] = useTransition()
  const [rejectOpen, setRejectOpen] = useState(false)
  const currentRef = useRef<HTMLButtonElement>(null)

  const currentIndex = STEPPER_STAGES.indexOf(currentStage)

  useEffect(() => {
    currentRef.current?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: 'auto',
    })
  }, [currentIndex])

  // Rejected applications aren't part of the forward-moving stepper at all.
  if (currentIndex === -1) return null

  const nextStage =
    currentIndex < STEPPER_STAGES.length - 1
      ? STEPPER_STAGES[currentIndex + 1]
      : null

  function moveTo(stage: PipelineStage) {
    if (stage === currentStage || pending) return
    startTransition(() => transitionStage(applicationId, stage))
  }

  function handleReject(reason?: RejectionReason, customReason?: string) {
    setRejectOpen(false)
    startTransition(() =>
      transitionStage(applicationId, 'REJECTED', reason, customReason)
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start overflow-x-auto py-1">
        {STEPPER_STAGES.map((stage, i) => {
          const isCurrent = stage === currentStage
          const isPast = i < currentIndex
          return (
            <div key={stage} className="flex items-center">
              <button
                ref={isCurrent ? currentRef : undefined}
                type="button"
                onClick={() => moveTo(stage)}
                disabled={pending}
                className="flex w-20 shrink-0 flex-col items-center gap-1"
              >
                <span className="relative flex">
                  <span
                    className={`flex size-7 items-center justify-center rounded-full border-2 transition-colors ${
                      isCurrent
                        ? 'border-primary bg-primary'
                        : isPast
                          ? 'border-primary bg-primary/15'
                          : 'border-muted-foreground/30 bg-background hover:border-muted-foreground/60'
                    }`}
                  >
                    {isCurrent && (
                      <span className="size-2 rounded-full bg-primary-foreground" />
                    )}
                  </span>
                  {stageOutcomes?.[stage] && (
                    <OutcomeBadge recommendation={stageOutcomes[stage]!} />
                  )}
                </span>
                <span
                  className={`text-center text-xs leading-tight ${
                    isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {STAGE_LABELS[stage]}
                </span>
                {isCurrent && (
                  <span className="text-[10px] font-medium tracking-wide text-primary uppercase">
                    Current
                  </span>
                )}
              </button>
              {i < STEPPER_STAGES.length - 1 && (
                <div
                  className={`mb-5 h-px w-6 shrink-0 ${isPast ? 'bg-primary' : 'bg-border'}`}
                />
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between gap-2">
        {currentStage !== 'HIRED' ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRejectOpen(true)}
            disabled={pending}
          >
            <Trash2 className="size-4" />
            Reject
          </Button>
        ) : (
          <span />
        )}
        {nextStage && (
          <Button size="sm" onClick={() => moveTo(nextStage)} disabled={pending}>
            Advance to {STAGE_LABELS[nextStage]}
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>

      <RejectionReasonDialog open={rejectOpen} onResolve={handleReject} />
    </div>
  )
}
