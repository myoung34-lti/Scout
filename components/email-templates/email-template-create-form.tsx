'use client'

import { useActionState, useState } from 'react'
import { createEmailTemplate } from '@/lib/actions/email-templates'
import { extractPromptVariables } from '@/lib/prompt-variables'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { RichTextEditor } from '@/components/ui/rich-text-editor'

type EmailTemplateFormState = {
  errors?: Record<string, string[] | undefined>
} | undefined

export function EmailTemplateCreateForm({
  availableVariables,
}: {
  availableVariables: { key: string; label: string }[]
}) {
  const [state, formAction, pending] = useActionState<EmailTemplateFormState, FormData>(
    createEmailTemplate,
    undefined
  )

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')

  const variablesUsed = extractPromptVariables(`${subject} ${bodyHtml}`)

  return (
    <form action={formAction} className="space-y-5">
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
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Email Subject</Label>
        <Input
          id="subject"
          name="subject"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Next steps for {{jobTitle}}"
        />
        {state?.errors?.subject && (
          <p className="text-sm text-destructive">{state.errors.subject[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Email Body</Label>
        <RichTextEditor
          value={bodyHtml}
          onChange={setBodyHtml}
          placeholder="Write the email body…"
        />
        <input type="hidden" name="bodyHtml" value={bodyHtml} />
        {state?.errors?.bodyHtml && (
          <p className="text-sm text-destructive">{state.errors.bodyHtml[0]}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Available Variables</p>
        <div className="flex flex-wrap gap-1.5">
          {availableVariables.map((v) => (
            <Badge key={v.key} variant="outline" className="font-mono" title={v.label}>
              {`{{${v.key}}}`}
            </Badge>
          ))}
        </div>
      </div>

      {variablesUsed.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Variables Used</p>
          <div className="flex flex-wrap gap-1.5">
            {variablesUsed.map((v) => (
              <Badge key={v} variant="secondary" className="font-mono">
                {v}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? 'Creating…' : 'Create Template'}
      </Button>
    </form>
  )
}
