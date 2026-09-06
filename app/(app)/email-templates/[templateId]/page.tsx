import { notFound } from 'next/navigation'
import { BackButton } from '@/components/layout/back-button'
import { getEmailTemplate } from '@/lib/actions/email-templates'
import { EmailTemplateEditor } from '@/components/email-templates/email-template-editor'
import { EMAIL_TEMPLATE_DYNAMIC_VARIABLES, listEmailVariables } from '@/lib/email-variables'

export default async function EmailTemplateEditorPage({
  params,
}: {
  params: Promise<{ templateId: string }>
}) {
  const { templateId } = await params
  const [template, staticVariables] = await Promise.all([
    getEmailTemplate(templateId),
    listEmailVariables(),
  ])

  if (!template) notFound()

  const availableVariables = [
    ...EMAIL_TEMPLATE_DYNAMIC_VARIABLES,
    ...staticVariables.map((v) => ({ key: v.key, label: v.label })),
  ]

  return (
    <div className="space-y-6">
      <BackButton />

      <div>
        <h1 className="text-2xl font-semibold">{template.name}</h1>
        <p className="text-sm text-muted-foreground">
          Editing a template saves a new version — previous versions are never overwritten.
        </p>
      </div>

      <EmailTemplateEditor template={template} availableVariables={availableVariables} />
    </div>
  )
}
