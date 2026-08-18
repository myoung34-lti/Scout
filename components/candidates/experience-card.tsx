import { Briefcase, ChevronRight } from 'lucide-react'
import type { WorkHistoryEntry } from '@/lib/actions/resume-parser'

// The resume parser's isCurrent flag isn't always trustworthy — a resume
// scanned well after someone left a role can still say "current" if it
// wasn't updated. An endYear already in the past overrides that.
function statusFor(entry: WorkHistoryEntry, currentYear: number) {
  const isStale = entry.isCurrent && entry.endYear != null && entry.endYear < currentYear
  return { showAsCurrent: entry.isCurrent && !isStale, isStale }
}

export function ExperienceCard({
  workHistory,
  yearsExperience,
  resumeHref,
}: {
  workHistory: WorkHistoryEntry[] | null
  yearsExperience: number | null
  resumeHref: string | null
}) {
  const currentYear = new Date().getFullYear()

  return (
    <div className="rounded-lg border bg-background p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Briefcase className="size-4" />
        Experience
        {yearsExperience != null && (
          <span className="font-normal">· {yearsExperience} years</span>
        )}
      </h2>

      {!workHistory || workHistory.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No experience on file yet — scan a resume from Edit Candidate to fill this in.
        </p>
      ) : (
        <ul className="mb-3 divide-y">
          {workHistory.map((entry, i) => {
            const { showAsCurrent, isStale } = statusFor(entry, currentYear)
            return (
              <li key={i} className="py-2 first:pt-0 last:pb-0">
                <p className="text-sm font-semibold">{entry.title}</p>
                <p className="text-sm text-muted-foreground">
                  {entry.company}
                  {' · '}
                  {showAsCurrent ? (
                    <span className="text-emerald-600 dark:text-emerald-400">Current</span>
                  ) : isStale ? (
                    <>Previous · {entry.startYear ?? '—'} – {entry.endYear}</>
                  ) : (
                    `${entry.startYear ?? '—'} – ${entry.endYear ?? '—'}`
                  )}
                </p>
              </li>
            )
          })}
        </ul>
      )}

      {resumeHref && workHistory && workHistory.length > 0 && (
        <a
          href={resumeHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View full experience
          <ChevronRight className="size-3.5" />
        </a>
      )}
    </div>
  )
}
