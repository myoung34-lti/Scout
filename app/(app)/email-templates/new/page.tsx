import { BackButton } from '@/components/layout/back-button'
import { EmailTemplateCreateForm } from '@/components/email-templates/email-template-create-form'
import { EMAIL_TEMPLATE_DYNAMIC_VARIABLES, listEmailVariables } from '@/lib/email-variables'

export default async function NewEmailTemplatePage() {
  const staticVariables = await listEmailVariables()
  const availableVariables = [
    ...EMAIL_TEMPLATE_DYNAMIC_VARIABLES,
    ...staticVariables.map((v) => ({ key: v.key, label: v.label })),
  ]

  return (
    <div className="max-w-3xl space-y-6">
      <BackButton />

      <div>
        <h1 className="page-title">New Email Template</h1>
        <p className="text-sm text-muted-foreground">
          Create a reusable, versioned candidate email template.
        </p>
      </div>

      <EmailTemplateCreateForm availableVariables={availableVariables} />
    </div>
  )
}
