'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Copy, Trash2, Pencil } from 'lucide-react'
import { deleteSavedReport, duplicateSavedReport, updateSavedReport } from '@/lib/actions/reports'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DATE_RANGE_PRESET_LABELS, TIME_GROUPING_LABELS } from '@/lib/reporting/report-catalog'
import type { ReportDefinition, Visualization } from '@/lib/reporting/report-schema'
import type { SavedReportOption } from '@/components/reporting/report-builder'

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

export type SavedReportRow = SavedReportOption & {
  createdAt: Date
  updatedAt: Date
  createdBy: { name: string }
}

function summarize(definition: unknown, visualization: string): string {
  const def = definition as ReportDefinition
  const parts = [DATE_RANGE_PRESET_LABELS[def.dateRange.preset]]
  if (def.groupBy === 'TIME' && def.timeGrouping) parts.push(TIME_GROUPING_LABELS[def.timeGrouping])
  parts.push(`${visualization.charAt(0)}${visualization.slice(1).toLowerCase()} Chart`)
  return parts.join(' · ')
}

function RenameDialog({
  report,
  open,
  onOpenChange,
}: {
  report: SavedReportRow
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [name, setName] = useState(report.name)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRename() {
    setError(null)
    setPending(true)
    const result = await updateSavedReport(report.id, {
      name,
      description: report.description ?? undefined,
      visualization: report.visualization as Visualization,
      definition: report.definition,
    })
    setPending(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Report</DialogTitle>
        </DialogHeader>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleRename} disabled={pending}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SavedReportsList({
  reports,
  onOpen,
}: {
  reports: SavedReportRow[]
  onOpen: (report: SavedReportRow) => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [renaming, setRenaming] = useState<SavedReportRow | null>(null)

  function handleDuplicate(id: string) {
    startTransition(async () => {
      await duplicateSavedReport(id)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    if (!window.confirm('Delete this saved report?')) return
    startTransition(async () => {
      await deleteSavedReport(id)
      router.refresh()
    })
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-lg border bg-background p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No saved reports yet — build one in the Report Builder and save it to see it here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <div key={report.id} className="rounded-lg border bg-background p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="font-semibold">{report.name}</h3>
              <p className="text-sm text-muted-foreground">
                {summarize(report.definition, report.visualization)}
              </p>
              {report.description && (
                <p className="mt-1 text-sm text-muted-foreground">{report.description}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Created by {report.createdBy.name} · Updated {dateFormatter.format(report.updatedAt)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRenaming(report)}
                aria-label="Rename"
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDuplicate(report.id)}
                disabled={pending}
                aria-label="Duplicate"
              >
                <Copy />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(report.id)}
                disabled={pending}
                aria-label="Delete"
              >
                <Trash2 className="text-destructive" />
              </Button>
            </div>
          </div>
          <Button size="sm" className="mt-3" onClick={() => onOpen(report)}>
            <Play />
            Open Report
          </Button>
        </div>
      ))}
      {renaming && (
        <RenameDialog
          report={renaming}
          open={!!renaming}
          onOpenChange={(open) => !open && setRenaming(null)}
        />
      )}
    </div>
  )
}
