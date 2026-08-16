'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
import type { InterviewRecommendation, InterviewStatus } from '@prisma/client'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const AUTOSAVE_DELAY = 1000

export function InterviewWorkspace({
  interviewId,
  candidateId,
  status,
  initialNotes,
  initialFireflies,
  initialRecommendation,
  initialApplicationId,
  applications,
}: {
  interviewId: string
  candidateId: string
  status: InterviewStatus
  initialNotes: string
  initialFireflies: string
  initialRecommendation: InterviewRecommendation | null
  initialApplicationId: string | null
  applications: { id: string; internalName: string }[]
}) {
  const router = useRouter()
  const [notes, setNotes] = useState(initialNotes)
  const [firefliesSummary, setFirefliesSummary] = useState(initialFireflies)
  const [applicationId, setApplicationId] = useState(initialApplicationId ?? 'NONE')
  const [recommendation, setRecommendation] =
    useState<InterviewRecommendation | null>(initialRecommendation)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [completing, startCompleting] = useTransition()

  const pendingRef = useRef<{
    notes: string
    firefliesSummary: string
    applicationId: string
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
    (next: { notes: string; firefliesSummary: string; applicationId: string }) => {
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
    scheduleSave({ notes: value, firefliesSummary, applicationId })
  }

  function handleFirefliesChange(value: string) {
    setFirefliesSummary(value)
    scheduleSave({ notes, firefliesSummary: value, applicationId })
  }

  function handleApplicationChange(value: string) {
    setApplicationId(value)
    scheduleSave({ notes, firefliesSummary, applicationId: value })
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

  function handleBack() {
    if (hasUnsavedChanges()) {
      const proceed = window.confirm(
        'You have unsaved changes. Leave without saving?'
      )
      if (!proceed) return
    }
    router.push(`/candidates/${candidateId}`)
  }

  function handleComplete() {
    if (!recommendation) return
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
    <div className="flex h-full flex-col rounded-lg border bg-background p-5">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to profile
        </button>
        {saveLabel && (
          <span
            className={`text-xs ${
              saveStatus === 'error' ? 'text-destructive' : 'text-muted-foreground'
            }`}
          >
            {saveLabel}
          </span>
        )}
      </div>

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
        <label className="text-sm font-medium">Fireflies Summary</label>
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
      </div>

      <div className="mt-auto flex justify-end">
        <Button
          onClick={handleComplete}
          disabled={!recommendation || completing}
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
}
