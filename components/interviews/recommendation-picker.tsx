'use client'

import { ALL_RECOMMENDATIONS, RECOMMENDATION_LABELS } from '@/lib/interview'
import type { InterviewRecommendation } from '@prisma/client'

// Positive and negative recommendations share their tone, so the scale reads
// as three groups. Colours come from the shared status tokens rather than a
// raw palette pair, so both themes follow automatically.
type Tone = 'negative' | 'neutral' | 'positive'

const TONE: Record<InterviewRecommendation, Tone> = {
  STRONG_NO: 'negative',
  NO: 'negative',
  MAYBE: 'neutral',
  YES: 'positive',
  STRONG_YES: 'positive',
}

const SELECTED: Record<Tone, string> = {
  negative: 'border-danger bg-danger text-background',
  neutral: 'border-foreground bg-foreground text-background',
  positive: 'border-success bg-success text-background',
}

const UNSELECTED: Record<Tone, string> = {
  negative: 'border-danger-border bg-danger-soft text-danger hover:brightness-105',
  neutral: 'border-input bg-background text-foreground hover:bg-muted',
  positive: 'border-success-border bg-success-soft text-success hover:brightness-105',
}

export function RecommendationPicker({
  value,
  onChange,
}: {
  value: InterviewRecommendation | null
  onChange: (value: InterviewRecommendation) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {ALL_RECOMMENDATIONS.map((r) => {
        const selected = value === r
        const tone = TONE[r]
        return (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            aria-pressed={selected}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              selected ? SELECTED[tone] : UNSELECTED[tone]
            }`}
          >
            {RECOMMENDATION_LABELS[r]}
          </button>
        )
      })}
    </div>
  )
}
