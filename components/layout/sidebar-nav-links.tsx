'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Briefcase, Users, Kanban, Bookmark, ScrollText, ShieldCheck } from 'lucide-react'

const LINKS = [
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/candidates', label: 'Candidates', icon: Users },
  { href: '/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/talent-pool', label: 'Talent Pool', icon: Bookmark },
  { href: '/prompts', label: 'Prompt Library', icon: ScrollText },
  { href: '/admin', label: 'Admin', icon: ShieldCheck },
]

export function SidebarNavLinks() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              active
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
            }`}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
