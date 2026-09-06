'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { getReportDrillDown } from '@/lib/actions/reports'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { METRIC_LABELS } from '@/lib/reporting/report-catalog'
import type { ReportDefinition } from '@/lib/reporting/report-schema'
import type { DrillDownRow } from '@/lib/reporting/reporting-service'

export function DrillDownDialog({
  open,
  onOpenChange,
  definition,
  groupLabel,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  definition: ReportDefinition | null
  groupLabel: string
}) {
  const [rows, setRows] = useState<DrillDownRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, startTransition] = useTransition()

  useEffect(() => {
    if (!open || !definition) return
    startTransition(async () => {
      setError(null)
      setRows(null)
      const res = await getReportDrillDown(definition, groupLabel)
      if ('error' in res) setError(res.error)
      else setRows(res.rows)
    })
  }, [open, definition, groupLabel])

  const title = definition
    ? groupLabel === 'Total'
      ? METRIC_LABELS[definition.metric]
      : `${METRIC_LABELS[definition.metric]} — ${groupLabel}`
    : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {rows && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">No matching records.</p>
        )}
        {rows && rows.length > 0 && (
          <ul className="space-y-1.5">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  href={r.href}
                  className="flex items-center justify-between gap-3 rounded-md border p-2.5 text-sm transition-colors hover:border-primary/50"
                >
                  <span className="font-medium">{r.label}</span>
                  <span className="shrink-0 text-muted-foreground">{r.sublabel}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
