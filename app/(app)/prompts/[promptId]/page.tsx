import { notFound } from 'next/navigation'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { getPrompt } from '@/lib/actions/prompts'
import { PromptEditor } from '@/components/prompts/prompt-editor'

import { promptTitle, pageTitle } from '@/lib/page-metadata'

export async function generateMetadata({ params }: { params: Promise<{ promptId: string }> }) {
  const { promptId } = await params
  return { title: pageTitle(await promptTitle(promptId), 'Prompt Library') }
}

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
      <Breadcrumb
        items={[{ label: 'Prompt Library', href: '/prompts' }, { label: prompt.name }]}
      />

      <div>
        <h1 className="page-title">{prompt.name}</h1>
        <p className="text-sm text-muted-foreground">
          Editing a prompt saves a new version — previous versions are never overwritten.
        </p>
      </div>

      <PromptEditor prompt={prompt} />
    </div>
  )
}
