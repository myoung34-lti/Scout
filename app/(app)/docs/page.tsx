import Link from 'next/link'
import { BookOpen, Bug, Lightbulb, ArrowUpRight, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const DOCS = [
  {
    href: '/docs/user-guide',
    label: 'User Guide',
    description: "How the recruiting team uses Scout, day to day.",
    icon: BookOpen,
    external: false,
  },
  {
    href: 'https://docs.google.com/document/d/1Qg340MRXX2kObTyWshe7uX0UmbrNr99XaS_BUSjbZvY/edit?tab=t.0',
    label: 'Report a Bug',
    description: 'Found something broken? Log it here.',
    icon: Bug,
    external: true,
  },
  {
    href: 'https://docs.google.com/document/d/1VmRmv80DRPO9I1CwqzlU-yoENGT3mBV3HDP_XUwKjC0/edit?tab=t.0',
    label: 'Future Build Items',
    description: 'Ideas and requests for what Scout should do next.',
    icon: Lightbulb,
    external: true,
  },
]

export default function DocsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">User Docs</h1>
        <p className="text-sm text-muted-foreground">
          Guides and feedback links for Scout.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {DOCS.map(({ href, label, description, icon: Icon, external }) => (
          <Link
            key={href}
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
          >
            <Card className="transition-colors hover:bg-accent/50">
              <CardContent className="flex items-center gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="size-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{label}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                {external ? (
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
