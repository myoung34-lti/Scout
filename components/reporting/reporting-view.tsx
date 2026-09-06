'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ReportBuilder, type Lookups } from '@/components/reporting/report-builder'
import { SavedReportsList, type SavedReportRow } from '@/components/reporting/saved-reports-list'

export function ReportingView({
  lookups,
  savedReports,
}: {
  lookups: Lookups
  savedReports: SavedReportRow[]
}) {
  const [view, setView] = useState<'builder' | 'saved'>('builder')
  const [loadedReport, setLoadedReport] = useState<SavedReportRow | null>(null)
  // Bumped on every "Open" so ReportBuilder remounts and re-seeds its
  // internal state from the newly loaded report, rather than trying to
  // reconcile a fresh definition into already-initialized state.
  const [builderKey, setBuilderKey] = useState(0)

  function handleOpen(report: SavedReportRow) {
    setLoadedReport(report)
    setView('builder')
    setBuilderKey((k) => k + 1)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={view === 'builder' ? 'default' : 'outline'}
          onClick={() => setView('builder')}
        >
          Report Builder
        </Button>
        <Button
          type="button"
          variant={view === 'saved' ? 'default' : 'outline'}
          onClick={() => setView('saved')}
        >
          Saved Reports
        </Button>
      </div>

      {view === 'builder' ? (
        <ReportBuilder key={builderKey} lookups={lookups} initialReport={loadedReport} />
      ) : (
        <SavedReportsList reports={savedReports} onOpen={handleOpen} />
      )}
    </div>
  )
}
