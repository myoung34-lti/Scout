'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  Mic,
  MessageSquare,
  Star,
  Tag,
  Users,
  UserPlus,
  Briefcase,
  XCircle,
  Eye,
  EyeOff,
  ChevronDown,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AddNoteDialog } from '@/components/candidates/add-note-dialog'
import { AddInterviewMenu } from '@/components/candidates/add-interview-menu'
import { STAGE_LABELS } from '@/lib/pipeline'
import {
  INTERVIEW_TYPE_LABELS,
  RECOMMENDATION_LABELS,
  RECOMMENDATION_BADGE_CLASS,
} from '@/lib/interview'
import type { ActivityNote, Interview, User } from '@prisma/client'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

type NoteWithAuthor = ActivityNote & { author: User }
type InterviewWithInterviewer = Interview & { interviewer: User }

const PAGE_SIZE = 5

type NoteKind =
  | 'interview'
  | 'created'
  | 'applied'
  | 'rejected'
  | 'talentPool'
  | 'rating'
  | 'type'
  | 'note'

function getNoteKind(note: NoteWithAuthor): NoteKind {
  if (note.stage) return 'interview'
  if (/added to the system/i.test(note.body)) return 'created'
  if (/talent pool/i.test(note.body)) return 'talentPool'
  if (/rejected from/i.test(note.body)) return 'rejected'
  if (/^added to /i.test(note.body)) return 'applied'
  if (/star/i.test(note.body)) return 'rating'
  if (/\btype\b/i.test(note.body)) return 'type'
  return 'note'
}

const NOTE_KIND_STYLES: Record<
  NoteKind,
  { icon: typeof Mic; iconClass: string }
> = {
  interview: { icon: Mic, iconClass: 'bg-primary/15 text-primary' },
  created: {
    icon: UserPlus,
    iconClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  },
  applied: {
    icon: Briefcase,
    iconClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-300',
  },
  rejected: {
    icon: XCircle,
    iconClass: 'bg-destructive/15 text-destructive',
  },
  talentPool: {
    icon: Users,
    iconClass: 'bg-violet-500/15 text-violet-600 dark:text-violet-300',
  },
  rating: {
    icon: Star,
    iconClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
  },
  type: {
    icon: Tag,
    iconClass: 'bg-sky-500/15 text-sky-600 dark:text-sky-300',
  },
  note: { icon: MessageSquare, iconClass: 'bg-muted text-muted-foreground' },
}

function NoteItem({ note }: { note: NoteWithAuthor }) {
  const kind = getNoteKind(note)
  const { icon: Icon, iconClass } = NOTE_KIND_STYLES[kind]
  const collapsible = kind === 'interview'
  const [expanded, setExpanded] = useState(!collapsible)

  const title =
    kind === 'interview' && note.stage
      ? STAGE_LABELS[note.stage]
      : kind === 'note'
        ? 'Note'
        : note.body
  const showBody = kind === 'interview' || kind === 'note'

  return (
    <li className="relative flex gap-3">
      <div
        className={`z-10 flex size-9 shrink-0 items-center justify-center rounded-full ${iconClass}`}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1 pb-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">{title}</span>
            <Badge variant="outline" className="font-normal">
              {note.author.name}
            </Badge>
          </div>
          {collapsible && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? 'Collapse note' : 'Expand note'}
              className="text-muted-foreground hover:text-foreground"
            >
              {expanded ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {dateFormatter.format(note.createdAt)}
        </p>
        {showBody && expanded && (
          <p className="mt-1 whitespace-pre-wrap text-sm">{note.body}</p>
        )}
      </div>
    </li>
  )
}

function InterviewItem({ interview }: { interview: InterviewWithInterviewer }) {
  const isDraft = interview.status === 'DRAFT'
  const href = `/candidates/${interview.candidateId}/interview/${interview.id}`
  const preview = interview.notes || interview.firefliesSummary || ''

  return (
    <li className="relative flex gap-3">
      <div className="z-10 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Mic className="size-4" />
      </div>
      <div className="min-w-0 flex-1 pb-1">
        <div className="flex items-center gap-2">
          {isDraft ? (
            <Link href={href} className="font-medium hover:underline">
              {INTERVIEW_TYPE_LABELS[interview.type]} · Draft
            </Link>
          ) : (
            <span className="font-medium">
              {INTERVIEW_TYPE_LABELS[interview.type]}
            </span>
          )}
          <Badge variant="outline" className="font-normal">
            {interview.interviewer.name}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {dateFormatter.format(interview.createdAt)}
        </p>
        {(!isDraft && interview.recommendation) || preview ? (
          <div className="mt-1.5 space-y-1.5">
            {!isDraft && interview.recommendation && (
              <Badge
                className={RECOMMENDATION_BADGE_CLASS[interview.recommendation]}
              >
                {RECOMMENDATION_LABELS[interview.recommendation]}
              </Badge>
            )}
            {preview && (
              <p className="line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {preview}
              </p>
            )}
          </div>
        ) : null}
        {!isDraft && (
          <Link
            href={href}
            className="mt-1 inline-block text-sm text-primary hover:underline"
          >
            View Interview
          </Link>
        )}
      </div>
    </li>
  )
}

type Entry =
  | { type: 'note'; createdAt: Date; data: NoteWithAuthor }
  | { type: 'interview'; createdAt: Date; data: InterviewWithInterviewer }

export function ActivityFeed({
  candidateId,
  notes,
  interviews,
}: {
  candidateId: string
  notes: NoteWithAuthor[]
  interviews: InterviewWithInterviewer[]
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const entries: Entry[] = [
    ...notes.map((n) => ({ type: 'note' as const, createdAt: n.createdAt, data: n })),
    ...interviews.map((i) => ({
      type: 'interview' as const,
      createdAt: i.createdAt,
      data: i,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  const visibleEntries = entries.slice(0, visibleCount)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AddNoteDialog candidateId={candidateId} />
        <AddInterviewMenu candidateId={candidateId} />
      </div>

      {visibleEntries.length > 0 && (
        <ul className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[17px] before:w-px before:bg-border">
          {visibleEntries.map((entry) =>
            entry.type === 'note' ? (
              <NoteItem key={`note-${entry.data.id}`} note={entry.data} />
            ) : (
              <InterviewItem
                key={`interview-${entry.data.id}`}
                interview={entry.data}
              />
            )
          )}
        </ul>
      )}

      {visibleCount < entries.length && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE * 2)}
        >
          Load more activity
          <ChevronDown className="size-4" />
        </Button>
      )}
    </div>
  )
}
