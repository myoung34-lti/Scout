'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Sparkles } from 'lucide-react'
import { generateCandidateInsights } from '@/lib/actions/candidate-insights'
import { Button } from '@/components/ui/button'
import { INSIGHT_FIELDS, formatInsightField } from '@/lib/ai/candidate-insight-fields'
import type { CandidateInsight } from '@prisma/client'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function CandidateInsightsCard({
  candidateId,
  insight,
  latestActivityAt,
}: {
  candidateId: string
  insight: CandidateInsight | null
  // Most recent timestamp across the candidate record, notes, interviews,
  // and resumes — the caller already has all of this loaded via
  // getCandidate(), so no extra query is needed just for this hint.
  latestActivityAt: Date
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleGenerate() {
    setError(null)
    startTransition(async () => {
      const result = await generateCandidateInsights(candidateId)
      if ('error' in result) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  const isStale = insight ? latestActivityAt > insight.updatedAt : false

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Sparkles className="size-4" />
          Candidate Insights
        </h2>
        <Button type="button" size="sm" variant="outline" onClick={handleGenerate} disabled={pending}>
          <RefreshCw className={pending ? 'animate-spin' : ''} />
          {pending ? 'Generating…' : insight ? 'Regenerate Insights' : 'Generate Insights'}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!insight ? (
        <p className="text-sm text-muted-foreground">No insights generated yet.</p>
      ) : (
        <>
          <dl className="grid gap-3 sm:grid-cols-2">
            {INSIGHT_FIELDS.map((field) => (
              <div key={field.key}>
                <dt className="text-xs font-medium text-muted-foreground">{field.label}</dt>
                <dd className="text-sm">{formatInsightField(insight[field.key])}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs text-muted-foreground">
            <span>Last generated: {dateFormatter.format(insight.generatedAt)}</span>
            {isStale && (
              <span className="text-warning">
                Insights may be out of date
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
