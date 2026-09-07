import Link from 'next/link'
import { Plus } from 'lucide-react'
import { searchEmailTemplates } from '@/lib/actions/email-templates'
import { EmailTemplateList } from '@/components/email-templates/email-template-list'
import { EmailTemplateSearchFilters } from '@/components/email-templates/email-template-search-filters'
import { Button } from '@/components/ui/button'

export default async function EmailTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const { q, status } = await searchParams

  const statusFilter = status === 'active' || status === 'inactive' ? status : undefined

  const templates = await searchEmailTemplates({ query: q, status: statusFilter })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Email Templates</h1>
          <p className="text-sm text-muted-foreground">
            Reusable candidate email templates, selectable from Compose Email.
          </p>
        </div>
        <Button asChild>
          <Link href="/email-templates/new">
            <Plus />
            New Template
          </Link>
        </Button>
      </div>

      <EmailTemplateSearchFilters />

      <EmailTemplateList templates={templates} />
    </div>
  )
}
