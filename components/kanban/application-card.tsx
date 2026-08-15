'use client'

import Link from 'next/link'
import { useDraggable } from '@dnd-kit/core'
import type { ApplicationWithCandidate } from '@/components/kanban/pipeline-board'
import { StarRating } from '@/components/candidates/star-rating'
import { Badge } from '@/components/ui/badge'
import { REJECTION_REASON_LABELS } from '@/lib/pipeline'

export function ApplicationCard({
  application,
}: {
  application: ApplicationWithCandidate
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: application.id })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  const subtitle =
    application.stage === 'REJECTED' && application.rejectionReason
      ? `${application.job?.internalName} · ${REJECTION_REASON_LABELS[application.rejectionReason]}`
      : application.job?.internalName

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`touch-none cursor-grab rounded-lg border bg-background p-3 shadow-sm active:cursor-grabbing ${
        isDragging ? 'z-10 opacity-50' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/candidates/${application.candidateId}`}
          className="font-medium hover:underline"
          onClick={(e) => {
            if (isDragging) e.preventDefault()
          }}
        >
          {application.candidate.firstName} {application.candidate.lastName}
        </Link>
        <StarRating value={application.candidate.rating} size="sm" />
      </div>
      {subtitle && (
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      )}
      {application.candidate.tags && application.candidate.tags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {application.candidate.tags.map((ct) => (
            <Badge key={ct.tagId} variant="outline" className="text-[10px]">
              {ct.tag.displayLabel}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
