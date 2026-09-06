'use client'

import { useFilterParams } from '@/lib/use-filter-params'
import {
  CANDIDATE_STATUS_KEYS,
  CANDIDATE_STATUS_LABELS,
} from '@/lib/candidate-search'
import type { CandidateStatusKey } from '@/lib/candidate-search'

export function CandidateStatusTabs({
  counts,
}: {
  counts: Record<CandidateStatusKey, number>
}) {
  const { searchParams, setSingle } = useFilterParams()
  const current = (searchParams.get('status') ?? 'all') as CandidateStatusKey

  return (
    <div
      role="tablist"
      aria-label="Filter candidates by status"
      className="flex w-full items-center gap-1 overflow-x-auto border-b border-border"
    >
      {CANDIDATE_STATUS_KEYS.map((key) => {
        const active = current === key
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setSingle('status', key === 'all' ? undefined : key)}
            className={`-mb-px shrink-0 border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors ${
              active
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {CANDIDATE_STATUS_LABELS[key]}
            <span
              className={`ml-1.5 tabular-nums ${active ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}
            >
              {counts[key]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
