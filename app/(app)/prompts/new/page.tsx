import { BackButton } from '@/components/layout/back-button'
import { PromptCreateForm } from '@/components/prompts/prompt-create-form'

export default function NewPromptPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <BackButton />

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
