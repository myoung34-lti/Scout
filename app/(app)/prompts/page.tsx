import Link from 'next/link'
import { Plus } from 'lucide-react'
import { searchPrompts } from '@/lib/actions/prompts'
import { PromptList } from '@/components/prompts/prompt-list'
import { PromptSearchFilters } from '@/components/prompts/prompt-search-filters'
import { Button } from '@/components/ui/button'
import type { PromptCategory } from '@prisma/client'
import { ALL_PROMPT_CATEGORIES } from '@/lib/prompt-category'

export default async function PromptsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; status?: string }>
}) {
  const { q, category, status } = await searchParams

  const categoryFilter = ALL_PROMPT_CATEGORIES.includes(category as PromptCategory)
    ? (category as PromptCategory)
    : undefined
  const statusFilter = status === 'active' || status === 'inactive' ? status : undefined

  const prompts = await searchPrompts({ query: q, category: categoryFilter, status: statusFilter })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Prompt Library</h1>
          <p className="text-sm text-muted-foreground">
            Manage the instructions used by Scout AI.
          </p>
        </div>
        <Button asChild>
          <Link href="/prompts/new">
            <Plus />
            New Prompt
          </Link>
        </Button>
      </div>

      <PromptSearchFilters />

      <PromptList prompts={prompts} />
    </div>
  )
}
