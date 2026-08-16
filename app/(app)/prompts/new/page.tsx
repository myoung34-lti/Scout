import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PromptCreateForm } from '@/components/prompts/prompt-create-form'

export default function NewPromptPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/prompts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Prompt Library
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">New Prompt</h1>
        <p className="text-sm text-muted-foreground">
          Create a reusable, versioned instruction for Scout AI.
        </p>
      </div>

      <PromptCreateForm />
    </div>
  )
}
