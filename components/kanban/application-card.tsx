'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useDraggable } from '@dnd-kit/core'
import { MoreHorizontal, UserRound, Briefcase } from 'lucide-react'
import type { ApplicationWithCandidate } from '@/components/kanban/pipeline-board'
import { StarRating } from '@/components/candidates/star-rating'
import { rejectionReasonText } from '@/lib/pipeline'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ApplicationCard({
  application,
}: {
  application: ApplicationWithCandidate
}) {
  const router = useRouter()
  // Where this card is being viewed from, handed to the profile so its
  // breadcrumb returns here — the master board with its scope and job filter
  // intact, or the job's own board — instead of always to the full candidate
  // list. Read from the router rather than drilled down as a prop, since it
  // is exactly a routing question and the card renders on both boards.
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const from = query ? `${pathname}?${query}` : pathname
  const profileHref = `/candidates/${application.candidateId}?from=${encodeURIComponent(from)}`

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: application.id })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  const subtitle =
    application.stage === 'REJECTED' && application.rejectionReason
      ? `${application.job?.internalName} · ${rejectionReasonText(application.rejectionReason, application.customRejectionReason)}`
      : application.job?.internalName

  const { firstName, lastName } = application.candidate
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`group/card touch-none cursor-grab rounded-lg border border-border bg-card p-2.5 shadow-xs transition-shadow hover:shadow-sm active:cursor-grabbing ${
        isDragging ? 'z-10 opacity-50' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <span
          aria-hidden
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground"
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <Link
            href={profileHref}
            className="block truncate text-sm font-medium hover:text-primary hover:underline"
            onClick={(e) => {
              if (isDragging) e.preventDefault()
            }}
          >
            {firstName} {lastName}
          </Link>
          {subtitle && (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
          <StarRating value={application.candidate.rating} size="sm" />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Actions for ${firstName} ${lastName}`}
              // The drag listeners sit on the card root, so without this the
              // sensor claims the pointer and the menu never opens.
              onPointerDown={(e) => e.stopPropagation()}
              className="shrink-0 opacity-0 transition-opacity group-hover/card:opacity-100 focus-visible:opacity-100"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuItem
              onSelect={() => router.push(profileHref)}
            >
              <UserRound className="size-4" />
              View profile
            </DropdownMenuItem>
            {application.job && (
              <DropdownMenuItem onSelect={() => router.push(`/jobs/${application.job!.id}`)}>
                <Briefcase className="size-4" />
                View job
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
