import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { EmailTemplate, EmailTemplateVersion } from '@prisma/client'

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

type EmailTemplateWithVersion = EmailTemplate & { currentVersion: EmailTemplateVersion | null }

export function EmailTemplateList({ templates }: { templates: EmailTemplateWithVersion[] }) {
  if (templates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No email templates match these filters.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {templates.map((template) => (
        <Link
          key={template.id}
          href={`/email-templates/${template.id}`}
          className="block rounded-xl border border-border bg-card shadow-xs p-5 transition-colors hover:border-primary/50"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">{template.name}</h2>
              {template.currentVersion && (
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {template.currentVersion.subject}
                </p>
              )}
            </div>
            <Badge variant={template.isActive ? 'default' : 'secondary'} className="shrink-0">
              {template.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          {template.description && (
            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
              {template.description}
            </p>
          )}

          <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
            <span>Version {template.currentVersion?.version ?? '—'}</span>
            <span>Updated {dateFormatter.format(template.updatedAt)}</span>
          </div>
        </Link>
      ))}
    </div>
  )
}
