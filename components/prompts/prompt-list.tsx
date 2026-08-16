import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { PROMPT_CATEGORY_LABELS } from '@/lib/prompt-category'
import { INTERVIEW_TYPE_LABELS } from '@/lib/interview'
import type { Prompt, PromptVersion } from '@prisma/client'

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

type PromptWithVersion = Prompt & { currentVersion: PromptVersion | null }

export function PromptList({ prompts }: { prompts: PromptWithVersion[] }) {
  if (prompts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No prompts match these filters.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {prompts.map((prompt) => (
        <Link
          key={prompt.id}
          href={`/prompts/${prompt.id}`}
          className="block rounded-lg border bg-background p-5 transition-colors hover:border-primary/50"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">{prompt.name}</h2>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Badge variant="outline">{PROMPT_CATEGORY_LABELS[prompt.category]}</Badge>
                {prompt.interviewType && (
                  <Badge variant="outline">
                    Fireflies: {INTERVIEW_TYPE_LABELS[prompt.interviewType]}
                  </Badge>
                )}
              </div>
            </div>
            <Badge variant={prompt.isActive ? 'default' : 'secondary'} className="shrink-0">
              {prompt.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          {prompt.description && (
            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
              {prompt.description}
            </p>
          )}

          <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
            <span>
              Version {prompt.currentVersion?.version ?? '—'} ·{' '}
              {prompt.isActive ? 'Active' : 'Inactive'}
            </span>
            <span>Updated {dateFormatter.format(prompt.updatedAt)}</span>
          </div>
        </Link>
      ))}
    </div>
  )
}
