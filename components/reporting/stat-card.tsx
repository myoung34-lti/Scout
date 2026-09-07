'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import type { HeadlineStat } from '@/lib/reporting/reporting-service'
import type { ReportDefinition } from '@/lib/reporting/report-schema'
import { DrillDownDialog } from '@/components/reporting/drill-down-dialog'

type Body = { label: string; value: number; caption: string; trend: React.ReactNode }

function CardBody({ label, value, caption, trend }: Body) {
  return (
    <>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      {trend}
      <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
    </>
  )
}

const SURFACE =
  'w-full rounded-xl border border-border bg-card p-5 text-left shadow-xs transition-colors hover:border-primary/50'

// Only offer a drill-down where the resulting list provably matches the
// number — a card whose count and list disagree is worse than one that
// doesn't open at all.
export function StatCard({
  label,
  stat,
  definition,
  href,
  caption,
}: {
  label: string
  stat: HeadlineStat | { current: number; previous?: undefined }
  definition?: ReportDefinition
  href?: string
  caption?: string
}) {
  const [open, setOpen] = useState(false)
  const { current, previous } = stat

  // A snapshot ("in process right now") has no previous period to compare
  // against, so it shows no trend rather than a meaningless 0%.
  const trend =
    previous === undefined ? null : (
      (() => {
        const delta = current - previous
        const pct =
          previous === 0 ? (current === 0 ? 0 : 100) : Math.round((delta / previous) * 100)
        const t =
          delta > 0
            ? { Icon: ArrowUp, className: 'text-success' }
            : delta < 0
              ? { Icon: ArrowDown, className: 'text-danger' }
              : { Icon: Minus, className: 'text-muted-foreground' }
        return (
          <div className="mt-2 flex items-center gap-1.5 text-sm">
            <t.Icon className={`size-4 ${t.className}`} />
            <span className={`font-medium tabular-nums ${t.className}`}>
              {delta === 0 ? '0%' : `${pct > 0 ? '+' : ''}${pct}%`}
            </span>
            <span className="text-muted-foreground">vs previous 30 days</span>
          </div>
        )
      })()
    )

  const body = (
    <CardBody
      label={label}
      value={current}
      caption={caption ?? 'Last 30 days'}
      trend={trend}
    />
  )

  if (href) {
    return (
      <Link href={href} className={`block ${SURFACE}`}>
        {body}
      </Link>
    )
  }

  if (!definition) {
    return <div className={SURFACE.replace(' hover:border-primary/50', '')}>{body}</div>
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={SURFACE}>
        {body}
      </button>
      <DrillDownDialog open={open} onOpenChange={setOpen} definition={definition} groupLabel="Total" />
    </>
  )
}
