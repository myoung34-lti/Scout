'use client'

import { useActionState, useState } from 'react'
import { createPrompt } from '@/lib/actions/prompts'
import { extractPromptVariables } from '@/lib/prompt-variables'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ALL_PROMPT_CATEGORIES, PROMPT_CATEGORY_LABELS } from '@/lib/prompt-category'

type PromptFormState = {
  errors?: Record<string, string[] | undefined>
} | undefined

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function PromptCreateForm() {
  const [state, formAction, pending] = useActionState<PromptFormState, FormData>(
    createPrompt,
    undefined
  )

  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [keyTouched, setKeyTouched] = useState(false)
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string | undefined>(undefined)
  const [content, setContent] = useState('')

  const variables = extractPromptVariables(content)

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (!keyTouched) setKey(slugify(e.target.value))
          }}
        />
        {state?.errors?.name && (
          <p className="text-sm text-destructive">{state.errors.name[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="key">Stable Key</Label>
        <Input
          id="key"
          name="key"
          required
          value={key}
          onChange={(e) => {
            setKeyTouched(true)
            setKey(e.target.value)
          }}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Code refers to this prompt by key, not by name — pick it deliberately.
        </p>
        {state?.errors?.key && (
          <p className="text-sm text-destructive">{state.errors.key[0]}</p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select name="category" value={category} onValueChange={setCategory}>
            <SelectTrigger id="category" className="w-full">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {ALL_PROMPT_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {PROMPT_CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state?.errors?.category && (
            <p className="text-sm text-destructive">{state.errors.category[0]}</p>
          )}
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Prompt Content</Label>
        <Textarea
          id="content"
          name="content"
          required
          rows={16}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="field-sizing-fixed resize-none overflow-y-auto font-mono text-sm"
          placeholder={'Write the instructions Scout AI will use…\n\nUse {{variable_name}} for placeholders that will be filled in later.'}
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

      <Button type="submit" disabled={pending}>
        {pending ? 'Creating…' : 'Create Prompt'}
      </Button>
    </form>
  )
}
