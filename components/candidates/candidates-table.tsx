'use client'

import Link from 'next/link'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StarRating } from '@/components/candidates/star-rating'
import { CandidateRowActions } from '@/components/candidates/candidate-row-actions'
import { useFilterParams } from '@/lib/use-filter-params'
import { STAGE_LABELS, stageTone } from '@/lib/pipeline'
import type { CandidateSort } from '@/lib/candidate-search'
import type { StageTone } from '@/lib/pipeline'
import type { PipelineStage } from '@prisma/client'

const TONE_VARIANT: Record<StageTone, 'neutral' | 'info' | 'warning' | 'success' | 'danger'> = {
  neutral: 'neutral',
  info: 'info',
  warning: 'warning',
  success: 'success',
  danger: 'danger',
}

// Tags stay on the row (they're a first-class filter in Scout and the team
// scans for them) but only the first few — some candidates carry 15+, which
// would triple the row height.
const MAX_VISIBLE_TAGS = 3

export type CandidateRow = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  location: string | null
  rating: number | null
  inTalentPool: boolean
  createdAt: string
  displayTitle: string | null
  currentCompany: string | null
  stage: PipelineStage | null
  recruiter: string | null
  tags: string[]
}

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

function SortHeader({
  column,
  label,
  className,
}: {
  column: CandidateSort
  label: string
  className?: string
}) {
  const { searchParams, setSingle } = useFilterParams()
  const current = (searchParams.get('sort') ?? 'added') as CandidateSort
  const active = current === column
  const Icon = active ? (column === 'name' ? ArrowUp : ArrowDown) : ChevronsUpDown

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => setSingle('sort', column === 'added' ? undefined : column)}
        aria-label={`Sort by ${label}`}
        className={`inline-flex items-center gap-1 uppercase transition-colors hover:text-foreground ${
          active ? 'text-foreground' : ''
        }`}
      >
        {label}
        <Icon className={`size-3 ${active ? '' : 'opacity-40'}`} />
      </button>
    </TableHead>
  )
}

export function CandidatesTable({
  candidates,
  jobs,
}: {
  candidates: CandidateRow[]
  jobs: { id: string; internalName: string }[]
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <SortHeader column="name" label="Name" />
          <TableHead>Title / Current Company</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Recruiter</TableHead>
          <SortHeader column="rating" label="Rating" />
          <SortHeader column="added" label="Added" />
          <TableHead className="w-10" aria-label="Actions" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {candidates.map((c) => {
          const name = `${c.firstName} ${c.lastName}`
          const extraTags = c.tags.length - MAX_VISIBLE_TAGS
          return (
            <TableRow key={c.id}>
              <TableCell className="max-w-[22rem] whitespace-normal">
                <div className="flex items-start gap-2.5">
                  <span
                    aria-hidden
                    className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground"
                  >
                    {initials(c.firstName, c.lastName)}
                  </span>
                  <span className="min-w-0">
                    <Link
                      href={`/candidates/${c.id}`}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {name}
                    </Link>
                    {c.location && (
                      <span className="block text-xs text-muted-foreground">{c.location}</span>
                    )}
                    {c.tags.length > 0 && (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {c.tags.slice(0, MAX_VISIBLE_TAGS).map((t) => (
                          <Badge key={t} variant="outline" className="text-[10px] font-normal">
                            {t}
                          </Badge>
                        ))}
                        {extraTags > 0 && (
                          <span className="text-[10px] text-muted-foreground">+{extraTags}</span>
                        )}
                      </span>
                    )}
                  </span>
                </div>
              </TableCell>
              <TableCell className="max-w-[16rem] truncate text-muted-foreground">
                {c.displayTitle ?? c.email ?? '—'}
                {c.currentCompany && (
                  <span className="block text-xs">{c.currentCompany}</span>
                )}
              </TableCell>
              <TableCell>
                {c.stage ? (
                  <Badge variant={TONE_VARIANT[stageTone(c.stage)]}>{STAGE_LABELS[c.stage]}</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{c.recruiter ?? '—'}</TableCell>
              <TableCell>
                <StarRating value={c.rating} size="sm" />
              </TableCell>
              <TableCell className="text-muted-foreground">{c.createdAt}</TableCell>
              <TableCell className="text-right">
                <CandidateRowActions
                  candidateId={c.id}
                  candidateName={name}
                  inTalentPool={c.inTalentPool}
                  jobs={jobs}
                />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
