import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
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
      <Link
        href="/prompts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Prompt Library
      </Link>

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
