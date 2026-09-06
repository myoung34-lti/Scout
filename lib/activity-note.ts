import type { PipelineStage } from '@prisma/client'

// Shared between the Activity Feed UI (components/candidates/activity-feed.tsx)
// and the server-side candidate-context builder (lib/ai/candidate-context.ts) —
// one definition of "what kind of note is this" so both agree on which notes
// are high-value recruiting signal vs. low-value system noise.
export type NoteKind =
  | 'interview'
  | 'created'
  | 'applied'
  | 'rejected'
  | 'talentPool'
  | 'rating'
  | 'type'
  | 'email'
  | 'note'

export function getNoteKind(note: { stage: PipelineStage | null; body: string }): NoteKind {
  if (note.stage) return 'interview'
  if (/added to the system/i.test(note.body)) return 'created'
  if (/talent pool/i.test(note.body)) return 'talentPool'
  if (/rejected from/i.test(note.body)) return 'rejected'
  if (/^added to /i.test(note.body)) return 'applied'
  if (/star/i.test(note.body)) return 'rating'
  if (/^emailed:/i.test(note.body)) return 'email'
  if (/\btype\b/i.test(note.body)) return 'type'
  return 'note'
}

// The kinds worth sending to Claude as recruiting signal — freeform
// human-written notes and rejection notes (which carry the actual reason
// text, richer than the Application.rejectionReason enum alone). Everything
// else ("added to the system", talent pool adds/removes, star ratings,
// auto-logged "Emailed: ..." one-liners) is system noise for this purpose.
export const HIGH_VALUE_NOTE_KINDS: NoteKind[] = ['note', 'rejected']
