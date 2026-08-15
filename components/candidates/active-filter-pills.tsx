'use client'

import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { STAGE_LABELS } from '@/lib/pipeline'
import { useFilterParams } from '@/lib/use-filter-params'
import type { PipelineStage } from '@prisma/client'

export function ActiveFilterPills({
  count,
  jobs,
  tags,
}: {
  count: number
  jobs: { id: string; internalName: string }[]
  tags: { id: string; displayLabel: string }[]
}) {
  const { searchParams, setSingle, removeOne } = useFilterParams()

  const query = searchParams.get('q') ?? ''
  const stages = searchParams.getAll('stage')
  const tagIds = searchParams.getAll('tagIds')
  const jobId = searchParams.get('jobId')
  const jobLocation = searchParams.get('jobLocation')
  const minRating = searchParams.get('minRating')
  const location = searchParams.get('location') ?? ''

  type Pill = { key: string; label: string; onRemove: () => void }
  const pills: Pill[] = []

  if (query) {
    pills.push({
      key: 'q',
      label: `"${query}"`,
      onRemove: () => setSingle('q', undefined),
    })
  }
  stages.forEach((s) =>
    pills.push({
      key: `stage-${s}`,
      label: STAGE_LABELS[s as PipelineStage],
      onRemove: () => removeOne('stage', s),
    })
  )
  if (jobId && jobId !== 'ALL') {
    const job = jobs.find((j) => j.id === jobId)
    pills.push({
      key: 'jobId',
      label: job?.internalName ?? 'Job',
      onRemove: () => setSingle('jobId', undefined),
    })
  }
  if (jobLocation && jobLocation !== 'ALL') {
    pills.push({
      key: 'jobLocation',
      label: jobLocation,
      onRemove: () => setSingle('jobLocation', undefined),
    })
  }
  if (minRating && minRating !== 'ALL') {
    pills.push({
      key: 'minRating',
      label: `${minRating}+ stars`,
      onRemove: () => setSingle('minRating', undefined),
    })
  }
  if (location) {
    pills.push({
      key: 'location',
      label: location,
      onRemove: () => setSingle('location', undefined),
    })
  }
  tagIds.forEach((id) => {
    const tag = tags.find((t) => t.id === id)
    pills.push({
      key: `tag-${id}`,
      label: tag?.displayLabel ?? id,
      onRemove: () => removeOne('tagIds', id),
    })
  })

  return (
    <div className="mb-4 space-y-2">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{count}</span>{' '}
        candidate{count === 1 ? '' : 's'}
      </p>
      {pills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pills.map((p) => (
            <Badge
              key={p.key}
              variant="secondary"
              className="gap-1 rounded-full pr-1 text-sm"
            >
              {p.label}
              <button
                type="button"
                onClick={p.onRemove}
                className="rounded-full hover:bg-muted"
                aria-label={`Remove ${p.label}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
