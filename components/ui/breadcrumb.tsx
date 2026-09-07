import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'

export type Crumb = { label: string; href?: string }

// Reflects where a page sits, not how you got there. The browser's own back
// button covers history; this covers hierarchy, so the control means the same
// thing every time — which the old router.back() button did not.
export function Breadcrumb({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn('mb-1', className)}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {items.map((item, i) => {
          const last = i === items.length - 1
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1">
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className="rounded transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={last ? 'font-medium text-foreground' : undefined}
                  aria-current={last ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
              {!last && <ChevronRight className="size-3.5 shrink-0 opacity-50" aria-hidden />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
