'use client'

import { useState } from 'react'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import type { HeadlineStat } from '@/lib/reporting/reporting-service'
import type { ReportDefinition } from '@/lib/reporting/report-schema'
import { DrillDownDialog } from '@/components/reporting/drill-down-dialog'

// Only the small arrow/percentage badge is colored — the number stays the
// visual focus and the card itself is never tinted, per explicit request.
export function StatCard({
  label,
  stat,
  definition,
}: {
  label: string
  stat: HeadlineStat
  definition: ReportDefinition
}) {
  const [open, setOpen] = useState(false)
  const { current, previous } = stat
  const delta = current - previous
  const pct = previous === 0 ? (current === 0 ? 0 : 100) : Math.round((delta / previous) * 100)

  const trend =
    delta > 0
      ? { Icon: ArrowUp, className: 'text-success' }
      : delta < 0
        ? { Icon: ArrowDown, className: 'text-danger' }
        : { Icon: Minus, className: 'text-muted-foreground' }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-border bg-card shadow-xs p-5 text-left transition-colors hover:border-primary/50"
      >
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">{current}</p>
        <div className="mt-2 flex items-center gap-1.5 text-sm">
          <trend.Icon className={`size-4 ${trend.className}`} />
          <span className={`font-medium tabular-nums ${trend.className}`}>
            {delta === 0 ? '0%' : `${pct > 0 ? '+' : ''}${pct}%`}
          </span>
          <span className="text-muted-foreground">vs previous 30 days</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Last 30 days</p>
      </button>

      <DrillDownDialog open={open} onOpenChange={setOpen} definition={definition} groupLabel="Total" />
    </>
  )
}
