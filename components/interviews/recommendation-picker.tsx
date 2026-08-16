'use client'

import { ALL_RECOMMENDATIONS, RECOMMENDATION_LABELS } from '@/lib/interview'
import type { InterviewRecommendation } from '@prisma/client'

const SELECTED_CLASS: Record<InterviewRecommendation, string> = {
  STRONG_NO: 'border-red-600 bg-red-600 text-white',
  NO: 'border-red-600 bg-red-600 text-white',
  MAYBE: 'border-foreground bg-foreground text-background',
  YES: 'border-emerald-600 bg-emerald-600 text-white',
  STRONG_YES: 'border-emerald-600 bg-emerald-600 text-white',
}

const UNSELECTED_CLASS: Record<InterviewRecommendation, string> = {
  STRONG_NO:
    'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60',
  NO: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60',
  MAYBE: 'border-input bg-background text-foreground hover:bg-muted',
  YES: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60',
  STRONG_YES:
    'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60',
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
        return (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              selected ? SELECTED_CLASS[r] : UNSELECTED_CLASS[r]
            }`}
          >
            {RECOMMENDATION_LABELS[r]}
          </button>
        )
      })}
    </div>
  )
}
