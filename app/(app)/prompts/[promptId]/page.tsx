import { notFound } from 'next/navigation'
import { BackButton } from '@/components/layout/back-button'
import { getPrompt } from '@/lib/actions/prompts'
import { PromptEditor } from '@/components/prompts/prompt-editor'

export default async function PromptEditorPage({
  params,
}: {
  params: Promise<{ promptId: string }>
}) {
  const { promptId } = await params
  const prompt = await getPrompt(promptId)

  if (!prompt) notFound()

  return (
    <div className="space-y-6">
      <BackButton />

      <div>
        <h1 className="text-2xl font-semibold">{prompt.name}</h1>
        <p className="text-sm text-muted-foreground">
          Editing a prompt saves a new version — previous versions are never overwritten.
        </p>
      </div>

      <PromptEditor prompt={prompt} />
    </div>
  )
}
