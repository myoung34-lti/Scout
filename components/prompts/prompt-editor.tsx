'use client'

import Link from 'next/link'
import { useActionState, useState, useTransition } from 'react'
import { Copy } from 'lucide-react'
import { saveEditedPrompt, duplicatePrompt, setPromptActive } from '@/lib/actions/prompts'
import { extractPromptVariables } from '@/lib/prompt-variables'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ALL_PROMPT_CATEGORIES, PROMPT_CATEGORY_LABELS } from '@/lib/prompt-category'
import { EditKeyDialog } from '@/components/prompts/edit-key-dialog'
import { VersionHistoryDialog } from '@/components/prompts/version-history-dialog'
import type { Prompt, PromptVersion, User } from '@prisma/client'

type PromptFormState = {
  errors?: Record<string, string[] | undefined>
} | undefined

type VersionWithAuthor = PromptVersion & { createdBy: User }

export function PromptEditor({
  prompt,
}: {
  prompt: Prompt & {
    currentVersion: PromptVersion | null
    versions: VersionWithAuthor[]
  }
}) {
  const saveAction = saveEditedPrompt.bind(null, prompt.id)
  const [state, formAction, pending] = useActionState<PromptFormState, FormData>(
    saveAction,
    undefined
  )

  const [name, setName] = useState(prompt.name)
  const [description, setDescription] = useState(prompt.description ?? '')
  const [category, setCategory] = useState<string>(prompt.category)
  const [content, setContent] = useState(prompt.currentVersion?.content ?? '')
  const [isActive, setIsActive] = useState(prompt.isActive)
  const [activating, startActivating] = useTransition()
  const [duplicating, startDuplicating] = useTransition()

  const variables = extractPromptVariables(content)

  function handleToggleActive(next: boolean) {
    setIsActive(next)
    startActivating(() => setPromptActive(prompt.id, next))
  }

  function handleDuplicate() {
    startDuplicating(() => duplicatePrompt(prompt.id))
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <form action={formAction} className="space-y-5 lg:col-span-2">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {state?.errors?.name && (
              <p className="text-sm text-destructive">{state.errors.name[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select name="category" value={category} onValueChange={setCategory}>
              <SelectTrigger id="category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_PROMPT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {PROMPT_CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="content">Prompt Content</Label>
            <span className="text-xs text-muted-foreground">
              Current version: {prompt.currentVersion?.version ?? '—'}
            </span>
          </div>
          <Textarea
            id="content"
            name="content"
            required
            rows={20}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="field-sizing-fixed resize-none overflow-y-auto font-mono text-sm"
          />
          {state?.errors?.content && (
            <p className="text-sm text-destructive">{state.errors.content[0]}</p>
          )}
        </div>

        {variables.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Variables Used</p>
            <div className="flex flex-wrap gap-1.5">
              {variables.map((v) => (
                <Badge key={v} variant="secondary" className="font-mono">
                  {v}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save New Version'}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/prompts">Cancel</Link>
          </Button>
        </div>
      </form>

      <div className="space-y-6">
        <div className="space-y-3 rounded-lg border bg-background p-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="prompt-active">Status</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {isActive ? 'Active' : 'Inactive'}
              </span>
              <Switch
                id="prompt-active"
                checked={isActive}
                disabled={activating}
                onCheckedChange={handleToggleActive}
              />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Stable Key</p>
            <p className="font-mono text-sm">{prompt.key}</p>
            <EditKeyDialog promptId={prompt.id} currentKey={prompt.key} />
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleDuplicate}
            disabled={duplicating}
          >
            <Copy />
            {duplicating ? 'Duplicating…' : 'Duplicate Prompt'}
          </Button>
        </div>

        <VersionHistoryDialog
          promptId={prompt.id}
          versions={prompt.versions}
          currentVersionId={prompt.currentVersionId}
        />
      </div>
    </div>
  )
}
