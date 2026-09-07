import { Breadcrumb } from '@/components/ui/breadcrumb'
import { PromptCreateForm } from '@/components/prompts/prompt-create-form'

export const metadata = { title: 'New Prompt' }

export default function NewPromptPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <Breadcrumb
        items={[{ label: 'Prompt Library', href: '/prompts' }, { label: 'New Prompt' }]}
      />

      <div>
        <h1 className="page-title">New Prompt</h1>
        <p className="text-sm text-muted-foreground">
          Create a reusable, versioned instruction for Scout AI.
        </p>
      </div>

      <PromptCreateForm />
    </div>
  )
}
