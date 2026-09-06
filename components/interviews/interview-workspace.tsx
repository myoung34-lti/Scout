'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useTransition,
} from 'react'
import {
  updateInterviewDraft,
  completeInterview,
} from '@/lib/actions/interviews'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RecommendationPicker } from '@/components/interviews/recommendation-picker'
import { CopyFirefliesPromptButton } from '@/components/interviews/copy-fireflies-prompt-button'
import type { InterviewRecommendation, InterviewStatus, InterviewType } from '@prisma/client'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const AUTOSAVE_DELAY = 1000

export type InterviewWorkspaceHandle = {
  hasUnsavedChanges: () => boolean
}

export const InterviewWorkspace = forwardRef<InterviewWorkspaceHandle, {
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
}>(function InterviewWorkspace(
  {
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
  },
  ref
) {
  const [notes, setNotes] = useState(initialNotes)
  const [firefliesSummary, setFirefliesSummary] = useState(initialFireflies)
  const [applicationId, setApplicationId] = useState(initialApplicationId ?? 'NONE')
  const [recommendation, setRecommendation] =
    useState<InterviewRecommendation | null>(initialRecommendation)
  const [recommendationNotes, setRecommendationNotes] = useState(initialRecommendationNotes)
  const [compensationNotes, setCompensationNotes] = useState(initialCompensationNotes)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [completing, startCompleting] = useTransition()

  const pendingRef = useRef<{
    notes: string
    firefliesSummary: string
    applicationId: string
    recommendationNotes: string
    compensationNotes: string
  } | null>(null)
  const savingRef = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runSave = useCallback(async () => {
    // Iterative, not recursive: if a newer edit gets queued while a save is
    // in flight, loop around and send it too rather than calling ourselves.
    while (pendingRef.current) {
      const toSave = pendingRef.current
      pendingRef.current = null
      savingRef.current = true
      setSaveStatus('saving')

      const result = await updateInterviewDraft(interviewId, {
        notes: toSave.notes,
        firefliesSummary: toSave.firefliesSummary,
        applicationId:
          toSave.applicationId === 'NONE' ? null : toSave.applicationId,
        recommendationNotes: toSave.recommendationNotes,
        compensationNotes: toSave.compensationNotes,
      })

      savingRef.current = false

      if ('error' in result) {
        setSaveStatus('error')
        pendingRef.current = toSave
        break
      }
      setSaveStatus('saved')
    }
  }, [interviewId])

  const scheduleSave = useCallback(
    (next: {
      notes: string
      firefliesSummary: string
      applicationId: string
      recommendationNotes: string
      compensationNotes: string
    }) => {
      pendingRef.current = next
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        if (!savingRef.current) runSave()
      }, AUTOSAVE_DELAY)
    },
    [runSave]
  )

  function handleNotesChange(value: string) {
    setNotes(value)
    scheduleSave({ notes: value, firefliesSummary, applicationId, recommendationNotes, compensationNotes })
  }

  function handleFirefliesChange(value: string) {
    setFirefliesSummary(value)
    scheduleSave({ notes, firefliesSummary: value, applicationId, recommendationNotes, compensationNotes })
  }

  function handleApplicationChange(value: string) {
    setApplicationId(value)
    scheduleSave({ notes, firefliesSummary, applicationId: value, recommendationNotes, compensationNotes })
  }

  function handleRecommendationNotesChange(value: string) {
    setRecommendationNotes(value)
    scheduleSave({ notes, firefliesSummary, applicationId, recommendationNotes: value, compensationNotes })
  }

  function handleCompensationNotesChange(value: string) {
    setCompensationNotes(value)
    scheduleSave({ notes, firefliesSummary, applicationId, recommendationNotes, compensationNotes: value })
  }

  function hasUnsavedChanges() {
    return pendingRef.current !== null || savingRef.current || saveStatus === 'error'
  }

  // Flush any pending debounce immediately (used before navigating away or
  // completing the interview) instead of waiting out the delay.
  const flushSave = useCallback(async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (pendingRef.current && !savingRef.current) {
      await runSave()
    }
  }, [runSave])

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (hasUnsavedChanges()) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveStatus])

  useImperativeHandle(ref, () => ({ hasUnsavedChanges }))

  const canComplete = recommendation !== null && recommendationNotes.trim() !== ''

  function handleComplete() {
    if (!recommendation || !canComplete) return
    startCompleting(async () => {
      await flushSave()
      await completeInterview(interviewId, recommendation)
    })
  }

  const saveLabel =
    saveStatus === 'saving'
      ? 'Saving…'
      : saveStatus === 'saved'
        ? 'Saved just now'
        : saveStatus === 'error'
          ? 'Save failed'
          : ''

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card shadow-xs p-5">
      {saveLabel && (
        <div className="mb-4 flex justify-end">
          <span
            className={`text-xs ${
              saveStatus === 'error' ? 'text-destructive' : 'text-muted-foreground'
            }`}
          >
            {saveLabel}
          </span>
        </div>
      )}

      {applications.length > 0 && (
        <div className="mb-4 space-y-2">
          <label className="text-sm font-medium">Application</label>
          <Select value={applicationId} onValueChange={handleApplicationChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">Not tied to a specific job</SelectItem>
              {applications.map((app) => (
                <SelectItem key={app.id} value={app.id}>
                  {app.internalName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {type === 'INTRO' && (
        <div className="mb-4 space-y-2">
          <label className="text-sm font-medium">Compensation</label>
          <Textarea
            value={compensationNotes}
            onChange={(e) => handleCompensationNotesChange(e.target.value)}
            rows={1}
            placeholder="Expected or discussed compensation…"
            className="field-sizing-content resize-none"
          />
        </div>
      )}

      <div className="mb-4 space-y-2">
        <label className="text-sm font-medium">Interview Notes</label>
        <Textarea
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          rows={10}
          placeholder="Free-form notes taken during the live interview…"
          className="field-sizing-fixed resize-none overflow-y-auto"
        />
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Fireflies Summary</label>
          {hasFirefliesPrompt && (
            <CopyFirefliesPromptButton type={type} />
          )}
        </div>
        <Textarea
          value={firefliesSummary}
          onChange={(e) => handleFirefliesChange(e.target.value)}
          rows={10}
          placeholder="Paste Fireflies / AskFred interview summary here…"
          className="field-sizing-fixed resize-none overflow-y-auto"
        />
      </div>

      <div className="mb-4 space-y-2">
        <label className="text-sm font-medium">Recommendation</label>
        <RecommendationPicker
          value={recommendation}
          onChange={setRecommendation}
        />
        <Textarea
          value={recommendationNotes}
          onChange={(e) => handleRecommendationNotesChange(e.target.value)}
          rows={1}
          placeholder="Overall recommendation — required before completing…"
          className="field-sizing-content resize-none"
        />
      </div>

      <div className="mt-auto flex justify-end">
        <Button
          onClick={handleComplete}
          disabled={!canComplete || completing}
        >
          {completing
            ? 'Saving…'
            : status === 'COMPLETED'
              ? 'Save Changes'
              : 'Complete Interview'}
        </Button>
      </div>
    </div>
  )
})
