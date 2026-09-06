'use client'

import Link from 'next/link'
import { useActionState, useState, useTransition } from 'react'
import { Copy } from 'lucide-react'
import {
  saveEditedEmailTemplate,
  duplicateEmailTemplate,
  setEmailTemplateActive,
} from '@/lib/actions/email-templates'
import { extractPromptVariables } from '@/lib/prompt-variables'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { VersionHistoryDialog } from '@/components/email-templates/version-history-dialog'
import type { EmailTemplate, EmailTemplateVersion, User } from '@prisma/client'

type EmailTemplateFormState = {
  errors?: Record<string, string[] | undefined>
} | undefined

type VersionWithAuthor = EmailTemplateVersion & { createdBy: User }

export function EmailTemplateEditor({
  template,
  availableVariables,
}: {
  template: EmailTemplate & {
    currentVersion: EmailTemplateVersion | null
    versions: VersionWithAuthor[]
  }
  availableVariables: { key: string; label: string }[]
}) {
  const saveAction = saveEditedEmailTemplate.bind(null, template.id)
  const [state, formAction, pending] = useActionState<EmailTemplateFormState, FormData>(
    saveAction,
    undefined
  )

  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description ?? '')
  const [subject, setSubject] = useState(template.currentVersion?.subject ?? '')
  const [bodyHtml, setBodyHtml] = useState(template.currentVersion?.bodyHtml ?? '')
  const [isActive, setIsActive] = useState(template.isActive)
  const [activating, startActivating] = useTransition()
  const [duplicating, startDuplicating] = useTransition()

  const variablesUsed = extractPromptVariables(`${subject} ${bodyHtml}`)

  function handleToggleActive(next: boolean) {
    setIsActive(next)
    startActivating(() => setEmailTemplateActive(template.id, next))
  }

  function handleDuplicate() {
    startDuplicating(() => duplicateEmailTemplate(template.id))
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <form action={formAction} className="space-y-5 lg:col-span-2">
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
          <div className="flex items-center justify-between">
            <Label>Email Body</Label>
            <span className="text-xs text-muted-foreground">
              Current version: {template.currentVersion?.version ?? '—'}
            </span>
          </div>
          <RichTextEditor value={bodyHtml} onChange={setBodyHtml} />
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

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save New Version'}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/email-templates">Cancel</Link>
          </Button>
        </div>
      </form>

      <div className="space-y-6">
        <div className="space-y-3 rounded-lg border bg-background p-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="template-active">Status</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {isActive ? 'Active' : 'Inactive'}
              </span>
              <Switch
                id="template-active"
                checked={isActive}
                disabled={activating}
                onCheckedChange={handleToggleActive}
              />
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleDuplicate}
            disabled={duplicating}
          >
            <Copy />
            {duplicating ? 'Duplicating…' : 'Duplicate Template'}
          </Button>
        </div>

        <VersionHistoryDialog
          templateId={template.id}
          versions={template.versions}
          currentVersionId={template.currentVersionId}
        />
      </div>
    </div>
  )
}
