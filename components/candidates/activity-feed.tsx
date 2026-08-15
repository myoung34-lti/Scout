'use client'

import { useActionState, useRef } from 'react'
import { addNote } from '@/lib/actions/notes'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ALL_STAGES, STAGE_LABELS } from '@/lib/pipeline'
import type { ActivityNote, PipelineStage, User } from '@prisma/client'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

type NoteWithAuthor = ActivityNote & { author: User }

export function ActivityFeed({
  candidateId,
  notes,
}: {
  candidateId: string
  notes: NoteWithAuthor[]
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, pending] = useActionState(
    async (prevState: { error?: string } | undefined, formData: FormData) => {
      const result = await addNote(prevState, formData)
      if (!result?.error) {
        formRef.current?.reset()
      }
      return result
    },
    undefined
  )

  return (
    <div className="space-y-4">
      <form ref={formRef} action={formAction} className="space-y-2">
        <input type="hidden" name="candidateId" value={candidateId} />
        <Textarea
          name="body"
          rows={6}
          placeholder="Paste interview notes, a Fireflies summary, or add an update…"
          required
        />
        <div className="flex items-center gap-2">
          <Select name="stage">
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Interview type (optional)" />
            </SelectTrigger>
            <SelectContent>
              {ALL_STAGES.map((stage: PipelineStage) => (
                <SelectItem key={stage} value={stage}>
                  {STAGE_LABELS[stage]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? 'Adding…' : 'Add note'}
          </Button>
        </div>
        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
      </form>

      {notes.length > 0 && (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-md border p-3 text-sm">
              <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>{note.author.name}</span>
                  {note.stage && (
                    <Badge variant="outline">{STAGE_LABELS[note.stage]}</Badge>
                  )}
                </div>
                <span>{dateFormatter.format(note.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap">{note.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
