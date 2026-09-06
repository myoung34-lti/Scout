'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
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
  Mail,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AddNoteDialog } from '@/components/candidates/add-note-dialog'
import { AddInterviewMenu } from '@/components/candidates/add-interview-menu'
import { RevertRejectionDialog } from '@/components/candidates/revert-rejection-dialog'
import { useComposeEmail } from '@/components/candidates/compose-email-provider'
import { cancelScheduledEmail } from '@/lib/actions/emails'
import { STAGE_LABELS } from '@/lib/pipeline'
import {
  INTERVIEW_TYPE_LABELS,
  RECOMMENDATION_LABELS,
  RECOMMENDATION_BADGE_CLASS,
} from '@/lib/interview'
import { getNoteKind, type NoteKind } from '@/lib/activity-note'
import type { ActivityNote, CandidateEmail, Interview, User } from '@prisma/client'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

type NoteWithAuthor = ActivityNote & { author: User }
type InterviewWithInterviewer = Interview & { interviewer: User }
type EmailWithSender = CandidateEmail & { sender: User }

const PAGE_SIZE = 5

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
  email: {
    icon: Mail,
    iconClass: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300',
  },
  note: { icon: MessageSquare, iconClass: 'bg-muted text-muted-foreground' },
}

function NoteItem({
  note,
  rejectedApplicationIds,
}: {
  note: NoteWithAuthor
  rejectedApplicationIds: Set<string>
}) {
  const kind = getNoteKind(note)
  const { icon: Icon, iconClass } = NOTE_KIND_STYLES[kind]
  const collapsible = kind === 'interview'
  const [expanded, setExpanded] = useState(!collapsible)
  const canRevert =
    kind === 'rejected' && !!note.applicationId && rejectedApplicationIds.has(note.applicationId)

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
        {canRevert && (
          <div className="mt-1">
            <RevertRejectionDialog applicationId={note.applicationId!} />
          </div>
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

function EmailItem({ email }: { email: EmailWithSender }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <li className="relative flex gap-3">
      <div className="z-10 flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
        <Mail className="size-4" />
      </div>
      <div className="min-w-0 flex-1 pb-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-medium">{email.subject}</span>
            <Badge variant="outline" className="shrink-0 font-normal">
              {email.sender.name}
            </Badge>
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? 'Collapse email' : 'Expand email'}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            {expanded ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          To {email.toAddress} · {dateFormatter.format(email.sentAt ?? email.createdAt)}
        </p>
        {expanded && (
          <div
            className="prose prose-sm mt-2 max-w-none border-t pt-2 [&_a]:text-primary [&_a]:underline"
            // Same trust boundary as an Activity Note body — authored only
            // via our own Tiptap editor by a trusted internal recruiter.
            dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
          />
        )}
      </div>
    </li>
  )
}

function ScheduledEmailItem({ email }: { email: EmailWithSender }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleCancel() {
    setError(null)
    startTransition(async () => {
      const result = await cancelScheduledEmail(email.id)
      if (result && 'error' in result) setError(result.error)
    })
  }

  return (
    <li className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{email.subject}</p>
          <p className="text-xs text-muted-foreground">
            To {email.toAddress} ·{' '}
            {email.status === 'FAILED' ? (
              <span className="text-destructive">Failed to send</span>
            ) : (
              <>Scheduled for {dateFormatter.format(email.scheduledFor!)}</>
            )}
          </p>
        </div>
        {email.status === 'SCHEDULED' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={pending}
          >
            <X />
            {pending ? 'Canceling…' : 'Cancel'}
          </Button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </li>
  )
}

type Entry =
  | { type: 'note'; createdAt: Date; data: NoteWithAuthor }
  | { type: 'interview'; createdAt: Date; data: InterviewWithInterviewer }
  | { type: 'email'; createdAt: Date; data: EmailWithSender }

export function ActivityFeed({
  candidateId,
  notes,
  interviews,
  emails,
  applications,
}: {
  candidateId: string
  notes: NoteWithAuthor[]
  interviews: InterviewWithInterviewer[]
  emails: EmailWithSender[]
  applications: { id: string; stage: string }[]
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const { openComposeEmail } = useComposeEmail()
  const rejectedApplicationIds = new Set(
    applications.filter((a) => a.stage === 'REJECTED').map((a) => a.id)
  )

  const scheduledOrFailed = emails
    .filter((e) => e.status === 'SCHEDULED' || e.status === 'FAILED')
    .sort((a, b) => (a.scheduledFor?.getTime() ?? 0) - (b.scheduledFor?.getTime() ?? 0))

  const entries: Entry[] = [
    // The auto-logged "Emailed: {subject}" one-liner is redundant now that
    // the full CandidateEmail renders directly in this same timeline.
    ...notes
      .filter((n) => getNoteKind(n) !== 'email')
      .map((n) => ({ type: 'note' as const, createdAt: n.createdAt, data: n })),
    ...interviews.map((i) => ({
      type: 'interview' as const,
      createdAt: i.createdAt,
      data: i,
    })),
    ...emails
      .filter((e) => e.status === 'SENT')
      .map((e) => ({
        type: 'email' as const,
        createdAt: e.sentAt ?? e.createdAt,
        data: e,
      })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  const visibleEntries = entries.slice(0, visibleCount)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <AddNoteDialog candidateId={candidateId} />
        <AddInterviewMenu candidateId={candidateId} />
        <Button size="sm" onClick={openComposeEmail}>
          <Mail />
          Compose Email
        </Button>
      </div>

      {scheduledOrFailed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Scheduled</p>
          <ul className="space-y-2">
            {scheduledOrFailed.map((email) => (
              <ScheduledEmailItem key={email.id} email={email} />
            ))}
          </ul>
        </div>
      )}

      {visibleEntries.length > 0 && (
        <ul className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[17px] before:w-px before:bg-border">
          {visibleEntries.map((entry) => {
            if (entry.type === 'note') {
              return (
                <NoteItem
                  key={`note-${entry.data.id}`}
                  note={entry.data}
                  rejectedApplicationIds={rejectedApplicationIds}
                />
              )
            }
            if (entry.type === 'interview') {
              return <InterviewItem key={`interview-${entry.data.id}`} interview={entry.data} />
            }
            return <EmailItem key={`email-${entry.data.id}`} email={entry.data} />
          })}
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
